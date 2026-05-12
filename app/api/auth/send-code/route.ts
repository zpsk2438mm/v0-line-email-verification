import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// 注意 1：必須使用 export async function POST
// 不能用 export default，也不能用 handler
export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    // 檢查變數
    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
      return NextResponse.json({ error: "環境變數未設定" }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: '【南臺市集】您的驗證碼',
      html: `<p>您的驗證碼是：<strong>${code}</strong></p>`,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("發送失敗:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 注意 2：不要寫 GET 函式，或明確標記 GET 不可用
export async function GET() {
  return NextResponse.json({ error: "請使用 POST" }, { status: 405 });
}
