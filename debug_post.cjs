const http = require('http');

const payload = JSON.stringify([{ "id": "test-save", "type": "TEST" }]);

const req = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/layout',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
    }
}, (res) => {
    console.log(`[POST STATUS] ${res.statusCode}`);
    let body = '';
    res.on('data', (c) => body += c);
    res.on('end', () => console.log(`[RESPONSE] ${body}`));
});

req.on('error', (e) => {
    console.error(`[ERROR] POST failed: ${e.message}`);
});

req.write(payload);
req.end();
