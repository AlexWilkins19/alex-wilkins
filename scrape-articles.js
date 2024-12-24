const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('Starting browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--window-size=1920,1080',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ],
  });

  try {
    // 1. Load existing articles
    let existingArticles = [];
    if (fs.existsSync('data/articles.json')) {
      const data = JSON.parse(fs.readFileSync('data/articles.json', 'utf8'));
      existingArticles = data.articles || [];
    }
    
    const existingArticlesMap = new Map(
      existingArticles.map(article => [article.url, article])
    );

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Modified headers to remove problematic one
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'DNT': '1',
      'Connection': 'keep-alive'
    });

    // Only log errors that aren't related to CORS or resource loading
    page.on('console', (msg) => {
      const text = msg.text();
      if (!text.includes('CORS') && 
          !text.includes('Failed to load resource') && 
          !text.includes('Access to font')) {
        console.log('PAGE LOG:', text);
      }
    });

    page.on('pageerror', (error) => {
      if (!error.message.includes('CORS') && 
          !error.message.includes('Failed to load resource')) {
        console.log('PAGE ERROR:', error.message);
      }
    });

    // Rest of your existing code remains the same
    let currentPage = 1;
    let hasNextPage = true;
    const newArticles = [];
    let updatedExistingArticles = false;

    while (hasNextPage) {
      console.log(`Scraping page ${currentPage}...`);
      const url = `https://www.newscientist.com/author/alex-wilkins/${currentPage}`;
      console.log(`Navigating to: ${url}`);

      try {
        const response = await page.goto(url, {
          waitUntil: 'networkidle2', // Changed from networkidle0 for better stability
          timeout: 120000,
        });

        if (response.status() === 404) {
          console.log('Reached 404 page, ending pagination');
          break;
        }

        // Wait a bit after page load
        await page.waitForTimeout(5000);

        await page.waitForSelector('.CardLink, .no-results', {
          timeout: 120000,
        });

        // Rest of your existing article scraping code...
        const currentArticles = await page.evaluate(() => {
          const articleNodes = document.querySelectorAll('.CardLink');
          if (articleNodes.length === 0) return [];

          return Array.from(articleNodes).map((articleNode) => {
            const titleNode = articleNode.querySelector('.Card__Title');
            const imgNode = articleNode.querySelector('img.Image');
            
            let imageUrl = '';
            if (imgNode) {
              const srcset = imgNode.dataset.srcset || imgNode.srcset;
              if (srcset) {
                const srcArray = srcset.split(',').map(src => {
                  const [url, size] = src.trim().split(' ');
                  return {
                    url: url,
                    size: parseInt(size || '0')
                  };
                });
                srcArray.sort((a, b) => (b.size || 0) - (a.size || 0));
                imageUrl = srcArray[0].url;
              } else {
                imageUrl = imgNode.dataset.src || imgNode.src || '';
              }
            }

            return {
              title: titleNode ? titleNode.innerText : '',
              url: 'https://www.newscientist.com' + articleNode.getAttribute('href'),
              imageUrl: imageUrl,
              scrapedAt: new Date().toISOString()
            };
          });
        });

        // Rest of your existing processing code remains the same...
        if (currentArticles.length === 0) {
          console.log('No articles found on this page, ending pagination');
          break;
        }

        let foundAllOldArticlesWithImages = true;
        
        for (const article of currentArticles) {
          const existingArticle = existingArticlesMap.get(article.url);
          
          if (existingArticle) {
            if (!existingArticle.imageUrl || existingArticle.imageUrl.trim() === '') {
              console.log(`Updating image for existing article: ${article.title}`);
              existingArticle.imageUrl = article.imageUrl;
              existingArticle.scrapedAt = article.scrapedAt;
              updatedExistingArticles = true;
              foundAllOldArticlesWithImages = false;
            }
          } else {
            newArticles.push(article);
            foundAllOldArticlesWithImages = false;
          }
        }

        if (foundAllOldArticlesWithImages) {
          console.log('All existing articles have images, stopping pagination.');
          break;
        }

        currentPage++;
        await page.waitForTimeout(2000);

      } catch (error) {
        console.error(`Error on page ${currentPage}:`, error);
        if (error.name === 'TimeoutError') {
          console.log('Timeout reached, trying to continue...');
          currentPage++;
          continue;
        }
        throw error;
      }
    }

    // Final processing and file writing remains the same...
    console.log(`New articles found this run: ${newArticles.length}`);
    console.log(`Updated images for existing articles: ${updatedExistingArticles}`);

    if (newArticles.length > 0 || updatedExistingArticles) {
      existingArticles = Array.from(existingArticlesMap.values());
      existingArticles = [...newArticles, ...existingArticles];
      
      fs.writeFileSync(
        'data/articles.json',
        JSON.stringify({ articles: existingArticles }, null, 2),
        'utf8'
      );
      console.log('Articles database updated');
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
})();