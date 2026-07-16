#!/usr/bin/env bash
#
# Passos da comunidade Meta + documentação Meta:
#   1) POST /{PHONE_NUMBER_ID}/register
#   2) POST /{WABA_ID}/subscribed_apps
#
# Variáveis: WA_ACCESS_TOKEN, WA_PHONE_NUMBER_ID, WA_WABA_ID, WA_PIN
# Opcionais: WA_GRAPH_VERSION, WA_INCLUDE_CERT=true, WA_SKIP_REGISTER=true
#
# O número de TESTE (+1 555…) do Quickstart costuma NÃO aceitar /register como número
# comercial; a Meta pode responder 4xx/5xx. Nesse caso use WA_SKIP_REGISTER=true e rode
# só o passo subscribed_apps.
#
set -euo pipefail

GRAPH_VERSION="${WA_GRAPH_VERSION:-v25.0}"
BASE="https://graph.facebook.com/${GRAPH_VERSION}"

for v in WA_ACCESS_TOKEN WA_PHONE_NUMBER_ID WA_WABA_ID WA_PIN; do
  if [[ -z "${!v:-}" ]]; then
    echo "Variável obrigatória ausente: $v" >&2
    exit 1
  fi
done

if [[ "${#WA_PIN}" -ne 6 ]] || ! [[ "$WA_PIN" =~ ^[0-9]{6}$ ]]; then
  echo "WA_PIN deve ter exatamente 6 dígitos numéricos." >&2
  exit 1
fi

if [[ "${WA_INCLUDE_CERT:-}" == "true" ]]; then
  REGISTER_JSON="{\"messaging_product\":\"whatsapp\",\"pin\":\"${WA_PIN}\",\"certificate\":\"cert\"}"
else
  REGISTER_JSON="{\"messaging_product\":\"whatsapp\",\"pin\":\"${WA_PIN}\"}"
fi

http_post_json() {
  local url="$1"
  local json="$2"
  local out
  out="$(mktemp)"
  local code
  code="$(curl -sS -o "$out" -w "%{http_code}" -X POST "$url" \
    -H "Authorization: Bearer ${WA_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$json")"
  echo "--- HTTP ${code} ---"
  cat "$out"
  echo ""
  rm -f "$out"
  if [[ "${code}" -lt 200 || "${code}" -ge 300 ]]; then
    return 1
  fi
  return 0
}

http_post_no_body() {
  local url="$1"
  local out
  out="$(mktemp)"
  local code
  code="$(curl -sS -o "$out" -w "%{http_code}" -X POST "$url" \
    -H "Authorization: Bearer ${WA_ACCESS_TOKEN}")"
  echo "--- HTTP ${code} ---"
  cat "$out"
  echo ""
  rm -f "$out"
  if [[ "${code}" -lt 200 || "${code}" -ge 300 ]]; then
    return 1
  fi
  return 0
}

if [[ "${WA_SKIP_REGISTER:-}" == "true" ]]; then
  echo "==> 1/2 POST .../register (pulado — WA_SKIP_REGISTER=true)"
else
  echo "==> 1/2 POST .../${WA_PHONE_NUMBER_ID}/register"
  if ! http_post_json "${BASE}/${WA_PHONE_NUMBER_ID}/register" "${REGISTER_JSON}"; then
    echo "" >&2
    echo "Registro falhou. Leia o JSON acima (error / message / code da Meta)." >&2
    echo "Se for o número de TESTE do painel (+1 555…), /register pode não ser suportado." >&2
    echo "Tente: WA_SKIP_REGISTER=true pnpm whatsapp:cloud-setup" >&2
    exit 1
  fi
fi

echo "==> 2/2 POST .../${WA_WABA_ID}/subscribed_apps"
if ! http_post_no_body "${BASE}/${WA_WABA_ID}/subscribed_apps"; then
  echo "" >&2
  echo "subscribed_apps falhou. Veja o JSON acima; token precisa de escopos da WABA." >&2
  exit 1
fi

echo "OK."
echo "Webhook dev (Nest): defina WHATSAPP_VERIFY_TOKEN (ou WHATSAPP_WEBHOOK_VERIFY_TOKEN) no .env e na Meta use:"
echo "  Callback: https://<ngrok>/api/whatsapp/webhook"
echo "  (legado) https://<ngrok>/api/integrations/whatsapp/webhook"
echo "Depois assine 'messages' na Meta e reenvie o template; veja logs da API (statuses / errors)."
