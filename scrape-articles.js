const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  let currentPage = 1;
  let hasNextPage = true;
  let articles = [];

  while (hasNextPage) {
    const response = await page.goto(`https://www.newscientist.com/author/alex-wilkins/${currentPage}`);

    if (response.status() === 404) {
      hasNextPage = false;
      break;
    }

    await page.waitForSelector('.CardLink'); // Wait for the elements to load

    const currentArticles = await page.evaluate(() => {
      const articleNodes = document.querySelectorAll('.CardLink');
      const articles = [];

      articleNodes.forEach((articleNode) => {
        const titleNode = articleNode.querySelector('.Card__Title');
        const imgNode = articleNode.querySelector('.image');

        // Get the largest image URL from the data-srcset attribute
        const srcset = imgNode.dataset.srcset;
        const srcArray = srcset.split(',').map(src => src.trim());
        const largestSrc = srcArray[srcArray.length - 1].split(' ')[0];

        // Get the full link to the article page
        const fullLink = 'https://www.newscientist.com' + articleNode.getAttribute('href');

        articles.push({
          title: titleNode.innerText,
          url: fullLink,
          imageUrl: largestSrc,
        });
      });

      return articles;
    });

    articles = articles.concat(currentArticles);
    console.log('Current Articles:', currentArticles);

    currentPage++;
  }

  // Save articles to a JSON file inside an object with a single property "articles"
  fs.writeFileSync('articles.json', JSON.stringify({ articles }, null, 2), 'utf-8');

  console.log('Articles saved to articles.json');

  await browser.close();
})();
