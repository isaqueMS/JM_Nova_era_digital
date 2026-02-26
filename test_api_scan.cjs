
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
    '/radius/accountings',
    '/connections',
    '/connections?customer_id=1993147',
    '/connections?login_id=56899',
    '/sessions',
    '/login_sessions',
    '/customer_sessions',
    '/historic',
    '/logs',
    '/logs?customer_id=1993147',
    '/bandwidths',
    '/usages',
    '/graphs',
    '/stats',
    '/statistics',
    '/pppoe/sessions'
];

async function scan() {
    console.log("Starting MikWeb API scan for history and usage endpoints...");
    for (let path of endpoints) {
        try {
            const res = await fetch(BASE_URL + path, { headers: HEADERS });
            if (res.ok) {
                const json = await res.json();
                console.log(`[OK] 200 - ${path}`);
                console.log(`     Keys:`, typeof json === 'object' && json !== null ? Object.keys(json) : 'Not JSON Object');
                let arr = json.data || json[Object.keys(json)[0]];
                if (Array.isArray(arr)) {
                    console.log(`     Rows: ${arr.length}`);
                    if (arr.length > 0) {
                        console.log(`     Sample:`, JSON.stringify(arr[0]).substring(0, 100));
                    }
                }
            } else if (res.status === 403 || res.status === 401) {
                console.log(`[FORBIDDEN] ${res.status} - ${path}`);
            } else if (res.status !== 404) {
                console.log(`[OTHER] ${res.status} - ${path}`);
            }
        } catch (e) {
            console.log(`[ERROR] ${path} - ${e.message}`);
        }
    }
    console.log("Done.");
}

scan();
