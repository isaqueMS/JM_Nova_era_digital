
const token = '5C8MHVWUYI:QHKR2LADU2BXV9TIMYMWWP9JWUTULLM5';
const base = 'https://api.mikweb.com.br/v1/admin';
const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };
const fs = require('fs');

async function testGeneralHistory() {
    try {
        let output = "--- GENERAL HISTORY & USAGE ---\n";

        // Conn History
        const r1 = await fetch(`${base}/conn_histories?per_page=2`, { headers });
        const res1 = await r1.json();
        const h = res1.data || res1.conn_histories || [];
        output += `Histories found: ${h.length}\n`;
        if (h.length > 0) {
            output += `First History: ${JSON.stringify(h[0], null, 2)}\n`;
        } else {
            output += `Keys in response: ${Object.keys(res1).join(', ')}\n`;
        }

        // Bandwidth Usage
        const r2 = await fetch(`${base}/bandwidth_usages?per_page=2`, { headers });
        const res2 = await r2.json();
        const u = res2.data || res2.bandwidth_usages || [];
        output += `Usages found: ${u.length}\n`;
        if (u.length > 0) {
            output += `First Usage: ${JSON.stringify(u[0], null, 2)}\n`;
        } else {
            output += `Keys in response: ${Object.keys(res2).join(', ')}\n`;
        }

        fs.writeFileSync('generic_history.txt', output);
        console.log("Done. Saved to generic_history.txt");

    } catch (e) {
        console.log("Error:", e);
    }
}

testGeneralHistory();
