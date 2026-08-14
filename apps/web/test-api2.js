const http = require("http");
const req = http.request("http://localhost:3000/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" }
}, (res) => {
  console.log("STATUS:", res.statusCode);
  res.on("data", d => process.stdout.write(d.toString()));
  res.on("end", () => console.log("\nDONE"));
});
req.on("error", e => console.error(e));
req.write(JSON.stringify({
  messages: [
    { role: "user", content: "Eu quero uma proposta, meu consumo é 301 kWh em Presidente Prudente/SP." },
    { role: "assistant", content: "Dados extraídos! Consumo de 301 kWh/mês em Presidente Prudente/SP. Qual será a estrutura do telhado?\n1 - Cerâmica (Colonial)\n2 - Fibrocimento (Fibromadeira)\n3 - Metálico\n4 - Solo\n5 - Laje\n6 - Sem estrutura" },
    { role: "user", content: "2" }
  ]
}));
req.end();
