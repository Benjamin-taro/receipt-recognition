/* ----------------------------------------------------------------
   API   POST /api/ocr
   Body  multipart/form-data;  field name = "file" (single image)
   ---------------------------------------------------------------- */
   export const runtime = "nodejs";        // Serverless/Node ランタイム

   import { NextRequest, NextResponse } from "next/server";
   import { ocr } from "llama-ocr";
   
   export async function POST(req: NextRequest) {
     /* 1) 画像ファイルを受け取る */
     const form = await req.formData();
     const file = form.get("file") as File | null;
     if (!file) {
       return NextResponse.json({ error: "no file" }, { status: 400 });
     }
   
     /* 2) バイナリ → Base64（Edge でも Node でも動く方式） */
     const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
   
     /* 3) llama‑ocr 呼び出し */
     try {
       const markdown = await ocr({
         fileBase64: base64,                  // fs を使わないので簡潔
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
   