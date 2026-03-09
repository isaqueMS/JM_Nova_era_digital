
const token = 'EXPO_PUBLIC_MIKWEB_TOKEN_PLACEHOLDER';
const base = 'https://api.mikweb.com.br/v1/admin';
const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };
const fs = require('fs');

async function test() {
    try {
        const r = await fetch(base + '/customers?per_page=5', { headers });
        const result = await r.json();
        console.log("Keys:", Object.keys(result));
        const list = result.customers || result.data || [];
        if (list.length > 0) {
            console.log("First customer keys:", Object.keys(list[0]));
            console.log("First customer sample:", JSON.stringify(list[0], null, 2).substring(0, 500));
        }
    } catch (e) {
        console.log("Error:", e);
    }
}

test();
