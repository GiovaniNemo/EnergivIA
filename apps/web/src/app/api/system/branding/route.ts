import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Fallback in-memory state in case of read-only file systems
let memoryConfig = {
  brandLogoUrl: "",
  whatsappLogoUrl: "",
};

function getConfigPath() {
  const path1 = path.join(process.cwd(), "apps/web/src/config/branding.json");
  const path2 = path.join(process.cwd(), "src/config/branding.json");
  if (fs.existsSync(path.dirname(path1))) {
    return path1;
  }
  return path2;
}

function readConfig() {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(content);
      // Sync memory state
      memoryConfig = parsed;
      return parsed;
    }
  } catch (err) {
    console.error("Error reading branding config file, using memory state:", err);
  }
  return memoryConfig;
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

    // Update in-memory state first
    memoryConfig = config;

    // Try to write to file system
    try {
      const configPath = getConfigPath();
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
    } catch (fsError) {
      console.warn("Could not persist branding config to file, saved in memory:", fsError);
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
