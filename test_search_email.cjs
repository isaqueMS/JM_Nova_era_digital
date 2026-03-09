
const token = 'EXPO_PUBLIC_MIKWEB_TOKEN_PLACEHOLDER';
const base = 'https://api.mikweb.com.br/v1/admin';
const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };
const fs = require('fs');

async function testSearchByEmail() {
    const email = "albericobezerra@hotmail.com";
    try {
        console.log("Searching by search=" + email);
        const r = await fetch(`${base}/logins?search=${encodeURIComponent(email)}`, { headers });
        const res = await r.json();
        const logins = res.logins || res.data || [];
        console.log("Found", logins.length, "logins");
        if (logins.length > 0) {
            logins.forEach(l => console.log(`ID: ${l.id} Login: ${l.login} Customer: ${l.customer?.full_name}`));
        }
    } catch (e) {
        console.log("Error:", e);
    }
}

testSearchByEmail();
