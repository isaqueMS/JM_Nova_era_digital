
const token = 'EXPO_PUBLIC_MIKWEB_TOKEN_PLACEHOLDER';
const base = 'https://api.mikweb.com.br/v1/admin';
const headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };

async function testNonExistent() {
    try {
        console.log("Searching by login=nonexistent123456789");
        const r = await fetch(`${base}/logins?login=nonexistent123456789`, { headers });
        const res = await r.json();
        const logins = res.logins || res.data || [];
        console.log("Found", logins.length, "logins");
    } catch (e) {
        console.log("Error:", e);
    }
}

testNonExistent();
