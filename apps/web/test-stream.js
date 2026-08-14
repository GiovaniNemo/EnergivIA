const http = require('http');

const req = http.request('http://localhost:3001/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  console.log("STATUS:", res.statusCode);
  res.on('data', d => process.stdout.write("DATA: " + d.toString()));
});
req.on('error', e => console.error(e));
req.write(JSON.stringify({
  messages: [{ role: "user", content: "O meu consumo é 799 kWh, cidade São Paulo, SP, monofásico. O telhado é fibrocimento." }]
}));
req.end();
