const express = require('express');
const cors = require('cors');
const { RouterOSClient } = require('routeros-client');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/bridge', async (req, res) => {
    const { host, port, user, password, command } = req.body;

    if (!host || !command) {
        return res.status(400).json({ error: 'Missing host or command' });
    }

    console.log(`[BRIDGE] Connecting to ${host}:${port || 8728} with user ${user}`);

    const api = new RouterOSClient({
        host: host,
        user: user || 'admin',
        password: password || '',
        port: port ? parseInt(port) : 8728,
        timeout: 15,
        keepalive: true
    });

    try {
        const client = await api.connect();
        console.log(`[BRIDGE] Connected successfully! Executing: ${command}`);

        let args = command.split(' ');
        let baseCmd = args[0];
        let menuCmd = client.menu(baseCmd);

        let filters = {};
        for (let i = 1; i < args.length; i++) {
            if (args[i] === 'detail' || args[i] === 'where') continue;
            if (args[i].includes('~"')) {
                let parts = args[i].split('~');
                filters[parts[0]] = parts[1].replace(/"/g, '');
            } else if (args[i].includes('=')) {
                let parts = args[i].split('=');
                filters[parts[0]] = parts[1].replace(/"/g, '');
            }
        }

        let result = [];
        if (baseCmd.includes('print')) {
            result = await menuCmd.get(filters);
        } else if (baseCmd.includes('remove')) {
            baseCmd = baseCmd.replace('/remove', '');
            result = await client.menu(baseCmd).remove(filters);
        } else {
            result = await client.query(args);
        }

        api.close();
        console.log(`[BRIDGE] Command finished. Output length:`, result ? result.length : 0);
        res.json({ output: JSON.stringify(result) });

    } catch (err) {
        console.error("[BRIDGE] ERROR Details:", err);
        res.status(500).json({ error: err.message || 'Erro de conexão RouterOS', code: err.code });
        try { api.close(); } catch (e) { }
    }
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 MK Bridge (RouterOS API Proxy) rodando na porta ${PORT}`);
    console.log(`Para testes locais apontar o app para: http://IP_DO_PC:${PORT}/bridge`);
});
