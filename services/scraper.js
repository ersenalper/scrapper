const puppeteer = require('puppeteer');

const asyncWait = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * This method will read the content of any webpage using Puppeteer.
 * @param url
 * @returns {Promise<String>}
 */
const getPageContent = async (url) => {
    let attempts = 5;
    let lastError = null;
    while (attempts > 0) {
        try {
            const browser = await puppeteer.launch({ headless: "new" });
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'tr-TR,tr;q=0.9',
                'Referer': 'https://sofifa.com/'
            });
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            const content = await page.content();
            await browser.close();
            if (attempts < 5) {
                console.log(`retry successful ... attempt=${attempts}`);
            }
            return content;
        } catch (err) {
            lastError = err;
            console.log(`retrying ... attempt=${attempts}, error=${err.message}`);
            await asyncWait(1000);
            attempts -= 1;
        }
    }
    throw new Error(`Error reading page=${url}, lastError=${lastError && lastError.message}`);
};

module.exports = {
    getPageContent
};