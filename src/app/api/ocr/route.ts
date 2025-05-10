/* ----------------------------------------------------------------
   API   POST /api/ocr
   Body  multipart/form-data; field name = "file"
   ---------------------------------------------------------------- */
   export const runtime = "nodejs";

   import { NextRequest, NextResponse } from "next/server";
   import sharp from "sharp";                      // 追加
   import { ocr } from "llama-ocr";
   import { promises as fs } from "fs";
   import os from "os";
   import path from "path";
   
   export async function POST(req: NextRequest) {
     /* 1) 画像ファイルを受け取る */
     const form = await req.formData();
     const file = form.get("file") as File | null;
     if (!file) {
       return NextResponse.json({ error: "no file" }, { status: 400 });
     }
   
     /* 2) バッファに読み込み → 1600px & 自動回転でリサイズ */
     const origBuf = Buffer.from(await file.arrayBuffer());
     const resized = await sharp(origBuf)
       .rotate()                          // EXIF に従って正しい向きに
       .resize({ height: 1600, withoutEnlargement: true })
       .jpeg({ quality: 85 })             // 85% で十分。png は .jpeg() のままでOK
       .toBuffer();
   
     /* 3) tmp ファイルを書き出し */
     const tmp = path.join(os.tmpdir(), `${Date.now()}.jpg`);
     await fs.writeFile(tmp, resized);
   
     /* 4) llama‑ocr 呼び出し */
     try {
       const markdown = await ocr({
         filePath: tmp,
         apiKey: process.env.TOGETHER_API_KEY!,
         model: "free",
       });
   
       console.log(
         "OCR len:", markdown.length,
         "| orig:", (origBuf.length / 1024).toFixed(1), "KB",
         "| resized:", (resized.length / 1024).toFixed(1), "KB"
       );

       if (!markdown.trim()) {
         return NextResponse.json(
           { error: "OCR failed (empty result)" },
           { status: 502 }
         );
       }
   
       return NextResponse.json({ markdown });
     } catch (e) {
       console.error("llama‑ocr error:", e);
       return NextResponse.json({ error: String(e) }, { status: 500 });
     }
   }
   