// ✅ 1) Edge → Node.js
export const runtime = "nodejs";

import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";       // ← 追加
import { ocr } from "llama-ocr";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

  // ✅ 2) Node の tmp ディレクトリへ
  const tmp = path.join(os.tmpdir(), `${randomUUID()}.jpg`);
  await fs.writeFile(tmp, Buffer.from(await file.arrayBuffer()));

  try {
    const markdown = await ocr({
      filePath: tmp,
      apiKey: process.env.TOGETHER_API_KEY!,
      model: "free",            // 無料モデルを明示
    });
    console.log("OCR len:", markdown.length);   // ← ログに出る
    return NextResponse.json({ markdown });
  } catch (e) {
    console.error("OCR error:", e);             // ← エラーも出す
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
