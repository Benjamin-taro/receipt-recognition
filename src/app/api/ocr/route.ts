/* ----------------------------------------------------------------
   API   POST /api/ocr
   Body  multipart/form-data;  field name = "file" (single image)
   ---------------------------------------------------------------- */
   export const runtime = "nodejs";        // Serverless/Node ランタイム

   import { NextRequest, NextResponse } from "next/server";
   import { promises as fs } from "fs";
   import os from "os";
   import { ocr } from "llama-ocr";
   import path from "path";
   export async function POST(req: NextRequest) {
       /* 1) 画像ファイルを受け取る */
       const form = await req.formData();
       const file = form.get("file") as File | null;
       const tmp = path.join(os.tmpdir(), `${Date.now()}.jpg`);
       await fs.writeFile(tmp, Buffer.from(await file.arrayBuffer()));
     if (!file) {
       return NextResponse.json({ error: "no file" }, { status: 400 });
     }
   
     /* 2) バイナリ → Base64（Edge でも Node でも動く方式） */
     const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

     /* 3) llama‑ocr 呼び出し */
     try {
       const markdown = await ocr({
        filePath: tmp,                 // ← 型が通る
        apiKey: process.env.TOGETHER_API_KEY,
         model: "free",                                // ← ここを固定リテラルに
         prompt:
           "This is an English receipt. Extract all text exactly as it appears and output it in Markdown.",
         temperature: 0,
         maxTokens: 1024,
       });
   
       if (!markdown.trim()) {
         /* 空返り＝失敗扱いにしてフロントでハンドリングしやすく */
         return NextResponse.json(
           { error: "OCR failed (empty result)" },
           { status: 502 },
         );
       }
   
       return NextResponse.json({ markdown });
     } catch (e) {
       console.error("llama‑ocr error:", e);
       return NextResponse.json({ error: String(e) }, { status: 500 });
     }
   }
   