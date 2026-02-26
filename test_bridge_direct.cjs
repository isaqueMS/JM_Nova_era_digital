
async function testBridge() {
    console.log("Testing bridge directly...");
    try {
        const response = await fetch(`http://127.0.0.1:3001/bridge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                host: '100.64.0.1', // Vou tentar um host generico para ver se conecta, ou talvez localhost
                port: '8728',
                user: 'admin',
                password: '',
                command: '/ppp/active/print'
            })
        });
        const text = await response.text();
        console.log("Bridge response:", text);
    } catch (e) {
        console.log("Bridge error:", e.message);
    }
}
testBridge();
