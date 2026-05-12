import { NextResponse } from "next/server";
import { Resend } from "resend";

// 這一行會去抓你在 image_fdb1e0.png 設定的那個 Key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    await resend.emails.send({
      from: "STUST Market <onboarding@resend.dev>",
      to: email,
      subject: "南臺市集 - 您的驗證碼",
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2>您的驗證碼是：</h2>
          <h1 style="color: #D35400; font-size: 40px;">${code}</h1>
          <p>請回網頁輸入此代碼，驗證您的南臺學生身分。</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend Error:", error);
    return NextResponse.json({ error: "發送失敗" }, { status: 500 });
  }
}
