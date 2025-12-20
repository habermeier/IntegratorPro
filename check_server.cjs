const http = require('http');

const req = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/layout',
    method: 'GET'
}, (res) => {
    console.log(`[STATUS] ${res.statusCode}`);
    res.on('data', () => { });
    res.on('end', () => console.log('[DONE] Server is Alive'));
});

req.on('error', (e) => {
    console.error(`[ERROR] Connection failed: ${e.message}`);
});

req.end();
