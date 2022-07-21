"use strict";
const puppeteer = require('puppeteer');
console.log('Launching pupeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://news.ycombinator.com', {
        waitUntil: 'networkidle2',
    });
    await page.pdf({ path: 'hn.pdf', format: 'a4' });
    await browser.close();
})();
//# sourceMappingURL=app.js.map