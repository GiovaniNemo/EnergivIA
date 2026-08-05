const fs = require("fs");
const path = require("path");
const os = require("os");
const puppeteer = require("puppeteer");
const crypto = require("crypto");

async function run() {
  const STORAGE_DIR = path.join(os.tmpdir(), "energivia-thumbnail-render-sessions");
  if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

  const publicPresetsDir = path.join(__dirname, "public", "presets");
  if (!fs.existsSync(publicPresetsDir)) fs.mkdirSync(publicPresetsDir, { recursive: true });

  console.log("Launching puppeteer...");
  const browser = await puppeteer.launch({ headless: true });

  function sign(payload) {
    const rawSecret =
      process.env.THUMBNAIL_RENDER_SECRET ||
      process.env.AUTH0_SECRET ||
      "dev-thumbnail-render-secret";
    return crypto.createHmac("sha256", rawSecret).update(payload).digest("base64url");
  }

  const baseStyles = {
    branding: {
      logoUrl: "",
      primaryColor: "#22C55E",
      secondaryColor: "#16A34A",
      backgroundColor: "#0B1220",
      textColor: "#E5E7EB",
    },
    typography: {
      fontFamily: "Inter",
      titleSize: 30,
      subtitleSize: 20,
      bodySize: 14,
      preset: "medium",
    },
    layout: { pageWidth: "medium", spacing: "normal", borderRadius: 16, shadowIntensity: 4 },
    cover: {
      imageUrl: "",
      overlayColor: "",
      overlayOpacity: 0,
      titleText: "Proposta",
      showLogo: true,
    },
    footer: { companyName: "Solar Energy Co.", contactInfo: "", showPageNumbers: true },
  };

  const presets = [
    {
      id: "residential",
      name: "Solar Residencial",
      sections: [
        "cover",
        "introduction",
        "about_company",
        "solution",
        "pricing",
        "testimonials",
        "signature",
      ],
    },
    {
      id: "commercial",
      name: "Solar Comercial",
      sections: [
        "cover",
        "introduction",
        "diagnostic_energy",
        "solution",
        "pricing",
        "custom",
        "signature",
      ],
    },
    {
      id: "financing",
      name: "Proposta com Financiamento",
      sections: ["cover", "introduction", "diagnostic_energy", "financing", "pricing", "signature"],
    },
    {
      id: "premium",
      name: "Proposta Premium",
      sections: [
        "cover",
        "introduction",
        "about_company",
        "solution",
        "generation_consumption",
        "pricing",
        "signature",
      ],
    },
  ];

  for (const preset of presets) {
    console.log("Capturing", preset.name);
    const payload = {
      sections: preset.sections.map((t, i) => ({
        id: `id${i}`,
        type: t,
        variant: t === "cover" ? "full-image" : "default",
        title: t.toUpperCase(),
        hidden: false,
        content: "<p>Sample</p>",
        fields: {},
      })),
      styles: { ...baseStyles, cover: { ...baseStyles.cover, titleText: preset.name } },
      variables: {},
    };

    const id = crypto.randomUUID();
    const session = {
      title: preset.name,
      documentState: payload,
      expiresAt: Date.now() + 1000 * 60 * 10,
    };
    fs.writeFileSync(path.join(STORAGE_DIR, `${id}.json`), JSON.stringify(session), "utf8");

    const sig = sign(id);
    const url = `http://localhost:3000/internal/template-thumbnail?id=${id}&sig=${sig}`;

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1800, deviceScaleFactor: 1 });
    console.log("Going to", url);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });

    try {
      await page.waitForSelector("[data-preview-capture-target='true']", { timeout: 15000 });
      const el = await page.$("[data-preview-capture-target='true']");
      const box = await el.boundingBox();
      const clipHeight = Math.min(box.height, box.width * Math.sqrt(2));
      const buf = await page.screenshot({
        type: "jpeg",
        clip: { x: box.x, y: box.y, width: box.width, height: clipHeight },
        quality: 80,
      });
      fs.writeFileSync(path.join(publicPresetsDir, `${preset.id}.jpg`), buf);
      console.log("Saved", preset.id + ".jpg");
    } catch (e) {
      console.log("Error capturing", preset.id, e.message);
    }
  }

  await browser.close();
  console.log("Done");
}

run().catch(console.error);
