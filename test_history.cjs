
const token = 'EXPO_PUBLIC_MIKWEB_TOKEN_PLACEHOLDER';
const base = 'https://api.mikweb.com.br/v1/admin';
const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };
const fs = require('fs');

async function testHistoryAndUsage() {
    const customerId = 1993147;
    const loginId = 56899; // Obtido anteriormente
    let output = "--- TEST HISTORY AND USAGE ---\n";

    try {
        // 1. Conn History by customer_id
        const r1 = await fetch(`${base}/conn_histories?customer_id=${customerId}`, { headers });
        const res1 = await r1.json();
        const h1 = res1.data || res1.conn_histories || [];
        output += `History by customer_id (${customerId}): ${h1.length}\n`;

        // 2. Bandwidth Usage by customer_id
        const r2 = await fetch(`${base}/bandwidth_usages?customer_id=${customerId}`, { headers });
        const res2 = await r2.json();
        const u1 = res2.data || res2.bandwidth_usages || [];
        output += `Usage by customer_id (${customerId}): ${u1.length}\n`;

        // 3. Try by login_id (if API supports)
        const r3 = await fetch(`${base}/conn_histories?login_id=${loginId}`, { headers });
        const res3 = await r3.json();
        const h2 = res3.data || res3.conn_histories || [];
        output += `History by login_id (${loginId}): ${h2.length}\n`;

        const r4 = await fetch(`${base}/bandwidth_usages?login_id=${loginId}`, { headers });
        const res4 = await r4.json();
        const u2 = res4.data || res4.bandwidth_usages || [];
        output += `Usage by login_id (${loginId}): ${u2.length}\n`;

        // 4. Try nested endpoint (common pattern)
        const r5 = await fetch(`${base}/logins/${loginId}/conn_histories`, { headers });
        if (r5.ok) {
            const res5 = await r5.json();
            const h3 = res5.data || res5.conn_histories || [];
            output += `History via /logins/${loginId}/conn_histories: ${h3.length}\n`;
        } else {
            output += `History via /logins/${loginId}/conn_histories: FAILED (${r5.status})\n`;
        }

        fs.writeFileSync('history_test_result.txt', output);
        console.log("Done. Results in history_test_result.txt");

    } catch (e) {
        fs.writeFileSync('history_test_result.txt', "Error: " + e.message);
    }
}

testHistoryAndUsage();
