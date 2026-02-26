
const token = '5C8MHVWUYI:QHKR2LADU2BXV9TIMYMWWP9JWUTULLM5';
const base = 'https://api.mikweb.com.br/v1/admin';
const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };

async function testNoPerPage() {
    const customerId = 1993147;
    try {
        console.log("Searching by customer_id=1993147 (NO per_page)");
        const r = await fetch(`${base}/logins?customer_id=${customerId}`, { headers });
        const res = await r.json();
        const logins = res.logins || res.data || [];
        console.log("Found", logins.length, "logins");
        if (logins.length > 0) {
            console.log("First login ID:", logins[0].id);
        }
    } catch (e) {
        console.log("Error:", e);
    }
}

testNoPerPage();
