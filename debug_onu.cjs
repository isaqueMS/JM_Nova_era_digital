
const token = '5C8MHVWUYI:QHKR2LADU2BXV9TIMYMWWP9JWUTULLM5';
const base = 'https://api.mikweb.com.br/v1/admin';
const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };
const fs = require('fs');

async function test(path, filename) {
    try {
        const r = await fetch(base + path, { headers });
        const text = await r.text();
        console.log(`[${r.status}] ${path} -> ${filename}`);
        fs.writeFileSync(filename, text);
    } catch (e) {
        console.log(`[ERR] ${path} -> ${e.message}`);
    }
}

async function run() {
    const onuId = '146747'; // ID da ONU na Babi
    await test(`/onus/${onuId}`, 'diag_onu.json');
    await test(`/onus/${onuId}/signal`, 'diag_onu_signal.json');
    await test(`/onus/${onuId}/status`, 'diag_onu_status.json');
    await test(`/logins/56907/diagnose`, 'diag_login_diag.json');
}

run();
