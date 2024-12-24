const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('Starting browser...');
  const browser = await puppeteer.launch({
    headless: 'new',  // Use 'new' headless mode in Puppeteer 19+
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
    ],
  });

  try {
    // 1. Load existing articles from articles.json, if it exists
    let existingArticles = [];
    if (fs.existsSync('articles.json')) {
      const data = JSON.parse(fs.readFileSync('articles.json', 'utf8'));
      existingArticles = data.articles || [];
    }
    // Create a Set of existing article URLs for quick lookups
    const existingUrls = new Set(existingArticles.map((a) => a.url));

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(120000); // 2 minutes

    // Optional: log helpful debugging info
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (error) => console.log('PAGE ERROR:', error.message));

    let currentPage = 1;
    let hasNextPage = true;
    const newArticles = [];

    // 2. Start scraping
    while (hasNextPage) {
      console.log(`Scraping page ${currentPage}...`);
      const url = `https://www.newscientist.com/author/alex-wilkins/${currentPage}`;
      console.log(`Navigating to: ${url}`);

      const response = await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 120000,
      });

      // If the page is 404, no more pages to read
      if (response.status() === 404) {
        console.log('Reached 404 page, ending pagination');
        break;
      }

      // Wait for articles or an indication of no results
      await page.waitForSelector('.CardLink, .no-results', {
        timeout: 120000,
      });

      // Grab all articles on the current page
      const currentArticles = await page.evaluate(() => {
        const articleNodes = document.querySelectorAll('.CardLink');
        if (articleNodes.length === 0) return [];

        return Array.from(articleNodes).map((articleNode) => {
          const titleNode = articleNode.querySelector('.Card__Title');
          const imgNode = articleNode.querySelector('.image');

          let largestSrc = '';
          if (imgNode && imgNode.dataset.srcset) {
            const srcset = imgNode.dataset.srcset;
            const srcArray = srcset.split(',').map((src) => src.trim());
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
        break;
      }

      // 3. Check if we've hit old articles, and accumulate the new ones
      let foundOldArticle = false;

      for (const article of currentArticles) {
        if (existingUrls.has(article.url)) {
          // We found an article we already know - assume the rest are old
          foundOldArticle = true;
          break;
        } else {
          newArticles.push(article);
        }
      }

      // If we found an old article, we assume no need to keep paginating
      if (foundOldArticle) {
        console.log('Encountered an old article; stopping pagination.');
        break;
      }

      // Otherwise, increment page counter and continue
      currentPage++;
    }

    console.log(`New articles found this run: ${newArticles.length}`);

    // 4. Merge new articles into existing, placing the new ones at the front (or back, your choice)
    if (newArticles.length > 0) {
      existingArticles = [...newArticles, ...existingArticles];
    }

    // 5. Save everything to articles.json
    fs.writeFileSync(
      'articles.json',
      JSON.stringify({ articles: existingArticles }, null, 2),
      'utf8'
    );
    console.log('All articles saved to articles.json');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
})();
