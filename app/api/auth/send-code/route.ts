import { Resend } from 'resend';
import { NextResponse } from 'next/server';

// 確保 API Key 有正確讀取
const resend = new Resend(process.env.RESEND_API_KEY);

// 必須大寫 POST
export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    // 呼叫 Resend 發信
    const data = await resend.emails.send({
      from: 'STUST Market <onboarding@resend.dev>',
      to: [email],
      subject: '南臺市集 - 驗證碼',
      html: `<strong>您的驗證碼是：${code}</strong><br>請在 app 中輸入此代碼完成認證。`,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Resend Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 預防萬一，如果有人用 GET 訪問，回傳一個訊息（這能避免 405 變成 404）
export async function GET() {
  return NextResponse.json({ message: "This endpoint only accepts POST requests." });
}
