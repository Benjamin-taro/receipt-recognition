/* ----------------------------------------------------------------
   API   POST /api/ocr
   Body  multipart/form-data;  field name = "file" (single image)
   ---------------------------------------------------------------- */
   export const runtime = "nodejs";

   import { NextRequest, NextResponse } from "next/server";
   import { promises as fs } from "fs";
   import os from "os";
   import path from "path";
   import sharp from "sharp";                 // ★ 追加 (npm i sharp)
   import { ocr } from "llama-ocr";
   
   export async function POST(req: NextRequest) {
     /* 1) 画像ファイルを受け取る */
     const form = await req.formData();
     const file = form.get("file") as File | null;
     if (!file) {
       return NextResponse.json({ error: "no file" }, { status: 400 });
     }
   
     /* 2) ArrayBuffer → Buffer に変換 */
     const original = Buffer.from(await file.arrayBuffer());
   
     /* 3) sharp で長辺 1120px 以下へリサイズ（JPEG 80% 品質） */
     const resized = await sharp(original)
       .resize({ width: 1120, height: 1120, fit: "inside" })
       .jpeg({ quality: 80 })
       .toBuffer();
   
     /* 4) /tmp に書き出し */
     const tmp = path.join(os.tmpdir(), `${Date.now()}.jpg`);
     await fs.writeFile(tmp, resized);
   
     try {
       /* 5) llama‑ocr 呼び出し */
       const markdown = await ocr({
         filePath: tmp,
         apiKey: process.env.TOGETHER_API_KEY!,
         model: "free",
       });
   
       console.log("OCR len:", markdown.length, "| file:", tmp);
   
       if (!markdown.trim()) {
         return NextResponse.json(
           { error: "OCR failed (empty result)" },
           { status: 502 },
         );
       }
   
       return NextResponse.json({ markdown });
     } catch (e) {
       console.error("llama‑ocr error:", e);
       return NextResponse.json({ error: String(e) }, { status: 500 });
     } finally {
       /* 6) 一時ファイルを掃除 */
       fs.unlink(tmp).catch(() => {});
     }
   }
   