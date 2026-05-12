import nodemailer from 'nodemailer';

// 針對 Next.js App Router 的處理方式
export async function POST(req) {
  try {
    const { email, code } = await req.json();

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
      text: `您的驗證碼是：${code}`,
      html: `<b>您的驗證碼是：${code}</b>`,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("發送失敗:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 必須明確允許 POST，避免 405 錯誤
export async function GET() {
  return new Response("請使用 POST 方法", { status: 405 });
}
