const fs = require("fs");
let c = fs.readFileSync("apps/web/src/app/api/chat/route.ts", "utf8");

const targetStr = "const leadRes = await fetch(`${baseURL}/leads/${args.leadId}`, { headers });";
const replacementStr = `
              let finalLeadId = args.leadId;
              if (!finalLeadId || finalLeadId === 'undefined' || finalLeadId.trim() === '') {
                const latestRes = await fetch(\`\${baseURL}/leads?page=1&pageSize=1\`, { headers });
                if (latestRes.ok) {
                  const latestData = await latestRes.json();
                  if (latestData?.data && latestData.data.length > 0) {
                    finalLeadId = latestData.data[0].id;
                  } else if (latestData?.items && latestData.items.length > 0) {
                    finalLeadId = latestData.items[0].id;
                  } else if (Array.isArray(latestData) && latestData.length > 0) {
                    finalLeadId = latestData[0].id;
                  }
                }
              }
              if (!finalLeadId || finalLeadId === 'undefined') {
                return { success: false, message: \`Não foi possível identificar o cliente (nenhum lead recente foi encontrado para atrelar). ID recebido: \${args.leadId}\` };
              }
              const leadRes = await fetch(\`\${baseURL}/leads/\${finalLeadId}\`, { headers });
`;

if (c.includes(targetStr)) {
  c = c.replace(targetStr, replacementStr);
  fs.writeFileSync("apps/web/src/app/api/chat/route.ts", c);
  console.log("Success");
} else {
  console.log("Target string not found!");
}
