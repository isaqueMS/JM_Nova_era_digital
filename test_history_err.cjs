
const token = '5C8MHVWUYI:QHKR2LADU2BXV9TIMYMWWP9JWUTULLM5';
const base = 'https://api.mikweb.com.br/v1/admin';
const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };

async function getError() {
    const r1 = await fetch(`${base}/conn_histories`, { headers });
    console.log("HISTORY:", await r1.json());

    const r2 = await fetch(`${base}/bandwidth_usages`, { headers });
    console.log("USAGE:", await r2.json());
}
getError();
