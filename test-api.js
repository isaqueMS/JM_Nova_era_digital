require('dotenv').config();
const MIKWEB_TOKEN = process.env.EXPO_PUBLIC_MIKWEB_TOKEN || '';
const BASE_URL = 'https://api.mikweb.com.br/v1';

async function test() {
    console.log('--- TEST CALLEDIES ---');
    try {
        const res = await fetch(`${BASE_URL}/admin/calledies?per_page=5`, {
            headers: { 'Authorization': `Bearer ${MIKWEB_TOKEN}`, 'Accept': 'application/json' }
        });
        console.log('Status:', res.status);
        const json = await res.json();
        console.log('Keys:', Object.keys(json));
        if (json.calledies) {
            console.log('calledies count:', json.calledies.length);
            json.calledies.slice(0, 3).forEach((t, i) => {
                console.log(`Ticket ${i} Subject:`, t.subject);
            });
        }
    } catch (e) {
        console.log('Error:', e.message);
    }

    console.log('\n--- TEST CUSTOMERS (ALL) ---');
    try {
        const res = await fetch(`${BASE_URL}/admin/customers?per_page=50`, {
            headers: { 'Authorization': `Bearer ${MIKWEB_TOKEN}`, 'Accept': 'application/json' }
        });
        console.log('Status Customers:', res.status);
        const json = await res.json();
        console.log('Keys Customers:', Object.keys(json));
        if (json.customers && Array.isArray(json.customers)) {
            console.log('Total customers fetched:', json.customers.length);
            console.log('Sample customer status:', json.customers[0]?.status);
        }
    } catch (e) {
        console.log('Error Customers:', e.message);
    }
}

test();
