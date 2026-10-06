import asyncio
import os
import sys

# Garante compatibilidade de stdout no Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import edge_tts

VOICE = "pt-BR-FranciscaNeural"
RATE = "+6%"
PITCH = "+0Hz"

SCENES = [
    {
        "id": "scene-1-problem",
        "file": "scene-1.mp3",
        "text": "Quantas ferramentas a sua integradora solar usa hoje? Planilhas complexas, CRMs isolados e propostas demoradas fazem você perder clientes antes mesmo de apresentar o preço."
    },
    {
        "id": "scene-2-whatsapp",
        "file": "scene-2.mp3",
        "text": "A EnergivIA muda esse jogo. Pelo WhatsApp, sua inteligência artificial atende o cliente, extrai os dados da fatura na hora e dimensiona o sistema ideal em segundos. Mas isso é só o ponto de partida."
    },
    {
        "id": "scene-3-proposals",
        "file": "scene-3.mp3",
        "text": "Você tem em mãos um estúdio completo de propostas. Escolha entre modelos modernos e editáveis, personalize com a identidade da sua empresa e inclua opcionais de alto valor com poucos cliques, gerando propostas interativas e irresistíveis."
    },
    {
        "id": "scene-4-crm",
        "file": "scene-4.mp3",
        "text": "Gerencie todo o seu fluxo com nosso CRM dedicado ao mercado solar. Acompanhe cada etapa da negociação, saiba o momento exato em que o cliente abriu a proposta e mantenha sua equipe focada em fechar contratos."
    },
    {
        "id": "scene-5-cta",
        "file": "scene-5.mp3",
        "text": "Do primeiro contato no WhatsApp à assinatura do contrato: tudo em um só ecossistema. Acelere suas vendas e profissionalize sua operação. Conheça a EnergivIA e comece seu teste gratuito hoje mesmo."
    }
]

async def generate_scene_audio(scene, output_dir):
    out_path = os.path.join(output_dir, scene["file"])
    print(f"Gerando locucao: {scene['id']} -> {scene['file']}...")
    communicate = edge_tts.Communicate(scene["text"], VOICE, rate=RATE, pitch=PITCH)
    await communicate.save(out_path)
    size = os.path.getsize(out_path)
    print(f"Concluido: {scene['file']} ({size} bytes)")

async def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, "..", "public", "audio")
    os.makedirs(output_dir, exist_ok=True)

    print(f"Iniciando geracao de voz neural feminina: {VOICE}")
    print(f"Diretorio de saida: {output_dir}")

    for scene in SCENES:
        await generate_scene_audio(scene, output_dir)

    print("Todos os audios foram gerados com sucesso!")

if __name__ == "__main__":
    asyncio.run(main())
