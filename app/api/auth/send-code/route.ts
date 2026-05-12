import { NextResponse } from "next/server";
import { Resend } from "resend";

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
          <h2 style="color: #333;">您好！這是您的身分驗證碼：</h2>
          <h1 style="color: #D35400; font-size: 40px; letter-spacing: 5px;">${code}</h1>
          <p style="color: #666;">請在網頁輸入此代碼以完成南臺學生身分驗證。</p>
          <hr />
          <p style="font-size: 12px; color: #999;">如果這不是您本人的操作，請忽略此郵件。</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend Error:", error);
    return NextResponse.json({ error: "發送失敗" }, { status: 500 });
  }
}
