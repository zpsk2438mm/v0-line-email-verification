import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    // 這裡是你原本要發送郵件的邏輯
    // 例如：使用 Resend 或其他 Email 服務
    console.log(`準備發送驗證碼 ${code} 到 ${email}`);

    // 暫時回傳成功，讓前端可以繼續測試下一步（輸入 OTP）
    return NextResponse.json({ 
      success: true,
      message: "驗證碼已模擬發送成功（請查看伺服器 Log）" 
    });
    
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}

// 這是為了防止 405 錯誤，明確告訴 Next.js 這個 API 支援 POST
