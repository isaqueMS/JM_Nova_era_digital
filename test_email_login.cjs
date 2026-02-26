
const token = '5C8MHVWUYI:QHKR2LADU2BXV9TIMYMWWP9JWUTULLM5';
const base = 'https://api.mikweb.com.br/v1/admin';
const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };
const fs = require('fs');

async function testEmailLogin() {
    const customerId = 1993147;
    let output = "";
    try {
        const rc = await fetch(`${base}/customers/${customerId}`, { headers });
        const customer = (await rc.json()).customer || {};
        output += `Customer: ${customer.full_name}, Email: ${customer.email}\n`;

        if (customer.email) {
            const rl = await fetch(`${base}/logins?login=${encodeURIComponent(customer.email)}`, { headers });
            const result = await rl.json();
            const logins = result.logins || result.data || [];
            output += `Logins found for email (${customer.email}): ${logins.length}\n`;
        }

        const r2 = await fetch(`${base}/logins?customer_id=${customerId}`, { headers });
        const result2 = await r2.json();
        const logins2 = result2.logins || result2.data || [];
        output += `Logins found for customer_id (${customerId}): ${logins2.length}\n`;

        fs.writeFileSync('email_test_result.txt', output);
        console.log("Done. Results in email_test_result.txt");

    } catch (e) {
        fs.writeFileSync('email_test_result.txt', "Error: " + e.message);
    }
}

testEmailLogin();
