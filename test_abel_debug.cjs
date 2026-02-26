
const token = '5C8MHVWUYI:QHKR2LADU2BXV9TIMYMWWP9JWUTULLM5';
const base = 'https://api.mikweb.com.br/v1/admin';
const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };
const fs = require('fs');

async function debugAbelLogin() {
    const customerId = 2069653; // Abel
    try {
        const r = await fetch(`${base}/logins?customer_id=${customerId}`, { headers });
        const res = await r.json();
        const logins = res.logins || res.data || [];
        if (logins.length > 0) {
            fs.writeFileSync('abel_login.json', JSON.stringify(logins[0], null, 2));
            console.log("Abel login username:", logins[0].login);
        } else {
            console.log("No login found for customer_id:", customerId);
        }
    } catch (e) {
        console.log("Error:", e);
    }
}

debugAbelLogin();
