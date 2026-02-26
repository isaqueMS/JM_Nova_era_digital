
const token = '5C8MHVWUYI:QHKR2LADU2BXV9TIMYMWWP9JWUTULLM5';
const base = 'https://api.mikweb.com.br/v1/admin';
const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };
const fs = require('fs');

async function testMultipleLogins() {
    const email = "albericobezerra@hotmail.com";
    try {
        const rl = await fetch(`${base}/logins?login=${encodeURIComponent(email)}`, { headers });
        const result = await rl.json();
        const logins = result.logins || result.data || [];
        fs.writeFileSync('alberico_multiple_logins.json', JSON.stringify(logins, null, 2));
        console.log("Found", logins.length, "logins for email", email);
        logins.forEach((l, i) => {
            console.log(`${i}: ID=${l.id} Login=${l.login} CustID=${l.customer_id} Name=${l.customer?.full_name}`);
        });
    } catch (e) {
        console.log("Error:", e);
    }
}

testMultipleLogins();
