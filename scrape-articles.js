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
    ],
  });

  try {
    // 1. Load existing articles
    let existingArticles = [];
    if (fs.existsSync('data/articles.json')) {
      const data = JSON.parse(fs.readFileSync('data/articles.json', 'utf8'));
      existingArticles = data.articles || [];
    }
    
    // Create a Map of existing articles for easy updating
    const existingArticlesMap = new Map(
      existingArticles.map(article => [article.url, article])
    );

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120000);

    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (error) => console.log('PAGE ERROR:', error.message));

    let currentPage = 1;
    let hasNextPage = true;
    const newArticles = [];
    let updatedExistingArticles = false;

    while (hasNextPage) {
      console.log(`Scraping page ${currentPage}...`);
      const url = `https://www.newscientist.com/author/alex-wilkins/${currentPage}`;
      console.log(`Navigating to: ${url}`);

      const response = await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 120000,
      });

      if (response.status() === 404) {
        console.log('Reached 404 page, ending pagination');
        break;
      }

      await page.waitForSelector('.CardLink, .no-results', {
        timeout: 120000,
      });

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

      if (currentArticles.length === 0) {
        console.log('No articles found on this page, ending pagination');
        break;
      }

      let foundAllOldArticlesWithImages = true;
      
      for (const article of currentArticles) {
        const existingArticle = existingArticlesMap.get(article.url);
        
        if (existingArticle) {
          // If article exists but has no image or empty image URL, update it
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

      // Only stop if we've found old articles that all have images
      if (foundAllOldArticlesWithImages) {
        console.log('All existing articles have images, stopping pagination.');
        break;
      }

      currentPage++;
    }

    console.log(`New articles found this run: ${newArticles.length}`);
    console.log(`Updated images for existing articles: ${updatedExistingArticles}`);

    // Merge new articles and update existing ones
    if (newArticles.length > 0 || updatedExistingArticles) {
      // Convert Map back to array and sort by scrapedAt
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