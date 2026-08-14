const http = require("https");
const req = http.request("https://energivia.com/api/chat", {
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
    { role: "user", content: "O meu consumo é 799 kWh, cidade São Paulo, SP, monofásico. O telhado é fibrocimento." },
    { role: "assistant", content: "Dados extraídos! Consumo de 799 kWh/mês em São Paulo/SP. Qual será a estrutura do telhado?\n1 - Cerâmica\n2 - Fibrocimento" },
    { role: "user", content: "2" }
  ]
}));
req.end();
