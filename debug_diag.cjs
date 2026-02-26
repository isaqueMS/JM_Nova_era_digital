
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
    const id = '56907';
    await test(`/logins/${id}`, 'diag_base.json');
    await test(`/logins/${id}/online`, 'diag_online.json');
    await test(`/logins/${id}/active`, 'diag_active.json');
    await test(`/logins/${id}/session`, 'diag_session.json');
    await test(`/logins/${id}/diagnose`, 'diag_diagnose.json');
}

run();
