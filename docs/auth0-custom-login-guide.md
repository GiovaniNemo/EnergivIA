# Guia: Como Atualizar a Tela de Login e Cadastro no Auth0 (Double Slider 3D Glassmorphism)

Este guia contém o código exato e o passo a passo para transformar a tela oficial de login e cadastro do Auth0 (`https://dev-g3g2vs8yakmcj275.us.auth0.com/login`) no visual **Glassy Form V2** da EnergivIA com transição fluida Double Slider 3D:

- **100% em português**
- **Sem campo de nome** (apenas e-mail corporativo e senha)
- **Botão do Google destacado no topo** ("Continuar com o Google")
- **Efeitos visuais de iluminação ambiente, neon glow e glassmorphism**
- **Transição fluida e animada Double Slider 3D com aceleração por GPU (60 FPS)**

---

## Passo a Passo para Aplicar no Auth0

1. Acesse o painel: [manage.auth0.com](https://manage.auth0.com)
2. No menu lateral esquerdo, clique em **Branding** &rarr; **Universal Login**.
3. Clique em **Advanced Options** (ou no rodapé em **Advanced Settings**).
4. Clique na aba **Login**.
5. Verifique se a chave **Customize Login Page** está ativada (**ON**).
6. **Substitua todo o código existente** pelo código HTML atualizado abaixo (ou copie o conteúdo direto do arquivo `docs/auth0-login-template.html`).
7. Clique no botão **Save** no canto superior direito do painel do Auth0.
8. Teste novamente acessando [www.energivia.com.br](https://www.energivia.com.br) e clicando em **Entrar** ou **Começar Agora**.

---

## Código Completo (HTML + CSS + Botão Google + Efeitos Glassmorphism + Double Slider)

Copie todo o bloco abaixo e cole na aba **Login** do painel do Auth0:

`html

<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Acesso à Plataforma | EnergivIA</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <!-- SDK Oficial Auth0.js para autenticação -->
    <script src="https://cdn.auth0.com/js/auth0/9.19/auth0.min.js"></script>

    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      body {
        background-color: #02040a;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px 16px;
        color: #ffffff;
        overflow-x: hidden;
        position: relative;
      }

      /* ------------------------------------------------------------- */
      /* EFEITOS DE ILUMINAÇÃO AMBIENTE E FUNDO DINÂMICO                */
      /* ------------------------------------------------------------- */
      .ambient-glow {
        position: fixed;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 1;
      }

      .glow-orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(120px);
        opacity: 0.45;
        animation: floatGlow 14s ease-in-out infinite alternate;
      }

      .glow-orb-1 {
        top: -10%;
        left: 20%;
        width: 550px;
        height: 550px;
        background: radial-gradient(circle, #10b981 0%, rgba(16, 185, 129, 0.05) 70%, transparent 100%);
      }

      .glow-orb-2 {
        bottom: -15%;
        right: 15%;
        width: 600px;
        height: 600px;
        background: radial-gradient(circle, #059669 0%, rgba(20, 184, 166, 0.08) 65%, transparent 100%);
        animation-delay: -7s;
      }

      .glow-orb-3 {
        top: 40%;
        left: -10%;
        width: 400px;
        height: 400px;
        background: radial-gradient(circle, #14b8a6 0%, transparent 70%);
        animation-duration: 18s;
      }

      @keyframes floatGlow {
        0% {
          transform: translate(0, 0) scale(1);
        }
        50% {
          transform: translate(40px, -30px) scale(1.08);
        }
        100% {
          transform: translate(-30px, 40px) scale(0.95);
        }
      }

      /* Malha de Fundo 3D */
      .bg-grid {
        position: fixed;
        inset: 0;
        z-index: 2;
        pointer-events: none;
        opacity: 0.35;
        background-image:
          radial-gradient(rgba(16, 185, 129, 0.12) 1px, transparent 1px),
          linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
        background-size: 32px 32px, 64px 64px, 64px 64px;
      }

      /* ------------------------------------------------------------- */
      /* CARD PRINCIPAL EM GLASSMORPHISM (DOUBLE SLIDER 3D)            */
      /* ------------------------------------------------------------- */
      .glass-container {
        position: relative;
        z-index: 10;
        width: 100%;
        max-width: min(94vw, 1020px);
        min-height: clamp(500px, 58vh, 620px);
        border-radius: clamp(24px, 2.5vw, 32px);
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%),
          rgba(6, 11, 20, 0.88);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-top: 1px solid rgba(255, 255, 255, 0.38); /* Chanfro de luz especular superior */
        backdrop-filter: blur(28px) saturate(190%);
        -webkit-backdrop-filter: blur(28px) saturate(190%);
        box-shadow:
          0 25px 60px -15px rgba(0, 0, 0, 0.95),
          0 0 40px rgba(16, 185, 129, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.25);
        overflow: hidden;
        transition: max-width 0.3s ease, min-height 0.3s ease;
      }

      /* ------------------------------------------------------------- */
      /* PAINÉIS DE FORMULÁRIO (LOGIN E CADASTRO)                      */
      /* ------------------------------------------------------------- */
      .form-panel {
        position: absolute;
        top: 0;
        height: 100%;
        transition: all 0.65s cubic-bezier(0.77, 0, 0.175, 1);
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: clamp(28px, 3.5vw, 54px) clamp(28px, 4vw, 58px);
      }

      /* Painel de Login (Lado Esquerdo Inicial) */
      .login-panel {
        left: 0;
        width: 50%;
        z-index: 2;
        opacity: 1;
        pointer-events: auto;
      }

      .glass-container.right-panel-active .login-panel {
        transform: translateX(100%);
        opacity: 0;
        pointer-events: none;
      }

      /* Painel de Cadastro (Lado Esquerdo, revelado à Direita) */
      .signup-panel {
        left: 0;
        width: 50%;
        opacity: 0;
        z-index: 1;
        pointer-events: none;
      }

      .glass-container.right-panel-active .signup-panel {
        transform: translateX(100%);
        opacity: 1;
        z-index: 5;
        pointer-events: auto;
        animation: panelShow 0.65s cubic-bezier(0.77, 0, 0.175, 1);
      }

      @keyframes panelShow {
        0%, 49.99% {
          opacity: 0;
          z-index: 1;
        }
        50%, 100% {
          opacity: 1;
          z-index: 5;
        }
      }

      /* ------------------------------------------------------------- */
      /* SLIDING OVERLAY CONTAINER (COBERTURA DESLIZANTE 3D)           */
      /* ------------------------------------------------------------- */
      .overlay-container {
        position: absolute;
        top: 0;
        left: 50%;
        width: 50%;
        height: 100%;
        overflow: hidden;
        transition: transform 0.65s cubic-bezier(0.77, 0, 0.175, 1);
        z-index: 10;
      }

      .glass-container.right-panel-active .overlay-container {
        transform: translateX(-100%);
      }

      .overlay {
        position: relative;
        left: -100%;
        height: 100%;
        width: 200%;
        background:
          linear-gradient(145deg, rgba(16, 185, 129, 0.14) 0%, rgba(6, 78, 59, 0.28) 45%, rgba(2, 6, 23, 0.88) 100%),
          rgba(8, 15, 27, 0.94);
        backdrop-filter: blur(28px) saturate(200%);
        -webkit-backdrop-filter: blur(28px) saturate(200%);
        transform: translateX(0);
        transition: transform 0.65s cubic-bezier(0.77, 0, 0.175, 1);
        border-left: 1px solid rgba(255, 255, 255, 0.14);
        border-right: 1px solid rgba(255, 255, 255, 0.14);
      }

      .glass-container.right-panel-active .overlay {
        transform: translateX(50%);
      }

      /* Chanfro angular dinâmico de luz na borda divisória */
      .overlay::before {
        content: "";
        position: absolute;
        top: -10%;
        left: 50%;
        width: 2px;
        height: 120%;
        background: linear-gradient(
          to bottom,
          transparent,
          rgba(52, 211, 153, 0.6) 20%,
          rgba(255, 255, 255, 0.8) 50%,
          rgba(52, 211, 153, 0.6) 80%,
          transparent
        );
        transform: rotate(2.5deg);
        transition: transform 0.65s cubic-bezier(0.77, 0, 0.175, 1);
        pointer-events: none;
        filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.6));
      }

      .glass-container.right-panel-active .overlay::before {
        transform: rotate(-2.5deg);
      }

      .overlay-panel {
        position: absolute;
        top: 0;
        width: 50%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        padding: clamp(28px, 3.5vw, 54px) clamp(28px, 4vw, 58px);
        text-align: left;
        transition: transform 0.65s cubic-bezier(0.77, 0, 0.175, 1), opacity 0.4s ease;
      }

      /* Painel do Overlay à Esquerda (ativo quando em modo Cadastro) */
      .overlay-left {
        left: 0;
        transform: translateX(-20%);
        opacity: 0;
        pointer-events: none;
      }

      .glass-container.right-panel-active .overlay-left {
        transform: translateX(0);
        opacity: 1;
        pointer-events: auto;
      }

      /* Painel do Overlay à Direita (ativo quando em modo Login) */
      .overlay-right {
        right: 0;
        transform: translateX(0);
        opacity: 1;
        pointer-events: auto;
      }

      .glass-container.right-panel-active .overlay-right {
        transform: translateX(20%);
        opacity: 0;
        pointer-events: none;
      }

      /* ------------------------------------------------------------- */
      /* ELEMENTOS TIPOGRÁFICOS E COMPONENTES VISUAIS                  */
      /* ------------------------------------------------------------- */
      .brand-badge {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: clamp(6px, 0.8vh, 8px) clamp(14px, 1.2vw, 18px);
        border-radius: 9999px;
        font-size: clamp(11px, 0.85vw, 12.5px);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #34d399;
        background: rgba(6, 78, 59, 0.45);
        border: 1px solid rgba(16, 185, 129, 0.4);
        box-shadow: 0 0 16px rgba(16, 185, 129, 0.22);
        width: fit-content;
      }

      .sparkle-icon {
        width: clamp(12px, 0.9vw, 14px);
        height: clamp(12px, 0.9vw, 14px);
        fill: #34d399;
      }

      .welcome-heading {
        font-size: clamp(28px, 2.4vw, 40px);
        font-weight: 800;
        line-height: 1.15;
        margin-top: clamp(14px, 2vh, 22px);
        letter-spacing: -0.02em;
        color: #ffffff;
      }

      .welcome-heading span {
        background: linear-gradient(to right, #34d399, #2dd4bf, #ffffff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .welcome-text {
        font-size: clamp(13.5px, 1vw, 15.5px);
        color: #94a3b8;
        margin-top: clamp(10px, 1.4vh, 16px);
        line-height: 1.55;
        font-weight: 300;
        max-width: 440px;
      }

      .pill-toggle-btn {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: clamp(11px, 1.4vh, 15px) clamp(22px, 2vw, 30px);
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #ffffff;
        font-size: clamp(13px, 0.95vw, 15px);
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.25s ease;
        margin-top: clamp(18px, 2.5vh, 28px);
        width: fit-content;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
      }

      .pill-toggle-btn:hover {
        background: rgba(16, 185, 129, 0.2);
        border-color: rgba(16, 185, 129, 0.7);
        box-shadow: 0 0 25px rgba(16, 185, 129, 0.35);
        transform: translateY(-1px);
      }

      .pill-toggle-btn .btn-arrow {
        display: inline-block;
        transition: transform 0.2s ease;
      }

      .pill-toggle-btn:hover .btn-arrow {
        transform: translateX(4px);
      }

      .form-title {
        font-size: clamp(24px, 2vw, 32px);
        font-weight: 700;
        color: #ffffff;
        letter-spacing: -0.02em;
      }

      .form-subtitle {
        font-size: clamp(13px, 0.95vw, 14.5px);
        color: #94a3b8;
        margin-top: 4px;
        margin-bottom: clamp(14px, 1.8vh, 22px);
        font-weight: 300;
      }

      /* Botão Social Google no Topo */
      .google-btn {
        width: 100%;
        padding: clamp(11px, 1.4vh, 15px) 18px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: #ffffff;
        font-size: clamp(13.5px, 1vw, 15.5px);
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        cursor: pointer;
        transition: all 0.25s ease;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        margin-bottom: clamp(10px, 1.4vh, 14px);
      }

      .google-btn:hover {
        background: rgba(255, 255, 255, 0.09);
        border-color: rgba(52, 211, 153, 0.45);
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5), 0 0 15px rgba(16, 185, 129, 0.2);
        transform: translateY(-1px);
      }

      .google-btn svg,
      .google-icon {
        width: clamp(18px, 1.2vw, 20px);
        height: clamp(18px, 1.2vw, 20px);
        flex-shrink: 0;
      }

      /* Divisor OU */
      .divider {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: clamp(10px, 1.3vh, 16px) 0 clamp(12px, 1.5vh, 18px) 0;
        color: #64748b;
        font-size: clamp(11px, 0.8vw, 12px);
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .divider::before,
      .divider::after {
        content: "";
        flex: 1;
        height: 1px;
        background: rgba(255, 255, 255, 0.09);
      }

      .input-wrapper {
        margin-bottom: clamp(10px, 1.4vh, 15px);
        position: relative;
      }

      .input-icon {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        width: clamp(16px, 1.1vw, 19px);
        height: clamp(16px, 1.1vw, 19px);
        color: #64748b;
        transition: color 0.2s ease;
        pointer-events: none;
      }

      .glass-input {
        width: 100%;
        padding: clamp(11px, 1.4vh, 15px) clamp(14px, 1.2vw, 18px) clamp(11px, 1.4vh, 15px) clamp(40px, 2.8vw, 46px);
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 14px;
        color: #ffffff;
        font-size: clamp(13.5px, 1vw, 15.5px);
        outline: none;
        transition: all 0.25s ease;
      }

      .glass-input::placeholder {
        color: #64748b;
        font-weight: 300;
      }

      .glass-input:focus {
        border-color: rgba(16, 185, 129, 0.65);
        background: rgba(255, 255, 255, 0.08);
        box-shadow:
          0 0 0 3px rgba(16, 185, 129, 0.25),
          0 0 20px rgba(16, 185, 129, 0.2);
      }

      .glass-input:focus + .input-icon,
      .input-wrapper:focus-within .input-icon {
        color: #34d399;
      }

      /* Botão Primário com Efeito Glow */
      .glow-btn {
        width: 100%;
        padding: clamp(12px, 1.5vh, 16px) 20px;
        border-radius: 14px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border: 1px solid rgba(52, 211, 153, 0.5);
        border-top: 1px solid rgba(255, 255, 255, 0.4);
        color: #ffffff;
        font-size: clamp(14px, 1vw, 16px);
        font-weight: 700;
        cursor: pointer;
        box-shadow:
          0 4px 20px rgba(16, 185, 129, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.3);
        transition: all 0.3s ease;
        margin-top: clamp(6px, 1vh, 10px);
        position: relative;
        overflow: hidden;
      }

      .glow-btn:hover {
        background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
        border-color: rgba(52, 211, 153, 0.9);
        box-shadow:
          0 6px 30px rgba(16, 185, 129, 0.6),
          0 0 15px rgba(52, 211, 153, 0.4);
        transform: translateY(-1.5px);
      }

      .glow-btn:active {
        transform: translateY(0);
      }

      .toggle-footer {
        margin-top: clamp(12px, 1.6vh, 20px);
        text-align: center;
        font-size: clamp(13px, 0.9vw, 14.5px);
        color: #94a3b8;
      }

      .toggle-link {
        color: #34d399;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        margin-left: 4px;
        transition: color 0.2s;
        background: transparent;
        border: none;
        padding: 0;
        font-size: inherit;
        font-family: inherit;
        display: inline;
      }

      .toggle-link:hover {
        color: #6ee7b7;
        text-decoration: underline;
      }

      .error-box {
        display: none;
        padding: clamp(8px, 1vh, 12px) 14px;
        margin-bottom: 12px;
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.4);
        border-radius: 12px;
        color: #fca5a5;
        font-size: clamp(12.5px, 0.9vw, 13.5px);
      }

      /* ------------------------------------------------------------- */
      /* ADAPTAÇÃO PARA MONITORES DESKTOP E GRANDES RESOLUÇÕES        */
      /* ------------------------------------------------------------- */
      @media (min-width: 1280px) and (min-height: 720px) {
        .glass-container {
          max-width: min(88vw, 1080px);
          min-height: 540px;
        }
      }

      @media (min-width: 1600px) and (min-height: 850px) {
        .glass-container {
          max-width: min(86vw, 1140px);
          min-height: 580px;
        }
        .glow-orb-1 {
          width: 700px;
          height: 700px;
        }
        .glow-orb-2 {
          width: 750px;
          height: 750px;
        }
      }

      @media (min-width: 1920px) and (min-height: 950px) {
        .glass-container {
          max-width: 1200px;
          min-height: 620px;
        }
      }

      /* ------------------------------------------------------------- */
      /* ADAPTAÇÃO RESPONSIVA PARA MOBILE (TELAS < 768px)             */
      /* ------------------------------------------------------------- */
      @media (max-width: 768px) {
        .glass-container {
          min-height: auto;
          max-width: 440px;
          border-radius: 20px;
        }

        .overlay-container {
          display: none;
        }

        .form-panel {
          position: relative;
          width: 100%;
          left: 0;
          transform: none !important;
          padding: 24px 20px;
        }

        .login-panel {
          display: flex;
        }

        .signup-panel {
          display: none;
        }

        .glass-container.right-panel-active .login-panel {
          display: none;
        }

        .glass-container.right-panel-active .signup-panel {
          display: flex;
          opacity: 1;
          pointer-events: auto;
        }

        .mobile-header {
          display: block;
          margin-bottom: 18px;
          text-align: left;
        }

        .mobile-header .brand-badge {
          margin-bottom: 12px;
        }
      }

      @media (min-width: 769px) {
        .mobile-header {
          display: none;
        }
      }
    </style>

  </head>
  <body>
    <!-- Efeitos de Luz e Mesh de Fundo -->
    <div class="ambient-glow">
      <div class="glow-orb glow-orb-1"></div>
      <div class="glow-orb glow-orb-2"></div>
      <div class="glow-orb glow-orb-3"></div>
    </div>
    <div class="bg-grid"></div>

    <!-- Card Principal de Vidro Translúcido com Double Slider 3D -->
    <div class="glass-container" id="glass-container">

      <!-- ========================================================= -->
      <!-- PAINEL 1: FORMULÁRIO DE LOGIN (ENTRAR)                    -->
      <!-- ========================================================= -->
      <div class="form-panel login-panel">
        <div class="mobile-header">
          <div class="brand-badge">
            <svg class="sparkle-icon" viewBox="0 0 24 24">
              <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/>
            </svg>
            EnergivIA
          </div>
        </div>

        <h2 class="form-title">Entrar na Plataforma</h2>
        <p class="form-subtitle">Digite seus dados corporativos ou use o Google</p>

        <div id="error-alert-login" class="error-box"></div>

        <!-- Botão Google -->
        <button type="button" class="google-btn" onclick="loginWithGoogle()">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.43 7.35 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.6H1.25C.45 8.19 0 10.04 0 12s.45 3.81 1.25 5.4l4.03-3.13z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.57 1.25 6.6l4.03 3.13c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          Continuar com o Google
        </button>

        <!-- Divisor OU -->
        <div class="divider">OU COM SEU E-MAIL</div>

        <form id="login-form" onsubmit="handleLoginSubmit(event)">
          <div class="input-wrapper">
            <input
              type="email"
              id="login-email-input"
              class="glass-input"
              placeholder="E-mail corporativo"
              required
            />
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </div>

          <div class="input-wrapper">
            <input
              type="password"
              id="login-password-input"
              class="glass-input"
              placeholder="Sua senha de acesso"
              required
            />
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>

          <button type="submit" id="login-submit-btn" class="glow-btn">
            Entrar
          </button>

          <div class="toggle-footer">
            <span>Ainda não tem conta?</span>
            <button type="button" class="toggle-link" onclick="setMode('signup')">Cadastre-se</button>
          </div>
        </form>
      </div>

      <!-- ========================================================= -->
      <!-- PAINEL 2: FORMULÁRIO DE CADASTRO (CRIAR CONTA)            -->
      <!-- ========================================================= -->
      <div class="form-panel signup-panel">
        <div class="mobile-header">
          <div class="brand-badge">
            <svg class="sparkle-icon" viewBox="0 0 24 24">
              <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/>
            </svg>
            EnergivIA
          </div>
        </div>

        <h2 class="form-title">Criar Conta</h2>
        <p class="form-subtitle">Cadastre-se em segundos ou use o Google</p>

        <div id="error-alert-signup" class="error-box"></div>

        <!-- Botão Google -->
        <button type="button" class="google-btn" onclick="loginWithGoogle()">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.43 7.35 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.6H1.25C.45 8.19 0 10.04 0 12s.45 3.81 1.25 5.4l4.03-3.13z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.57 1.25 6.6l4.03 3.13c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          Continuar com o Google
        </button>

        <!-- Divisor OU -->
        <div class="divider">OU COM SEU E-MAIL</div>

        <form id="signup-form" onsubmit="handleSignupSubmit(event)">
          <div class="input-wrapper">
            <input
              type="email"
              id="signup-email-input"
              class="glass-input"
              placeholder="E-mail corporativo"
              required
            />
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </div>

          <div class="input-wrapper">
            <input
              type="password"
              id="signup-password-input"
              class="glass-input"
              placeholder="Crie uma senha de acesso"
              required
            />
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>

          <button type="submit" id="signup-submit-btn" class="glow-btn">
            Criar Conta Grátis
          </button>

          <div class="toggle-footer">
            <span>Já tem uma conta?</span>
            <button type="button" class="toggle-link" onclick="setMode('login')">Entrar</button>
          </div>
        </form>
      </div>

      <!-- ========================================================= -->
      <!-- PAINEL 3: SLIDING OVERLAY (COBERTURA DESLIZANTE 3D)       -->
      <!-- ========================================================= -->
      <div class="overlay-container">
        <div class="overlay">
          <!-- Visível no Overlay quando em modo Cadastro (posicionado à esquerda) -->
          <div class="overlay-panel overlay-left">
            <div class="brand-badge">
              <svg class="sparkle-icon" viewBox="0 0 24 24">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/>
              </svg>
              EnergivIA
            </div>
            <h1 class="welcome-heading">
              BEM-VINDO <br />
              <span>DE VOLTA!</span>
            </h1>
            <p class="welcome-text">
              Acesse sua conta para gerenciar propostas, dimensionamento inteligente e atendimento comercial via IA.
            </p>
            <div>
              <button type="button" class="pill-toggle-btn" onclick="setMode('login')">
                <span>Já possui conta? Entrar</span>
                <span class="btn-arrow">&rarr;</span>
              </button>
            </div>
          </div>

          <!-- Visível no Overlay quando em modo Login (posicionado à direita) -->
          <div class="overlay-panel overlay-right">
            <div class="brand-badge">
              <svg class="sparkle-icon" viewBox="0 0 24 24">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/>
              </svg>
              EnergivIA
            </div>
            <h1 class="welcome-heading">
              BEM-VINDO <br />
              <span>À ENERGIVIA!</span>
            </h1>
            <p class="welcome-text">
              Crie sua conta em segundos para dimensionar usinas, kits solares e gerar propostas comerciais com IA.
            </p>
            <div>
              <button type="button" class="pill-toggle-btn" onclick="setMode('signup')">
                <span>Novo por aqui? Cadastre-se</span>
                <span class="btn-arrow">&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Lógica de Alternância Interativa e Integração com Auth0 -->
    <script>
      // 1. Decodificação segura da configuração nativa do Auth0 Universal Login
      var config = {};
      try {
        config = JSON.parse(decodeURIComponent(escape(window.atob('@@config@@'))));
      } catch (e) {
        console.warn("Auth0 config preview:", e);
      }

      // 2. Identifica se a URL solicitou modo de cadastro (screen_hint=signup)
      var urlParams = new URLSearchParams(window.location.search);
      var screenHint = urlParams.get("screen_hint") || (config.extraParams && config.extraParams.screen_hint);
      var currentMode = screenHint === "signup" ? "signup" : "login";

      // 3. Inicialização oficial do WebAuth preservando parâmetros originais
      var webAuth = null;
      try {
        if (typeof auth0 !== "undefined" && config.clientID) {
          var params = Object.assign({
            overrides: {
              __tenant: config.auth0Tenant,
              __token_issuer: (config.authorizationServer && config.authorizationServer.issuer) || config.auth0Domain
            },
            domain: config.auth0Domain,
            clientID: config.clientID,
            redirectUri: config.callbackURL,
            responseType: (config.extraParams && config.extraParams.response_type) || "code"
          }, config.internalOptions || {});

          webAuth = new auth0.WebAuth(params);
        }
      } catch (e) {
        console.warn("Auth0 WebAuth fallback local:", e);
      }

      function updateUI() {
        var container = document.getElementById("glass-container");
        var isSignup = currentMode === "signup";

        if (isSignup) {
          container.classList.add("right-panel-active");
        } else {
          container.classList.remove("right-panel-active");
        }

        // Sincroniza e-mail digitado entre formulários para conveniência do usuário
        var loginEmail = document.getElementById("login-email-input");
        var signupEmail = document.getElementById("signup-email-input");
        if (loginEmail && signupEmail) {
          if (isSignup && loginEmail.value && !signupEmail.value) {
            signupEmail.value = loginEmail.value;
          } else if (!isSignup && signupEmail.value && !loginEmail.value) {
            loginEmail.value = signupEmail.value;
          }
        }
      }

      function setMode(mode) {
        // Limpa caixas de erro
        var errLogin = document.getElementById("error-alert-login");
        var errSignup = document.getElementById("error-alert-signup");
        if (errLogin) { errLogin.style.display = "none"; errLogin.innerText = ""; }
        if (errSignup) { errSignup.style.display = "none"; errSignup.innerText = ""; }

        if (mode === "login" || mode === "signup") {
          currentMode = mode;
        } else {
          currentMode = currentMode === "signup" ? "login" : "signup";
        }
        updateUI();
      }

      function toggleMode(targetMode) {
        setMode(targetMode);
      }

      function showError(msg, formMode) {
        var targetId = formMode === "signup" ? "error-alert-signup" : "error-alert-login";
        var el = document.getElementById(targetId);
        if (el) {
          el.innerText = msg;
          el.style.display = "block";
        }
      }

      function handleLoginSubmit(e) {
        if (e && e.preventDefault) e.preventDefault();
        var email = document.getElementById("login-email-input").value;
        var password = document.getElementById("login-password-input").value;
        var submitBtn = document.getElementById("login-submit-btn");

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = "Entrando...";
        }

        function getDbConnection() {
          if (config.databaseConnection) return config.databaseConnection;
          if (config.connections && config.connections.length > 0) {
            var first = config.connections[0];
            return typeof first === "object" && first !== null ? first.name : first;
          }
          return "Username-Password-Authentication";
        }

        var dbConn = getDbConnection();

        if (!webAuth) {
          setTimeout(function() {
            alert("Login simulado para: " + email);
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerText = "Entrar";
            }
          }, 800);
          return;
        }

        webAuth.login({
          realm: dbConn,
          username: email,
          password: password
        }, function(err) {
          if (err) {
            showError(err.description || err.message || "E-mail ou senha incorretos.", "login");
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerText = "Entrar";
            }
          }
        });
      }

      function handleSignupSubmit(e) {
        if (e && e.preventDefault) e.preventDefault();
        var email = document.getElementById("signup-email-input").value;
        var password = document.getElementById("signup-password-input").value;
        var submitBtn = document.getElementById("signup-submit-btn");

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = "Criando conta...";
        }

        function getDbConnection() {
          if (config.databaseConnection) return config.databaseConnection;
          if (config.connections && config.connections.length > 0) {
            var first = config.connections[0];
            return typeof first === "object" && first !== null ? first.name : first;
          }
          return "Username-Password-Authentication";
        }

        var dbConn = getDbConnection();

        if (!webAuth) {
          setTimeout(function() {
            alert("Cadastro simulado para: " + email);
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerText = "Criar Conta Grátis";
            }
          }, 800);
          return;
        }

        webAuth.signup({
          connection: dbConn,
          email: email,
          password: password
        }, function(err) {
          if (err) {
            showError(err.description || err.message || "Erro ao realizar cadastro.", "signup");
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerText = "Criar Conta Grátis";
            }
            return;
          }
          // Realiza login imediato após cadastro
          webAuth.login({
            realm: dbConn,
            username: email,
            password: password
          }, function(loginErr) {
            if (loginErr) {
              showError(loginErr.description || "Cadastro concluído. Efetue login para continuar.", "signup");
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = "Criar Conta Grátis";
              }
            }
          });
        });
      }

      function loginWithGoogle() {
        if (webAuth && typeof webAuth.authorize === "function") {
          webAuth.authorize({
            connection: "google-oauth2"
          });
        } else {
          var loc = window.location;
          var sep = loc.search ? "&" : "?";
          window.location.href = loc.pathname + loc.search + sep + "connection=google-oauth2";
        }
      }

      // Inicializa no modo solicitado
      updateUI();
    </script>

  </body>
</html>
`
