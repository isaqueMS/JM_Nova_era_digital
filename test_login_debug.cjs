
const token = 'EXPO_PUBLIC_MIKWEB_TOKEN_PLACEHOLDER';
const base = 'https://api.mikweb.com.br/v1/admin';
const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };
const fs = require('fs');

async function testEmailLogin() {
    const customerId = 1993147;
    try {
        const r2 = await fetch(`${base}/logins?customer_id=${customerId}`, { headers });
        const result2 = await r2.json();
        const logins2 = result2.logins || result2.data || [];
        fs.writeFileSync('login_debug.json', JSON.stringify(result2, null, 2));
        console.log("Logins keys:", Object.keys(result2));
        console.log("Logins length:", logins2.length);
        if (logins2.length > 3) {
            console.log("First login:", JSON.stringify(logins2[0], null, 2));
        }

    } catch (e) {
        console.log("Error:", e);
    }
}

testEmailLogin();
