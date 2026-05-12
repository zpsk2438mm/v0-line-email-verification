import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();
    
    // 這裡實作發送郵件邏輯 (例如呼叫 Resend API)
    console.log(`發送驗證碼 ${code} 到 ${email}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
