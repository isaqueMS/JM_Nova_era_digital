
const https = require('https');

async function checkLoginHtml() {
    const html = await new Promise((resolve, reject) => {
        https.get('https://mikweb.com.br/login', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });

    const csrfMatch = html.match(/<input type="hidden" name="_token" value="([^"]+)">/);
    if (csrfMatch) {
        console.log("CSRF Token found:", csrfMatch[1]);
    } else {
        console.log("No CSRF token input found. Looking for meta tag...");
        const metaMatch = html.match(/<meta name="csrf-token" content="([^"]+)">/);
        console.log("Meta CSRF:", metaMatch ? metaMatch[1] : 'Not found');
    }
}
checkLoginHtml();
