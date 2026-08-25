import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function getConfigPath() {
  const path1 = path.join(process.cwd(), "apps/web/src/config/branding.json");
  const path2 = path.join(process.cwd(), "src/config/branding.json");
  if (fs.existsSync(path.dirname(path1))) {
    return path1;
  }
  return path2;
}

// Read ONCE at startup/module load to prevent overwriting in-memory updates with empty files
let memoryConfig = {
  brandLogoUrl: "",
  whatsappLogoUrl: "",
};

try {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content);
    memoryConfig = {
      brandLogoUrl: parsed.brandLogoUrl || "",
      whatsappLogoUrl: parsed.whatsappLogoUrl || "",
    };
  }
} catch (err) {
  console.error("Error reading branding config at startup:", err);
}

export async function GET() {
  return NextResponse.json(memoryConfig);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config = {
      brandLogoUrl: body.brandLogoUrl || "",
      whatsappLogoUrl: body.whatsappLogoUrl || "",
    };

    // Update memory config immediately
    memoryConfig = config;

    // Try writing to file system
    try {
      const configPath = getConfigPath();
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
    } catch (fsError) {
      console.warn("Could not persist branding config to file system, kept in memory:", fsError);
    }

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error("Error in branding POST route:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process branding settings" },
      { status: 500 }
    );
  }
}
