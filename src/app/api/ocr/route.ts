/* ----------------------------------------------------------------
   API   POST /api/ocr
   Body  multipart/form-data;  field name = "file" (single image)
   ---------------------------------------------------------------- */
   export const runtime = "nodejs";

   import { NextRequest, NextResponse } from "next/server";
   import { promises as fs } from "fs";
   import os from "os";
   import path from "path";
   import sharp from "sharp";
   import { ocr } from "llama-ocr";
   
   const MAX_RETRY = 5;                  // 試行回数
   const BACKOFF   = [2000, 4000, 8000, 16000, 32000]; // ms
   
   /* simple sleep */
   const wait = (ms: number) =>
     new Promise<void>(resolve => setTimeout(resolve, ms));
   
   export async function POST(req: NextRequest) {
     /* 1) 画像ファイルを受け取る */
     const form = await req.formData();
     const file = form.get("file") as File | null;
     if (!file) {
       return NextResponse.json({ error: "no file" }, { status: 400 });
     }
   
     /* 2) ArrayBuffer → Buffer */
     const original = Buffer.from(await file.arrayBuffer());
   
     /* 3) リサイズ & 再エンコード（長辺1120 / JPEG 80%） */
     const resized = await sharp(original)
       .resize({ width: 1120, height: 1120, fit: "inside" })
       .jpeg({ quality: 80 })
       .toBuffer();
   
     /* 4) /tmp に保存 */
     const tmp = path.join(os.tmpdir(), `${Date.now()}.jpg`);
     await fs.writeFile(tmp, resized);
   
     try {
        let markdown = "";
    
        /* 5) 指数バックオフ付きリトライ */
        for (let attempt = 0; attempt < MAX_RETRY; ++attempt) {
          try {
            markdown = await ocr({
              filePath: tmp,
              apiKey : process.env.TOGETHER_API_KEY!,
              model  : "free",
            });
    
            if (markdown.trim().length) break;   // 成功
            throw new Error("empty-response");    // 空なら失敗
          } catch (err) {
            if (attempt < MAX_RETRY - 1) {
              await wait(BACKOFF[attempt]);       // 2→4→8…
              continue;                           // リトライ
            }
            throw err;                            // 上限で投げる
          }
        }
    
        console.log("OCR len:", markdown.length, "| file:", tmp);
        return NextResponse.json({ markdown });
    
      } catch (e) {
        console.error("llama-ocr error:", e);
        return NextResponse.json({ error: String(e) }, { status: 502 });
      } finally {
        fs.unlink(tmp).catch(() => {});
      }
    }
   