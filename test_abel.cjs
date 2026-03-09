
const token = 'EXPO_PUBLIC_MIKWEB_TOKEN_PLACEHOLDER';
const base = 'https://api.mikweb.com.br/v1/admin';
const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };
const fs = require('fs');

async function testAbel() {
    const customerId = 2069653; // Abel
    const email = "martinsabel865@gmail.com";
    try {
        console.log("Searching Abel by customer_id:", customerId);
        const r1 = await fetch(`${base}/logins?customer_id=${customerId}`, { headers });
        const res1 = await r1.json();
        console.log("Logins by ID found:", (res1.logins || res1.data || []).length);

        console.log("Searching Abel by email:", email);
        const r2 = await fetch(`${base}/logins?login=${encodeURIComponent(email)}`, { headers });
        const res2 = await r2.json();
        const logins2 = res2.logins || res2.data || [];
        console.log("Logins by email found:", logins2.length);
        if (logins2.length > 0) {
            console.log("Sample login found by email:", logins2[0].login, "ID:", logins2[0].id);
        }

    } catch (e) {
        console.log("Error:", e);
    }
}

testAbel();
