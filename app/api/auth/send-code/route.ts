import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();
    
    // 這裡維持原本發信邏輯，但請記住：
    // 若要讓 Supabase 驗證通過，建議使用前端的 supabase.auth.signInWithOtp
    const data = await resend.emails.send({
      from: 'STUST Market <onboarding@resend.dev>',
      to: [email],
      subject: '南臺市集 - 驗證碼通知',
      html: `<strong>您的驗證碼是：${code}</strong><br>請在 App 中輸入完成認證。`,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
