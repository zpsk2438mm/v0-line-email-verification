
import { NextRequest, NextResponse } from "next/server";
import { verifiedIdentity } from "@/lib/contact-auth";
import { randomUUID, createHash } from "node:crypto";
import {
  createProductImageToken,
} from "@/lib/product-image-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ==========================================
// 圖片上傳設定
// ==========================================

const BUCKET_NAME = "product-images";

// 後端強制限制圖片實際容量為 300 KiB

const MAX_IMAGE_SIZE = 300 * 1024;

// 預留 Base64 編碼及 JSON 格式所需容量

const MAX_REQUEST_SIZE = 512 * 1024;

// 圖片快取期限：30 天

const IMAGE_CACHE_SECONDS = 30 * 24 * 60 * 60;

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
  let identity;

  // 1. 驗證 LINE 與學校信箱

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
    // 2. 檢查請求大小

    const contentLength = Number(
      req.headers.get("content-length") || 0
    );

    if (
      contentLength > MAX_REQUEST_SIZE
    ) {
      console.warn(
        "[Product Image] 請求容量超標",
        {
          requestBytes: contentLength,
          maxRequestBytes: MAX_REQUEST_SIZE,
        }
      );

      return fail(
        "圖片上傳資料過大，請重新選擇照片",
        413
      );
    }

    // 3. 讀取請求內容

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
          console.warn(
            "[Product Image] 實際請求容量超標",
            {
              requestBytes: totalSize,
              maxRequestBytes: MAX_REQUEST_SIZE,
            }
          );

          return fail(
            "圖片上傳資料過大，請重新選擇照片",
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

    // 4. 解析 JSON

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

    // 5. 移除 Data URL 前綴

    imageBase64 = imageBase64.replace(
      /^data:image\/(?:jpeg|png|webp);base64,/i,
      ""
    );

    // 6. 驗證 Base64 格式

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

    // 7. 轉換圖片資料

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

    // ======================================
    // 後端強制驗證實際圖片容量
    // 超過 300 KiB 一律拒絕上傳
    // ======================================

    if (
      buffer.length > MAX_IMAGE_SIZE
    ) {
      console.warn(
        "[Product Image] 圖片容量超標",
        {
          imageBytes: buffer.length,
          imageKiB: Number(
            (buffer.length / 1024).toFixed(2)
          ),
          maxImageBytes: MAX_IMAGE_SIZE,
        }
      );

      return fail(
        "商品照片壓縮後不可超過 300 KiB，請重新選擇照片",
        413
      );
    }

    // 8. 驗證圖片檔頭

    const imageType =
      detectImageType(buffer);

    if (!imageType) {
      return fail(
        "僅支援 JPEG、PNG 及 WebP 圖片",
        415
      );
    }

    // 確認前端宣告格式與實際檔頭一致

    if (
      input.mimeType !== undefined &&
      input.mimeType !== imageType.mimeType
    ) {
      return fail(
        "圖片內容與檔案格式不符",
        415
      );
    }

    // 9. 建立使用者識別雜湊

    const ownerHash = createHash("sha256")
      .update(
        `${lineUserId}:${email.toLowerCase()}`
      )
      .digest("hex")
      .slice(0, 32);

    // 10. 建立唯一圖片路徑

    const fileName =
      `${ownerHash}_${randomUUID()}.${imageType.extension}`;

    const filePath =
      `products/${fileName}`;

    // 11. 預先取得圖片網址

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

    // 12. 建立圖片所有權憑證
    // 若密鑰設定錯誤，直接停止上傳

    const imageToken =
      createProductImageToken(
        imageUrl,
        lineUserId,
        email
      );

    // ======================================
    // 13. 使用後端權限上傳圖片
    // 圖片快取設定為 30 天
    // 禁止覆蓋既有圖片
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

          cacheControl:
            String(IMAGE_CACHE_SECONDS),

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
    // 14. 記錄圖片上傳及容量驗證結果
    // 不記錄照片內容、身分或圖片憑證
    // ======================================

    console.log(
      "[Product Image] 圖片上傳成功",
      {
        imageBytes: buffer.length,

        imageKiB: Number(
          (buffer.length / 1024).toFixed(2)
        ),

        maxImageBytes: MAX_IMAGE_SIZE,

        mimeType: imageType.mimeType,

        cacheSeconds: IMAGE_CACHE_SECONDS,

        cacheDays: 30,

        compressionResult: "PASS",
      }
    );

    // ======================================
    // 15. 回傳圖片網址及所有權憑證
    // 只有成功上傳後才回傳憑證
    // ======================================

    return NextResponse.json(
      {
        success: true,

        imageUrl,

        imageToken,

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
