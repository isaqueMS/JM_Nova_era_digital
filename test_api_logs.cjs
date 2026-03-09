
const MIKWEB_TOKEN = 'EXPO_PUBLIC_MIKWEB_TOKEN_PLACEHOLDER';
const BASE_URL = 'https://api.mikweb.com.br/v1/admin';
const HEADERS = { 'Authorization': `Bearer ${MIKWEB_TOKEN}`, 'Accept': 'application/json' };

async function checkLogsAndDashboard() {
    try {
        console.log("--- LOGS FOR CUSTOMER ---");
        const res = await fetch(BASE_URL + '/logs?customer_id=1993147', { headers: HEADERS });
        const json = await res.json();
        const logs = json.logs || [];
        logs.slice(0, 5).forEach(l => {
            console.log(`Log ${l.id}: ${l.type_user} - ${l.history}`);
        });

        console.log("\n--- MORE LOGS FOR LOGIN ---");
        const res2 = await fetch(BASE_URL + '/logs?login_id=56899', { headers: HEADERS });
        if (res2.ok) {
            const json2 = await res2.json();
            const logs2 = json2.logs || [];
            console.log(`Found ${logs2.length} logs for login 56899`);
        } else {
            console.log("No logs by login id");
        }

        // Testando rotas não-API do painel MikWeb que talvez funcionem
        console.log("\n--- TESTING KNOWN WEB ROUTES ---");
        const webRoutes = [
            '/reports/connections',
            '/reports/bandwidths',
            '/customer_connections',
            '/extracts'
        ];
        for (let route of webRoutes) {
            const r = await fetch(BASE_URL + route, { headers: HEADERS });
            console.log(`${route} -> HTTP ${r.status}`);
        }

    } catch (e) { console.log(e.message); }
}
checkLogsAndDashboard();
