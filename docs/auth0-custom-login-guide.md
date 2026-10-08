# Guia: Como Atualizar a Tela de Login e Cadastro no Auth0 com Efeitos de Glassmorphism

Este guia contém o código e o passo a passo completo para transformar a tela oficial de login e cadastro do Auth0 (`https://dev-g3g2vs8yakmcj275.us.auth0.com/u/login`) no visual **Glassy Form V2** da EnergivIA: 100% em português, com efeitos de luzes dinâmicas, vidro fosco translúcido (_glassmorphism_), reflexo chanfrado e brilho neon nos botões.

---

## Como Aplicar no Dashboard do Auth0

1. Acesse o [Dashboard do Auth0](https://manage.auth0.com).
2. No menu lateral esquerdo, navegue até **Branding** &rarr; **Universal Login**.
3. Clique na aba **Advanced Options** (ou no rodapé da página em **Advanced Settings**).
4. Selecione a aba **Login**.
5. Ative a chave **Customize Login Page** (Personalizar Página de Login).
6. Substitua todo o conteúdo pelo código HTML/CSS abaixo.
7. Clique no botão **Save** no canto superior direito.

---

## Código Completo (HTML + CSS + Efeitos + Integração Auth0)

Copie e cole o código abaixo na aba **Login** do Auth0:

```html
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
    <!-- SDK Oficial do Auth0 para processar Login e Cadastro com segurança -->
    <script src="https://cdn.auth0.com/js/auth0/9.19/auth0.min.js"></script>

    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family:
          "Plus Jakarta Sans",
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          Roboto,
          sans-serif;
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
        background: radial-gradient(
          circle,
          #10b981 0%,
          rgba(16, 185, 129, 0.05) 70%,
          transparent 100%
        );
      }

      .glow-orb-2 {
        bottom: -15%;
        right: 15%;
        width: 600px;
        height: 600px;
        background: radial-gradient(
          circle,
          #059669 0%,
          rgba(20, 184, 166, 0.08) 65%,
          transparent 100%
        );
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

      /* Malha de Fundo 3D Poligonal */
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
        background-size:
          32px 32px,
          64px 64px,
          64px 64px;
      }

      /* ------------------------------------------------------------- */
      /* CARD MASTER GLASSMORPHISM (VIDRO FUMÊ TRANSLÚCIDO)            */
      /* ------------------------------------------------------------- */
      .glass-container {
        position: relative;
        z-index: 10;
        width: 100%;
        max-width: 900px;
        border-radius: 32px;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%),
          rgba(6, 11, 20, 0.78);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-top: 1px solid rgba(255, 255, 255, 0.35); /* Chanfro de luz especular superior */
        backdrop-filter: blur(28px) saturate(190%);
        -webkit-backdrop-filter: blur(28px) saturate(190%);
        box-shadow:
          0 35px 80px -15px rgba(0, 0, 0, 0.95),
          0 0 50px rgba(16, 185, 129, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.25);
        display: grid;
        grid-template-columns: 5fr 7fr;
        overflow: hidden;
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @media (max-width: 768px) {
        .glass-container {
          grid-template-columns: 1fr;
          max-width: 480px;
        }
      }

      /* Coluna Esquerda: Apresentação e Boas-Vindas */
      .left-col {
        padding: 44px 38px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        border-right: 1px solid rgba(255, 255, 255, 0.08);
        background: linear-gradient(
          145deg,
          rgba(255, 255, 255, 0.04) 0%,
          rgba(16, 185, 129, 0.02) 100%
        );
        position: relative;
      }

      @media (max-width: 768px) {
        .left-col {
          border-right: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 32px 28px;
        }
      }

      .brand-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #34d399;
        background: rgba(6, 78, 59, 0.45);
        border: 1px solid rgba(16, 185, 129, 0.4);
        box-shadow: 0 0 20px rgba(16, 185, 129, 0.25);
        width: fit-content;
      }

      .sparkle-icon {
        width: 13px;
        height: 13px;
        fill: #34d399;
      }

      .welcome-heading {
        font-size: 36px;
        font-weight: 800;
        line-height: 1.15;
        margin-top: 28px;
        letter-spacing: -0.02em;
        color: #ffffff;
      }

      .welcome-heading span {
        background: linear-gradient(to right, #34d399, #2dd4bf, #ffffff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .welcome-text {
        font-size: 14px;
        color: #94a3b8;
        margin-top: 14px;
        line-height: 1.65;
        font-weight: 300;
      }

      .pill-toggle-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.18);
        color: #ffffff;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.25s ease;
        margin-top: 28px;
        width: fit-content;
      }

      .pill-toggle-btn:hover {
        background: rgba(16, 185, 129, 0.18);
        border-color: rgba(16, 185, 129, 0.6);
        box-shadow: 0 0 25px rgba(16, 185, 129, 0.3);
        transform: translateY(-1px);
      }

      /* Coluna Direita: Formulário de Ação */
      .right-col {
        padding: 44px 40px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
      }

      @media (max-width: 768px) {
        .right-col {
          padding: 32px 24px;
        }
      }

      .form-title {
        font-size: 28px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: -0.02em;
      }

      .form-subtitle {
        font-size: 13px;
        color: #94a3b8;
        margin-top: 4px;
        margin-bottom: 24px;
        font-weight: 300;
      }

      .input-wrapper {
        margin-bottom: 14px;
        position: relative;
      }

      .input-icon {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        width: 17px;
        height: 17px;
        color: #64748b;
        transition: color 0.2s ease;
        pointer-events: none;
      }

      .glass-input {
        width: 100%;
        padding: 13px 16px 13px 42px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 14px;
        color: #ffffff;
        font-size: 14px;
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

      /* Botão Primário de Ação com Efeito Shimmer e Neon Glow */
      .glow-btn {
        width: 100%;
        padding: 14px;
        border-radius: 14px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border: 1px solid rgba(52, 211, 153, 0.5);
        border-top: 1px solid rgba(255, 255, 255, 0.4);
        color: #ffffff;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        box-shadow:
          0 4px 20px rgba(16, 185, 129, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.3);
        transition: all 0.3s ease;
        margin-top: 10px;
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

      /* Divisor OU */
      .divider {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 18px 0;
        color: #64748b;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.05em;
      }

      .divider::before,
      .divider::after {
        content: "";
        flex: 1;
        height: 1px;
        background: rgba(255, 255, 255, 0.08);
      }

      /* Botão Google em Vidro Escuro */
      .google-btn {
        width: 100%;
        padding: 12px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #ffffff;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        cursor: pointer;
        transition: all 0.25s ease;
      }

      .google-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.25);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      }

      .toggle-footer {
        margin-top: 18px;
        text-align: center;
        font-size: 13px;
        color: #94a3b8;
      }

      .toggle-link {
        color: #34d399;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        margin-left: 4px;
        transition: color 0.2s;
      }

      .toggle-link:hover {
        color: #6ee7b7;
        text-decoration: underline;
      }

      .error-box {
        display: none;
        padding: 10px 14px;
        margin-bottom: 14px;
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.4);
        border-radius: 10px;
        color: #fca5a5;
        font-size: 13px;
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

    <!-- Card Principal de Vidro Translúcido -->
    <div class="glass-container">
      <!-- Coluna Esquerda -->
      <div class="left-col">
        <div>
          <div class="brand-badge">
            <svg class="sparkle-icon" viewBox="0 0 24 24">
              <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
            </svg>
            EnergivIA
          </div>
          <h1 id="welcome-title" class="welcome-heading">
            BEM-VINDO <br />
            <span>DE VOLTA!</span>
          </h1>
          <p id="welcome-desc" class="welcome-text">
            Acesse sua conta para gerenciar propostas, dimensionamento inteligente e atendimento
            comercial via IA.
          </p>
        </div>

        <div>
          <button type="button" id="pill-toggle" class="pill-toggle-btn">
            <span id="pill-text">Já possui conta? Entrar</span> &rarr;
          </button>
        </div>
      </div>

      <!-- Coluna Direita (Formulário) -->
      <div class="right-col">
        <h2 id="form-heading" class="form-title">Criar Conta</h2>
        <p id="form-subheading" class="form-subtitle">
          Preencha seus dados corporativos para começar
        </p>

        <div id="error-alert" class="error-box"></div>

        <form id="auth-form" onsubmit="handleAuthSubmit(event)">
          <!-- Campo Nome (visível no cadastro) -->
          <div id="name-field-group" class="input-wrapper">
            <input type="text" id="name-input" class="glass-input" placeholder="Nome completo" />
            <svg
              class="input-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>

          <!-- Campo E-mail -->
          <div class="input-wrapper">
            <input
              type="email"
              id="email-input"
              class="glass-input"
              placeholder="E-mail corporativo"
              required
            />
            <svg
              class="input-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
              ></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </div>

          <!-- Campo Senha -->
          <div class="input-wrapper">
            <input
              type="password"
              id="password-input"
              class="glass-input"
              placeholder="Sua senha de acesso"
              required
            />
            <svg
              class="input-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>

          <!-- Botão Primário com Glow -->
          <button type="submit" id="submit-btn" class="glow-btn">Criar Conta Grátis</button>

          <!-- Divisor -->
          <div class="divider">OU</div>

          <!-- Botão Social Google -->
          <button type="button" class="google-btn" onclick="loginWithGoogle()">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.43 7.35 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.6H1.25C.45 8.19 0 10.04 0 12s.45 3.81 1.25 5.4l4.03-3.13z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.57 1.25 6.6l4.03 3.13c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            Continuar com o Google
          </button>

          <!-- Alternador inferior -->
          <div class="toggle-footer">
            <span id="footer-text">Já tem uma conta?</span>
            <a id="footer-toggle" class="toggle-link" onclick="toggleMode()">Entrar</a>
          </div>
        </form>
      </div>
    </div>

    <!-- Lógica de Alternância Interativa e Integração com Auth0 -->
    <script>
      // Identifica se a URL solicitou modo de cadastro (screen_hint=signup)
      var urlParams = new URLSearchParams(window.location.search);
      var currentMode = urlParams.get("screen_hint") === "signup" ? "signup" : "login";

      // Configuração nativa do Auth0 (injetada automaticamente pelo Auth0 Universal Login)
      var config = typeof @@config@@ !== "undefined" ? @@config@@ : {};
      var webAuth = null;

      try {
        if (typeof auth0 !== "undefined" && config.clientID) {
          webAuth = new auth0.WebAuth({
            domain: config.auth0Domain,
            clientID: config.clientID,
            redirectUri: config.callbackURL,
            responseType: "code",
            params: config.extraParams
          });
        }
      } catch (e) {
        console.warn("Auth0 WebAuth fallback local:", e);
      }

      function updateUI() {
        var isSignup = currentMode === "signup";
        var nameGroup = document.getElementById("name-field-group");
        var nameInput = document.getElementById("name-input");
        var welcomeTitle = document.getElementById("welcome-title");
        var welcomeDesc = document.getElementById("welcome-desc");
        var pillText = document.getElementById("pill-text");
        var formHeading = document.getElementById("form-heading");
        var formSubheading = document.getElementById("form-subheading");
        var submitBtn = document.getElementById("submit-btn");
        var footerText = document.getElementById("footer-text");
        var footerToggle = document.getElementById("footer-toggle");

        if (isSignup) {
          nameGroup.style.display = "block";
          nameInput.required = true;
          welcomeTitle.innerHTML = 'BEM-VINDO <br /><span>DE VOLTA!</span>';
          welcomeDesc.innerText = 'Acesse sua conta para gerenciar propostas, dimensionamento e clientes.';
          pillText.innerText = 'Já possui conta? Entrar';
          formHeading.innerText = 'Criar Conta';
          formSubheading.innerText = 'Preencha seus dados corporativos para começar';
          submitBtn.innerText = 'Criar Conta Grátis';
          footerText.innerText = 'Já tem uma conta?';
          footerToggle.innerText = 'Entrar';
        } else {
          nameGroup.style.display = "none";
          nameInput.required = false;
          welcomeTitle.innerHTML = 'COMECE <br /><span>AGORA!</span>';
          welcomeDesc.innerText = 'Crie sua conta em segundos e gere suas primeiras propostas comerciais com IA.';
          pillText.innerText = 'Novo por aqui? Cadastre-se';
          formHeading.innerText = 'Entrar na Plataforma';
          formSubheading.innerText = 'Digite suas credenciais de acesso corporativo';
          submitBtn.innerText = 'Entrar';
          footerText.innerText = 'Ainda não tem conta?';
          footerToggle.innerText = 'Cadastre-se';
        }
      }

      function toggleMode() {
        currentMode = currentMode === "signup" ? "login" : "signup";
        updateUI();
      }

      document.getElementById("pill-toggle").addEventListener("click", toggleMode);

      function showError(msg) {
        var el = document.getElementById("error-alert");
        el.innerText = msg;
        el.style.display = "block";
      }

      function handleAuthSubmit(e) {
        e.preventDefault();
        var email = document.getElementById("email-input").value;
        var password = document.getElementById("password-input").value;
        var submitBtn = document.getElementById("submit-btn");

        submitBtn.disabled = true;
        submitBtn.innerText = "Processando...";

        if (!webAuth) {
          // Ambiente de teste/preview
          setTimeout(function() {
            alert((currentMode === "signup" ? "Cadastro" : "Login") + " simulado com sucesso para: " + email);
            submitBtn.disabled = false;
            updateUI();
          }, 800);
          return;
        }

        if (currentMode === "signup") {
          var name = document.getElementById("name-input").value;
          webAuth.signup({
            connection: "Username-Password-Authentication",
            email: email,
            password: password,
            user_metadata: { name: name }
          }, function(err) {
            if (err) {
              showError(err.description || err.message || "Erro ao realizar cadastro.");
              submitBtn.disabled = false;
              updateUI();
              return;
            }
            // Realiza login imediato após cadastro
            webAuth.login({
              realm: "Username-Password-Authentication",
              username: email,
              password: password
            }, function(loginErr) {
              if (loginErr) {
                showError(loginErr.description || "Cadastro concluído. Efetue login para continuar.");
                submitBtn.disabled = false;
                updateUI();
              }
            });
          });
        } else {
          webAuth.login({
            realm: "Username-Password-Authentication",
            username: email,
            password: password
          }, function(err) {
            if (err) {
              showError(err.description || err.message || "E-mail ou senha incorretos.");
              submitBtn.disabled = false;
              updateUI();
            }
          });
        }
      }

      function loginWithGoogle() {
        if (webAuth) {
          webAuth.authorize({ connection: "google-oauth2" });
        } else {
          alert("Login social com Google acionado.");
        }
      }

      // Inicializa na renderização
      updateUI();
    </script>
  </body>
</html>
```

---

## O que Mudou Neste Template:

1. **100% em Português:** Todos os textos, botões, placeholders, alertas e links foram traduzidos e adaptados ao tom corporativo da EnergivIA.
2. **Efeitos Visuais Aprimorados ("e efeito"):**
   - **Orbes Dinâmicos de Luz (Ambient Glow):** Luzes esmeralda e teal pulsando em loop no fundo.
   - **Vidro Fosco Real (Glassmorphism):** Desfoque de 28px, chanfro superior translúcido com reflexo branco e sombra esmeralda difusa.
   - **Botões com Glow Neon:** Botão principal esmeralda com brilho neon `box-shadow` e hover iluminado.
   - **Microinterações nos Inputs:** Ícones SVG que acendem em verde quando o campo recebe foco, anel de luz verde e fundo translúcido.
   - **Transição Fluida (Login &harr; Cadastro):** Alternância instantânea no mesmo card com JavaScript, alternando os títulos e campos sem recarregar a tela.
   - **Integração Auth0 Real:** Pronto com `auth0.WebAuth` para autenticar credenciais e Google de verdade no painel.
