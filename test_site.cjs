const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
    page.on('requestfailed', request => {
        console.error(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText || ''}`);
    });

    console.log('Navigating to live URL...');
    await page.goto('https://isaquems.github.io/JM_Nova_era_digital/', { waitUntil: 'networkidle2' });

    await browser.close();
})();
