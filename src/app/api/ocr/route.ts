// src/app/api/ocr/route.ts
// ✅  1) Edge → Node.js ランタイムへ
export const runtime = "nodejs";   // あるいは行ごと削除（既定が Node）

import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { ocr } from "llama-ocr";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

  // ✅ 2) Node の tmp ディレクトリに書き込む
  const tmp = path.join(os.tmpdir(), `${crypto.randomUUID()}.jpg`);
  await fs.writeFile(tmp, Buffer.from(await file.arrayBuffer()));

  // llama‑ocr は tmp パスをそのまま読める
  const markdown = await ocr({
    filePath: tmp,
    apiKey: process.env.TOGETHER_API_KEY!,
    model: "free",
  });

  return NextResponse.json({ markdown });
}
