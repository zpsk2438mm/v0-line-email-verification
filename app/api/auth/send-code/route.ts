import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  const { email, code } = req.body;

  // 1. 設定 Gmail 傳送器
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  try {
    // 2. 寄送郵件
    await transporter.sendMail({
      from: `"南臺市集" <${process.env.GMAIL_USER}>`,
      to: email, // 現在可以寄給任何人了！
      subject: '【南臺市集】您的登入驗證碼',
      html: `
        <div style="padding: 20px; border: 1px solid #eee;">
          <h2>驗證您的身份</h2>
          <p>您的驗證碼是：<strong style="font-size: 24px; color: #2563eb;">${code}</strong></p>
          <p>請於 10 分鐘內輸入此代碼。</p>
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Gmail Error:', error);
    return res.status(500).json({ error: '郵件發送失敗' });
  }
}
