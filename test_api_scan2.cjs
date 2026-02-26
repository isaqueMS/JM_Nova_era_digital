
const fs = require('fs');
const MIKWEB_TOKEN = '5C8MHVWUYI:QHKR2LADU2BXV9TIMYMWWP9JWUTULLM5';
const BASE_URL = 'https://api.mikweb.com.br/v1/admin';
const HEADERS = { 'Authorization': `Bearer ${MIKWEB_TOKEN}`, 'Accept': 'application/json' };

const endpoints = [
    '/radacct',
    '/radacct?customer_id=1993147',
    '/radacct?login_id=56899',
    '/accountings',
    '/accounting',
    '/radius',
    '/connections',
    '/connections?customer_id=1993147',
    '/connections?login_id=56899',
    '/sessions',
    '/logs',
    '/logs?customer_id=1993147',
    '/graphs',
    '/stats',
    '/statistics',
];

async function scan() {
    let out = "Starting MikWeb API scan for history and usage endpoints...\n";
    for (let path of endpoints) {
        try {
            const res = await fetch(BASE_URL + path, { headers: HEADERS });
            if (res.ok) {
                const json = await res.json();
                out += `[OK] 200 - ${path}\n`;
                out += `     Keys: ${typeof json === 'object' && json !== null ? Object.keys(json) : 'Not JSON Object'}\n`;
                let arr = json.data || json[Object.keys(json)[0]];
                if (Array.isArray(arr)) {
                    out += `     Rows: ${arr.length}\n`;
                    if (arr.length > 0) {
                        out += `     Sample: ${JSON.stringify(arr[0]).substring(0, 100)}\n`;
                    }
                }
            } else if (res.status === 403 || res.status === 401) {
                out += `[FORBIDDEN] ${res.status} - ${path}\n`;
            } else if (res.status !== 404) {
                out += `[OTHER] ${res.status} - ${path}\n`;
            }
        } catch (e) {
            out += `[ERROR] ${path} - ${e.message}\n`;
        }
    }
    fs.writeFileSync('scan3.txt', out, 'utf8');
}

scan();
