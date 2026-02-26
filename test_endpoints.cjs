
const token = '5C8MHVWUYI:QHKR2LADU2BXV9TIMYMWWP9JWUTULLM5';
const base = 'https://api.mikweb.com.br/v1/admin';
const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };

const endpointsToTry = [
    '/connections',
    '/sessions',
    '/connects',
    '/logins/56899/connections',
    '/logins/56899/histories',
    '/logins/56899/sessions',
    '/bandwidths',
    '/usages',
    '/logins/56899/bandwidths',
    '/logins/56899/usages'
];

async function guessEndpoints() {
    console.log("--- GUESSING ENDPOINTS ---");
    for (const ep of endpointsToTry) {
        try {
            const r = await fetch(base + ep, { headers });
            if (r.ok) {
                const data = await r.json();
                console.log(`SUCCESS [200 OK]: ${ep} -> keys: ${Object.keys(data).join(', ')}`);
            } else {
                console.log(`FAILED [${r.status}]: ${ep}`);
            }
        } catch (e) {
            console.log(`ERROR: ${ep} -> ${e.message}`);
        }
    }
}

guessEndpoints();
