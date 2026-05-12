import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// 強制不使用快取，確保 Vercel 讀取到最新的環境變數
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. 取得資料
    const body = await req.json();
    const { email, code } = body;

    // 2. 檢查環境變數
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_PASS;

    if (!user || !pass) {
      return NextResponse.json({ error: "Gmail 帳號或密碼未設定" }, { status: 500 });
    }

    // 3. 建立傳送器
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    // 4. 寄信
    await transporter.sendMail({
      from: user,
      to: email,
      subject: '【南臺市集】您的驗證碼',
      text: `您的驗證碼是：${code}`,
      html: `<p>您的驗證碼是：<strong>${code}</strong></p>`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("發送失敗:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 預防萬一，若有 GET 請求也回傳成功，測試路徑是否暢通
export async function GET() {
  return NextResponse.json({ status: "API 運行中，請使用 POST 方法" });
}
