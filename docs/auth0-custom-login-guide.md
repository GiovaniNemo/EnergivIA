# Guia: Como Atualizar a Tela de Login e Cadastro no Auth0 com Glassmorphism V2

Este guia explica como replicar a interface **Glassy Login Form V2** (vidro fumê translúcido com fundo geométrico 3D) dentro do **Auth0 Universal Login**.

---

## Cenário 1: Usando o Formulário no Próprio Next.js (Recomendado)

A aplicação EnergivIA já conta com a tela completa em `/login` com o componente `GlassyAuthCard`:

- **Vantagens:** 100% responsivo, animações instantâneas com Framer Motion, sem limitações de CSS do painel Auth0.
- **Como funciona o fluxo:**
  1. O visitante acessa `/login` (ou a seção de cadastro na Landing Page).
  2. Ele preenche o e-mail/senha ou clica em **Sign In / Sign Up**.
  3. A aplicação direciona para `/auth/login?screen_hint=signup` para processar a sessão com segurança bancária.

---

## Cenário 2: Customizando Diretamente Dentro do Painel do Auth0

Se você quiser que a página hospedada pelo próprio Auth0 (`https://seu-tenant.us.auth0.com`) tenha esse visual:

### Passo a Passo no Dashboard do Auth0:

1. Acesse o [Dashboard do Auth0](https://manage.auth0.com).
2. No menu lateral esquerdo, navegue até **Branding** → **Universal Login**.
3. Na aba **Settings**, você tem duas opções de experiência:
   - **New Universal Login:** Permite configurar Logo, Cor Primária (`#10b981`), Cor de Fundo (`#02040a`) e Imagem de Fundo (Background Image).
   - **Classic Universal Login (Recomendado para Custom HTML Total):** Permite colar código HTML e CSS 100% sob medida.

### Para Inserir o Template HTML Customizado no Classic Universal Login:

1. Vá em **Branding** → **Universal Login** → **Advanced Options**.
2. Clique na aba **Login**.
3. Ative a chave **Customize Login Page**.
4. No campo **Default Templates**, você pode selecionar _Lock_ ou _Custom Login Form_.
5. Cole o código HTML/CSS abaixo que utiliza o mesmo design de Glassmorphism:

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Acesso e Cadastro | EnergivIA</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;700;800&display=swap"
      rel="stylesheet"
    />
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: "Plus Jakarta Sans", sans-serif;
      }
      body {
        background-color: #02040a;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        color: #ffffff;
        overflow-x: hidden;
        position: relative;
      }
      /* 3D Geometric Polygonal Background */
      .bg-mesh {
        position: absolute;
        inset: 0;
        z-index: 0;
        opacity: 0.35;
        background:
          radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 60%),
          repeating-linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.015) 0px,
            rgba(255, 255, 255, 0.015) 20px,
            transparent 20px,
            transparent 40px
          ),
          repeating-linear-gradient(
            -45deg,
            rgba(0, 0, 0, 0.4) 0px,
            rgba(0, 0, 0, 0.4) 20px,
            transparent 20px,
            transparent 40px
          );
      }
      /* Main Floating Glass Card */
      .glass-card {
        position: relative;
        z-index: 10;
        width: 100%;
        max-width: 860px;
        border-radius: 32px;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%),
          rgba(8, 14, 26, 0.72);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-top: 1px solid rgba(255, 255, 255, 0.28);
        backdrop-filter: blur(28px) saturate(180%);
        -webkit-backdrop-filter: blur(28px) saturate(180%);
        box-shadow:
          0 30px 80px -15px rgba(0, 0, 0, 0.9),
          inset 0 1px 1px 0 rgba(255, 255, 255, 0.2);
        display: grid;
        grid-template-columns: 5fr 7fr;
        overflow: hidden;
      }
      @media (max-width: 768px) {
        .glass-card {
          grid-template-columns: 1fr;
        }
      }
      /* Left Welcome Column */
      .left-col {
        padding: 40px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        border-right: 1px solid rgba(255, 255, 255, 0.1);
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), transparent);
      }
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 6px 14px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #6ee7b7;
        background: rgba(6, 78, 59, 0.4);
        border: 1px solid rgba(16, 185, 129, 0.3);
        width: fit-content;
      }
      .welcome-title {
        font-size: 34px;
        font-weight: 800;
        line-height: 1.15;
        margin-top: 24px;
      }
      .welcome-title span {
        background: linear-gradient(to right, #6ee7b7, #5eead4, #ffffff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .welcome-desc {
        font-size: 14px;
        color: #94a3b8;
        margin-top: 14px;
        line-height: 1.6;
        font-weight: 300;
      }
      .pill-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #ffffff;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.25s;
      }
      .pill-btn:hover {
        background: rgba(16, 185, 129, 0.15);
        border-color: rgba(16, 185, 129, 0.5);
      }
      /* Right Form Column */
      .right-col {
        padding: 40px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .form-title {
        font-size: 26px;
        font-weight: 700;
        margin-bottom: 6px;
      }
      .form-subtitle {
        font-size: 13px;
        color: #94a3b8;
        margin-bottom: 24px;
        font-weight: 300;
      }
      .input-group {
        margin-bottom: 16px;
        position: relative;
      }
      .input-field {
        width: 100%;
        padding: 14px 16px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        color: #ffffff;
        font-size: 14px;
        outline: none;
        transition: all 0.25s;
      }
      .input-field:focus {
        border-color: rgba(16, 185, 129, 0.5);
        background: rgba(255, 255, 255, 0.08);
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
      }
      .submit-btn {
        width: 100%;
        padding: 14px;
        border-radius: 12px;
        background: linear-gradient(
          135deg,
          rgba(16, 185, 129, 0.3) 0%,
          rgba(20, 184, 166, 0.25) 100%
        );
        border: 1px solid rgba(16, 185, 129, 0.4);
        color: #ffffff;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(16, 185, 129, 0.2);
        transition: all 0.3s;
        margin-top: 8px;
      }
      .submit-btn:hover {
        background: linear-gradient(
          135deg,
          rgba(16, 185, 129, 0.45) 0%,
          rgba(20, 184, 166, 0.35) 100%
        );
        border-color: rgba(16, 185, 129, 0.8);
        box-shadow: 0 6px 28px rgba(16, 185, 129, 0.35);
      }
    </style>
  </head>
  <body>
    <div class="bg-mesh"></div>

    <div class="glass-card">
      <div class="left-col">
        <div>
          <div class="badge">EnergivIA</div>
          <h1 class="welcome-title">WELCOME <br /><span>BACK!</span></h1>
          <p class="welcome-desc">
            Acesse sua conta para gerenciar dimensionamentos, kits solares e propostas comerciais
            completas.
          </p>
        </div>
        <div style="margin-top: 30px;">
          <a href="#" class="pill-btn">Sign In &rarr;</a>
        </div>
      </div>

      <div class="right-col">
        <h2 class="form-title">Create Account</h2>
        <p class="form-subtitle">Preencha seus dados corporativos para continuar</p>

        <form id="auth-form">
          <div class="input-group">
            <input type="text" class="input-field" placeholder="Full Name" required />
          </div>
          <div class="input-group">
            <input type="email" class="input-field" placeholder="Work Email" required />
          </div>
          <div class="input-group">
            <input type="password" class="input-field" placeholder="Create Password" required />
          </div>
          <button type="submit" class="submit-btn">Sign Up</button>
        </form>
      </div>
    </div>
  </body>
</html>
```

6. Clique no botão **Save** no canto superior direito do Auth0.
