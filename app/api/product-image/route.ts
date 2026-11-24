
import { NextRequest, NextResponse } from "next/server";
import { verifiedIdentity } from "@/lib/contact-auth";
import { randomUUID, createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ==========================================
// 圖片上傳設定
// ==========================================

const BUCKET_NAME = "product-images";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const MAX_REQUEST_SIZE = 3 * 1024 * 1024;

// ==========================================
// 統一錯誤回應
// ==========================================

function fail(
  message: string,
  status = 400
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

// ==========================================
// 驗證圖片格式
// 不單純相信前端傳入的 MIME Type
// ==========================================

function detectImageType(
  buffer: Buffer
): {
  mimeType: string;
  extension: string;
} | null {

  // JPEG
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return {
      mimeType: "image/jpeg",
      extension: "jpg",
    };
  }

  // PNG
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([
        137, 80, 78, 71,
        13, 10, 26, 10,
      ])
    )
  ) {
    return {
      mimeType: "image/png",
      extension: "png",
    };
  }

  // WebP
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return {
      mimeType: "image/webp",
      extension: "webp",
    };
  }

  return null;
}

// ==========================================
// POST：安全上傳商品圖片
// ==========================================

export async function POST(
  req: NextRequest
) {
  // ========================================
  // 1. 驗證 LINE 與學校信箱
  // ========================================

  let identity;

  try {
    identity = await verifiedIdentity(req);
  } catch (error: unknown) {
    return fail(
      error instanceof Error
        ? error.message
        : "請先登入並完成學校信箱驗證",
      401
    );
  }

  const {
    admin,
    lineUserId,
    email,
  } = identity;

  try {
    // ======================================
    // 2. 檢查請求大小
    // ======================================

    const contentLength = Number(
      req.headers.get("content-length") || 0
    );

    if (
      contentLength > MAX_REQUEST_SIZE
    ) {
      return fail(
        "圖片上傳資料過大",
        413
      );
    }

    // ======================================
    // 3. 讀取請求內容
    // ======================================

    if (!req.body) {
      return fail("缺少圖片資料");
    }

    const reader = req.body.getReader();

    const chunks: Buffer[] = [];

    let totalSize = 0;

    try {
      while (true) {
        const { done, value } =
          await reader.read();

        if (done) break;

        if (!value) continue;

        totalSize += value.byteLength;

        if (
          totalSize > MAX_REQUEST_SIZE
        ) {
          return fail(
            "圖片上傳資料過大",
            413
          );
        }

        chunks.push(Buffer.from(value));
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }

    const raw = Buffer.concat(chunks)
      .toString("utf8");

    // ======================================
    // 4. 解析 JSON
    // ======================================

    let body: unknown;

    try {
      body = JSON.parse(raw);
    } catch {
      return fail(
        "圖片資料格式不正確"
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return fail(
        "請提供有效的圖片資料"
      );
    }

    const input = body as Record<
      string,
      unknown
    >;

    let imageBase64 =
      typeof input.image === "string"
        ? input.image.trim()
        : "";

    if (!imageBase64) {
      return fail(
        "請選擇商品照片"
      );
    }

    // ======================================
    // 5. 移除 Data URL 前綴
    // ======================================

    imageBase64 = imageBase64.replace(
      /^data:image\/(?:jpeg|png|webp);base64,/i,
      ""
    );

    // ======================================
    // 6. 驗證 Base64 格式
    // ======================================

    if (
      imageBase64.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(
        imageBase64
      )
    ) {
      return fail(
        "圖片編碼格式不正確"
      );
    }

    // ======================================
    // 7. 轉換圖片資料
    // ======================================

    const buffer = Buffer.from(
      imageBase64,
      "base64"
    );

    if (
      buffer.toString("base64") !==
      imageBase64
    ) {
      return fail(
        "圖片編碼格式不正確"
      );
    }

    if (buffer.length === 0) {
      return fail(
        "圖片內容不存在"
      );
    }

    if (
      buffer.length > MAX_IMAGE_SIZE
    ) {
      return fail(
        "商品照片不可超過 2MB",
        413
      );
    }

    // ======================================
    // 8. 驗證圖片檔頭
    // ======================================

    const imageType =
      detectImageType(buffer);

    if (!imageType) {
      return fail(
        "僅支援 JPEG、PNG 及 WebP 圖片",
        415
      );
    }

    // ======================================
    // 9. 建立使用者識別雜湊
    // 不直接公開 LINE ID 或學校信箱
    // ======================================

    const ownerHash = createHash("sha256")
      .update(
        `${lineUserId}:${email.toLowerCase()}`
      )
      .digest("hex")
      .slice(0, 32);

    // ======================================
    // 10. 建立唯一圖片路徑
    // 不接受前端指定檔名
    // ======================================

    const fileName =
      `${ownerHash}_${randomUUID()}.${imageType.extension}`;

    const filePath =
      `products/${fileName}`;

    // ======================================
    // 11. 使用後端權限上傳圖片
    // 禁止覆蓋既有檔案
    // ======================================

    const {
      data: uploaded,
      error: uploadError,
    } = await admin.storage
      .from(BUCKET_NAME)
      .upload(
        filePath,
        buffer,
        {
          contentType:
            imageType.mimeType,

          cacheControl: "3600",

          upsert: false,
        }
      );

    if (uploadError || !uploaded) {
      console.error(
        "[Product Image] 上傳失敗:",
        uploadError?.message
      );

      return fail(
        "商品照片上傳失敗，請稍後再試",
        500
      );
    }

    // ======================================
    // 12. 取得公開圖片網址
    // ======================================

    const { data: publicData } =
      admin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

    const imageUrl =
      publicData.publicUrl;

    if (!imageUrl) {
      return fail(
        "無法取得商品照片網址",
        500
      );
    }

    // ======================================
    // 13. 回傳上傳結果
    // ======================================

    return NextResponse.json(
      {
        success: true,

        imageUrl,

        path: filePath,

        mimeType: imageType.mimeType,

        size: buffer.length,

        message: "商品照片上傳成功",
      },
      {
        status: 201,

        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    console.error(
      "[Product Image] 圖片處理發生異常"
    );

    return fail(
      "圖片上傳發生異常，請稍後再試",
      500
    );
  }
}
