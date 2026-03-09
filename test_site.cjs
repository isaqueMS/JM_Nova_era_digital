const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => {
        console.log('PAGE LOG:', msg.text());
    });

    page.on('response', async res => {
        if (res.url().includes('api.mikweb.com.br')) {
            console.log('MIKWEB RESPONSE STATUS:', res.status());
            try {
                const text = await res.text();
                console.log('MIKWEB RESPONSE BODY:', text);
            } catch (e) {
                console.log('Could not read body');
            }
        }
    });

    console.log('Navigating to live URL...');
    await page.goto('https://isaquems.github.io/JM_Nova_era_digital/', { waitUntil: 'networkidle2' });

    console.log('Typing CPF...');
    await page.type('input[placeholder="000.000.000-00"]', '00000000000');

    console.log('Clicking the button...');
    // Find a button or a touchable opacity element that contains 'CONECTAR AGORA'
    await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('div'));
        const btn = elements.find(el => el.textContent === 'CONECTAR AGORA');
        if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 5000));

    await browser.close();
})();
