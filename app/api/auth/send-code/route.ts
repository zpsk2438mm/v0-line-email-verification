import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  const { email, code } = req.body;

  // 1. 強制檢查環境變數是否存在
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.error("錯誤：環境變數 GMAIL_USER 或 GMAIL_PASS 缺失！");
    return res.status(500).json({ error: '伺服器設定錯誤' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  try {
    console.log(`正在嘗試寄信給: ${email} ...`);
    
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER, 
      to: email, 
      subject: '【南臺市集】您的驗證碼',
      text: `您的驗證碼是：${code}`, // 同時提供純文字版增加到達率
      html: `<b>您的驗證碼是：${code}</b>`,
    });

    console.log("寄信成功！回傳 ID:", info.messageId);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Gmail 寄信失敗，詳細錯誤：", error);
    return res.status(500).json({ error: error.message });
  }
}
