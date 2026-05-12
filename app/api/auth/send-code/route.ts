import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    // 1. 解析前端傳來的 JSON 資料
    const { email, code } = await req.json();

    // 2. 檢查環境變數是否讀取成功
    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
      console.error("環境變數缺失: GMAIL_USER 或 GMAIL_PASS");
      return NextResponse.json(
        { error: "伺服器郵件設定未完成" },
        { status: 500 }
      );
    }

    // 3. 建立 Gmail 傳送器
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    // 4. 寄送郵件
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: '【南臺市集】您的登入驗證碼',
      html: `
        <div style="padding: 20px; font-family: sans-serif;">
          <h2>驗證您的身份</h2>
          <p>您的驗證碼是：<strong style="font-size: 24px; color: #2563eb;">${code}</strong></p>
          <p>請於 10 分鐘內輸入此代碼。</p>
        </div>
      `,
    });

    console.log(`信件已成功寄發至: ${email}`);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error("API 路由出錯:", error);
    return NextResponse.json(
      { error: error.message || "發送失敗" },
      { status: 500 }
    );
  }
}

// 選擇性：如果有人用 GET 存取，回傳提示
export async function GET() {
  return NextResponse.json({ error: "請使用 POST 方法" }, { status: 405 });
}
