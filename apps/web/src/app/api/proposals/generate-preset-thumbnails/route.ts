import { NextResponse } from "next/server";
import { BUILTIN_TEMPLATE_PRESETS } from "@/components/proposals/editor/utils";
import fs from "fs";
import path from "path";

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const baseUrl =
    process.env["NEXT_PUBLIC_APP_URL"] || process.env["APP_BASE_URL"] || requestUrl.origin;
  const results = [];

  const publicPresetsDir = path.join(process.cwd(), "public", "presets");
  if (!fs.existsSync(publicPresetsDir)) {
    fs.mkdirSync(publicPresetsDir, { recursive: true });
  }

  for (const preset of BUILTIN_TEMPLATE_PRESETS) {
    try {
      console.log(`Generating thumbnail for ${preset.id}...`);
      const response = await fetch(`${baseUrl}/api/proposals/thumbnail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: preset.name,
          documentState: preset.payload,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }

      const json = await response.json();
      if (!json.dataUrl) {
        throw new Error("Missing dataUrl");
      }

      const dataUrl = json.dataUrl as string;
      const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, "");

      const fileName = `${preset.id}.jpg`;
      const filePath = path.join(publicPresetsDir, fileName);
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

      results.push({ id: preset.id, success: true, path: `/presets/${fileName}` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Failed to generate ${preset.id}`, msg);
      results.push({ id: preset.id, success: false, error: msg });
    }
  }

  return NextResponse.json({ results });
}
