import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// 初始化 Resend (記得在 Vercel 設定環境變數 RESEND_API_KEY)
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    // 寄送郵件
    const { data, error } = await resend.emails.send({
      from: 'STUST Market <onboarding@resend.dev>', // 測試階段先用這個預設寄件者
      to: [email],
      subject: '【南臺市集】您的身分驗證碼',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 12px; max-width: 400px;">
          <h2 style="color: #D35400;">身分驗證</h2>
          <p>歡迎使用南臺市集！您的驗證碼如下：</p>
          <div style="background: #FDF5F0; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #D35400; letter-spacing: 5px;">${code}</span>
          </div>
          <p style="font-size: 12px; color: #666;">驗證碼將於 5 分鐘後失效。若非本人操作，請忽略此信。</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend Error:", error);
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Internal Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
