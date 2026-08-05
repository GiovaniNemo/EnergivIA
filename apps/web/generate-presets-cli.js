const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const STORAGE_DIR = path.join(os.tmpdir(), "energivia-thumbnail-render-sessions");
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

function signThumbnailPayload(encodedPayload) {
  const secret =
    process.env.THUMBNAIL_RENDER_SECRET ||
    process.env.AUTH0_SECRET ||
    "dev-thumbnail-render-secret";
  return crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function setThumbnailRenderSession(id, payload) {
  const session = {
    title: payload.title,
    documentState: payload.documentState,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
  fs.writeFileSync(path.join(STORAGE_DIR, `${id}.json`), JSON.stringify(session), "utf8");
}

function extractPresets() {
  const utilsContent = fs.readFileSync(
    path.join(__dirname, "src", "components", "proposals", "editor", "utils.ts"),
    "utf8"
  );
  let extracted = utilsContent
    .split("export const BUILTIN_TEMPLATE_PRESETS: TemplatePreset[] = [")[1]
    .split("];")[0];

  // This is a naive regex parsing since we don't have TS compiler handy
  // Better yet, we can execute esbuild in memory or compile it!
}

// Since parsing utils.ts is hard, let's just compile it with esbuild!
// wait, I can just use ts-node or run next dev
