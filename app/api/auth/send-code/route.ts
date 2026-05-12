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
      html: `<h1>您的驗證碼是：${code}</h1>`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend Error:", error);
    return NextResponse.json({ error: "發送失敗" }, { status: 500 });
  }
}
