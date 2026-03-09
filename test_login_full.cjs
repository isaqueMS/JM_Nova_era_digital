
const token = 'EXPO_PUBLIC_MIKWEB_TOKEN_PLACEHOLDER';
const base = 'https://api.mikweb.com.br/v1/admin';
const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };
const fs = require('fs');

async function debugLoginDetails() {
    const loginId = 56899;
    try {
        const r = await fetch(`${base}/logins/${loginId}`, { headers });
        const res = await r.json();
        fs.writeFileSync('login_full_debug.json', JSON.stringify(res, null, 2));
        console.log("Done. Saved to login_full_debug.json");
    } catch (e) {
        console.log("Error:", e);
    }
}

debugLoginDetails();
