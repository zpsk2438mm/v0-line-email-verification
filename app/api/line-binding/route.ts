
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      code: "LEGACY_BINDING_DISABLED",
      error:
        "舊版六位數綁定功能已停止使用，請透過「資想聽你說」LINE 官方帳號進行新版帳號配對。",
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
