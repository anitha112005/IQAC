const http = require('http');

console.log("Checking Ollama Mistral on port 11434...");
const ollamaReq = http.get("http://localhost:11434/api/tags", (res) => {
    console.log(`Ollama Status: ${res.statusCode}`);
    res.on('data', (d) => {
        // console.log("Ollama Data:", d.toString().substring(0, 100));
    });
}).on('error', (e) => {
    console.error(`Ollama Error: ${e.message}`);
});

console.log("Checking Node Backend on port 5000...");
const backendReq = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/ai/search',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    }
}, (res) => {
    console.log(`Backend API Status: ${res.statusCode}`);
    res.on('data', (d) => {
        console.log("Backend API Data:", d.toString());
    });
}).on('error', (e) => {
    console.error(`Backend API Error: ${e.message}`);
});

backendReq.write(JSON.stringify({ question: "hello" }));
backendReq.end();
