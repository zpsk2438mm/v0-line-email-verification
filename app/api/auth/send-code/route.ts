import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // 檢查請求方法
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, code } = req.body;

  // 1. 設定 Gmail 傳送器 (SMTP)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS, // 這必須是 16 位數應用程式密碼
    },
  });

  // 除錯日誌：這會顯示在 Vercel 的 Logs 裡
  console.log(`準備寄送驗證碼到: ${email}`);
  console.log(`寄件者帳號: ${process.env.GMAIL_USER}`);

  try {
    // 2. 寄送郵件
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER, // 簡化寄件者格式，減少被擋信機率
      to: email, 
      subject: '【南臺市集】您的登入驗證碼',
      html: `
        <div style="padding: 20px; border: 1px solid #eee; font-family: sans-serif;">
          <h2 style="color: #2563eb;">驗證您的身份</h2>
          <p>您好！感謝您使用南臺市集。</p>
          <p>您的驗證碼是：<strong style="font-size: 28px; color: #2563eb; letter-spacing: 2px;">${code}</strong></p>
          <p>請於 10 分鐘內在網頁輸入此代碼，請勿將代碼告知他人。</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">這是系統自動發送的郵件，請勿直接回覆。</p>
        </div>
      `,
    });

    console.log('郵件寄送成功:', info.messageId);
    return res.status(200).json({ success: true });
  } catch (error) {
    // 詳細記錄錯誤原因
    console.error('Gmail 發送錯誤詳情:', error);
    return res.status(500).json({ 
      error: '郵件發送失敗', 
      details: error.message 
    });
  }
}
