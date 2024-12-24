const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('Starting browser...');
  const browser = await puppeteer.launch({
    headless: 'new',  // Use new headless mode
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Set default navigation timeout
    page.setDefaultNavigationTimeout(120000);  // 2 minutes
    
    // Enable better error logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    let currentPage = 1;
    let hasNextPage = true;
    let articles = [];

    while (hasNextPage) {
      console.log(`Scraping page ${currentPage}...`);
      try {
        const url = `https://www.newscientist.com/author/alex-wilkins/${currentPage}`;
        console.log(`Navigating to: ${url}`);
        
        const response = await page.goto(url, { 
          waitUntil: 'networkidle0',
          timeout: 120000 
        });

        if (response.status() === 404) {
          console.log('Reached 404 page, ending pagination');
          hasNextPage = false;
          break;
        }

        // Wait for either the articles or a "no results" indicator
        await page.waitForSelector('.CardLink, .no-results', { 
          timeout: 120000 
        });

        const currentArticles = await page.evaluate(() => {
          const articleNodes = document.querySelectorAll('.CardLink');
          if (articleNodes.length === 0) return [];

          return Array.from(articleNodes).map(articleNode => {
            const titleNode = articleNode.querySelector('.Card__Title');
            const imgNode = articleNode.querySelector('.image');
            
            // Handle cases where image might not exist
            let largestSrc = '';
            if (imgNode && imgNode.dataset.srcset) {
              const srcset = imgNode.dataset.srcset;
              const srcArray = srcset.split(',').map(src => src.trim());
              largestSrc = srcArray[srcArray.length - 1].split(' ')[0];
            }

            return {
              title: titleNode ? titleNode.innerText : '',
              url: 'https://www.newscientist.com' + articleNode.getAttribute('href'),
              imageUrl: largestSrc,
            };
          });
        });

        if (currentArticles.length === 0) {
          console.log('No articles found on this page, ending pagination');
          hasNextPage = false;
          break;
        }

        articles = articles.concat(currentArticles);
        console.log(`Found ${currentArticles.length} articles on page ${currentPage}`);
        currentPage++;

      } catch (error) {
        console.error(`Error on page ${currentPage}:`, error);
        // If we hit an error, try to continue with the next page
        currentPage++;
        continue;
      }
    }

    console.log(`Total articles found: ${articles.length}`);
    fs.writeFileSync('articles.json', JSON.stringify({ articles }, null, 2), 'utf-8');
    console.log('Articles saved to articles.json');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
})();
