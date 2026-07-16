# Auth0 setup for Energivia (Next.js)

**Login não funciona?** O arquivo `apps/web/.env.local` precisa ter valores **reais** do Auth0, não os placeholders `YOUR_TENANT`, `YOUR_CLIENT_ID` ou `YOUR_CLIENT_SECRET`. Siga os passos abaixo e depois reinicie o servidor (`pnpm dev`).

---

## 1. Create an Auth0 account and application

1. Go to [Auth0 Dashboard](https://manage.auth0.com/) and sign in (or create a free account).
2. In the sidebar: **Applications** → **Applications** → **Create Application**.
3. Choose **Regular Web Application** → **Create**.
4. Open your new application. You’ll need:
   - **Domain** (e.g. `dev-xxxx.us.auth0.com`)
   - **Client ID**
   - **Client Secret** (click “Reveal” if needed)

## 2. Configure URLs in Auth0

In the same application, open the **Settings** tab and set:

| Field | Value |
|-------|--------|
| **Application Type** | Regular Web Application |
| **Allowed Callback URLs** | `http://localhost:3000/auth/callback` |
| **Allowed Logout URLs** | `http://localhost:3000` |
| **Allowed Web Origins** | `http://localhost:3000` (optional, for CORS) |

Click **Save Changes**.

## 3. Create `.env.local` in `apps/web`

From the project root:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local` and set:

```env
# Already in .env.example – keep or change if needed
NEXT_PUBLIC_API_URL="http://localhost:4000/api"

# Auth0 – replace with your Auth0 application values
AUTH0_SECRET="<generate with: openssl rand -hex 32>"
APP_BASE_URL="http://localhost:3000"
AUTH0_DOMAIN="YOUR_TENANT.us.auth0.com"
AUTH0_CLIENT_ID="your_client_id_from_dashboard"
AUTH0_CLIENT_SECRET="your_client_secret_from_dashboard"
```

### Generate `AUTH0_SECRET`

In a terminal:

```bash
openssl rand -hex 32
```

Paste the output as the value of `AUTH0_SECRET` in `.env.local`.

## 4. Restart the dev server

After saving `.env.local`:

```bash
pnpm dev:web
# or from repo root: pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000), go to **Login** and click **Entrar com Auth0**. You should be redirected to Auth0 and back to the dashboard after signing in.

---

## Production (later)

When you deploy (e.g. `https://app.energivia.com`):

1. In Auth0, add to the same application (comma-separated or one per line, depending on UI):
   - **Allowed Callback URLs:** `https://app.energivia.com/auth/callback`
   - **Allowed Logout URLs:** `https://app.energivia.com`
   - **Allowed Web Origins:** `https://app.energivia.com`
2. In your hosting env (e.g. Vercel), set:
   - `AUTH0_DOMAIN`
   - `AUTH0_CLIENT_ID`
   - `AUTH0_CLIENT_SECRET`
   - `AUTH0_SECRET` (same or new 32-byte hex secret)
   - `APP_BASE_URL=https://app.energivia.com`

---

## Troubleshooting

**Login still not working? Do this in order:**

1. **Auth0 Dashboard → Applications → your app → Settings**
   - **Allowed Callback URLs:** add exactly `http://localhost:3000/auth/callback` (no trailing slash, no space).
   - **Allowed Logout URLs:** add exactly `http://localhost:3000`.
   - Click **Save Changes**.

2. **Restart the dev server**  
   Stop it (Ctrl+C) and run `pnpm dev` or `pnpm dev:web` again so `.env.local` is reloaded.

3. **Try in an incognito/private window**  
   Rules out old cookies or session conflicts.

4. **Check the error**  
   - After clicking “Entrar com Auth0”, do you get to the Auth0 login screen? If not, the app may not be redirecting (check browser console).
   - After logging in at Auth0, do you see “Callback URL mismatch” or “invalid callback”? Then the URL in Auth0 must match exactly `http://localhost:3000/auth/callback`.

**Redirects to a broken or wrong Auth0 URL**

- In `apps/web/.env.local` use your real values (no placeholders) and restart the dev server.

**Application type**

- The Auth0 application must be **Regular Web Application**, not SPA or M2M.

**"An error occurred during the authorization flow"**

This happens when `AUTH0_AUDIENCE` is set but Auth0 is not configured for that API:

1. **Create an API in Auth0** (required when using `AUTH0_AUDIENCE`):
   - Go to **Applications** → **APIs** → **Create API**.
   - Name: e.g. `Solar Link API`.
   - **Identifier**: must match `.env.local` exactly, e.g. `http://localhost:4000/api`.
   - Save.

2. **Authorize your Application to use the API**:
   - Go to **Applications** → **Applications** → your app.
   - Open the **APIs** (or **Authorized APIs**) tab.
   - Authorize the API you created so the login flow can request an access token.

3. **Temporary workaround** (login without API access): comment out or remove `AUTH0_AUDIENCE` in `.env.local`, restart the dev server. Login will work with only OpenID profile/email; the backend will not receive Auth0 access tokens until the API is set up and `AUTH0_AUDIENCE` is set again.
