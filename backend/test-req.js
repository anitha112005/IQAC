const http = require('http');

const data = JSON.stringify({ question: "hello" });

const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/ai/search', // As requested via router
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // If protected route
    }
}, (res) => {
    let output = '';
    console.log(`STATUS: ${res.statusCode}`);
    res.on('data', (d) => {
        output += d;
    });
    res.on('end', () => {
        console.log("RESPONSE BODY:");
        console.log(output);
    });
});

req.on('error', (e) => {
    console.error(`ERROR: ${e.message}`);
});

req.write(data);
req.end();
