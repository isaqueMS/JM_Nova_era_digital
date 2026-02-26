
const token = '5C8MHVWUYI:QHKR2LADU2BXV9TIMYMWWP9JWUTULLM5';
const base = 'https://api.mikweb.com.br/v1/admin';
const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };

async function testIncludeLogins() {
    try {
        console.log("Searching customers with include=logins");
        const r = await fetch(`${base}/customers?per_page=1&include=logins`, { headers });
        const res = await r.json();
        const list = res.customers || res.data || [];
        if (list.length > 0) {
            console.log("Customer keys:", Object.keys(list[0]));
            if (list[0].logins) {
                console.log("Logins included!", list[0].logins.length);
            } else {
                console.log("Logins NOT included.");
            }
        }
    } catch (e) {
        console.log("Error:", e);
    }
}

testIncludeLogins();
