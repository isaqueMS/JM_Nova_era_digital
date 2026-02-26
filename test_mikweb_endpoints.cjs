// Test main MikWeb API endpoint variations for online customer status
const token = '5C8MHVWUYI:QHKR2LADU2BXV9TIMYMWWP9JWUTULLM5';
const base = 'https://api.mikweb.com.br/v1/admin';
const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };
const fs = require('fs');

async function test(path) {
    try {
        const r = await fetch(base + path, { headers });
        const text = await r.text();
        console.log('[' + r.status + '] ' + path + ' => ' + text.substring(0, 120));
        return { status: r.status, body: text };
    } catch (e) {
        console.log('[ERR] ' + path + ' => ' + e.message);
        return null;
    }
}

async function run() {
    // Test login detail endpoints 
    const r1 = await test('/logins/56907');
    if (r1 && r1.status === 200) {
        fs.writeFileSync('test_login_56907.json', r1.body);
        console.log('Saved to test_login_56907.json');
    }

    // Test get online status by login
    await test('/logins/56907/online');
    await test('/logins/56907/active');
    await test('/logins/56907/session');

    // Test customer status endpoints
    await test('/customers/1994029/logins');
    await test('/customers/1994029/online');

    // Test generic online queries
    const r2 = await test('/logins?per_page=10&status=online');
    const r3 = await test('/logins?per_page=10&access_status=access_active&login=babi@jmlinkdigital.com.br');
    if (r3 && r3.status === 200) {
        fs.writeFileSync('test_login_babi.json', r3.body);
    }
}

run();
