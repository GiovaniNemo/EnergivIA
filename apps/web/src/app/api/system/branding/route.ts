import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const configPath = path.join(process.cwd(), "src/config/branding.json");

function readConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading branding config:", err);
  }
  return { brandLogoUrl: "", whatsappLogoUrl: "" };
}

export async function GET() {
  const config = readConfig();
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config = {
      brandLogoUrl: body.brandLogoUrl || "",
      whatsappLogoUrl: body.whatsappLogoUrl || "",
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
    return NextResponse.json({ success: true, config });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to save branding config" },
      { status: 500 }
    );
  }
}
