import { NextRequest, NextResponse } from "next/server";
import { ocr } from "llama-ocr";

export const runtime = "edge";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const file = fd.get("file") as File | null;
  if (!file) return NextResponse.json({ error:"no file" },{ status:400 });

  const path = `/tmp/${crypto.randomUUID()}.jpg`;
  await Bun.write(path, new Uint8Array(await file.arrayBuffer()));

  const markdown = await ocr({
    filePath: path,
    apiKey: process.env.TOGETHER_API_KEY!,
    model: process.env.LLAMA_MODEL || "free",
  });

  return NextResponse.json({ markdown });
}
