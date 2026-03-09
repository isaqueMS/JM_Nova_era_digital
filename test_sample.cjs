
const token = 'EXPO_PUBLIC_MIKWEB_TOKEN_PLACEHOLDER';
const base = 'https://api.mikweb.com.br/v1/admin';
const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };
const fs = require('fs');

async function test() {
    try {
        const r = await fetch(base + '/customers?per_page=1', { headers });
        const result = await r.json();
        const list = result.customers || result.data || [];
        fs.writeFileSync('customer_sample.json', JSON.stringify(list[0], null, 2));
        console.log("Saved customer_sample.json");
    } catch (e) {
        console.log("Error:", e);
    }
}

test();
