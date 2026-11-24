
import "server-only";

import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

// 圖片憑證有效期限：24 小時
const TOKEN_TTL = 24 * 60 * 60;

interface ImageTokenPayload {
  version: number;
  imageUrl: string;
  lineUserId: string;
  email: string;
  exp: number;
}

function getSigningSecret(): Buffer {
  const value =
    process.env.PRODUCT_IMAGE_SIGNING_SECRET?.trim();

  if (!value) {
    throw new Error(
      "圖片憑證密鑰尚未設定"
    );
  }

  const secret = Buffer.from(
    value,
    "base64"
  );

  if (secret.length < 32) {
    throw new Error(
      "圖片憑證密鑰長度不足"
    );
  }

  return secret;
}

function signPayload(
  payload: string
): Buffer {
  return createHmac(
    "sha256",
    getSigningSecret()
  )
    .update(payload)
    .digest();
}

// ==========================================
// 建立圖片上傳憑證
// ==========================================

export function createProductImageToken(
  imageUrl: string,
  lineUserId: string,
  email: string
): string {
  const payload: ImageTokenPayload = {
    version: 1,

    imageUrl,

    lineUserId,

    email: email.toLowerCase(),

    exp:
      Math.floor(Date.now() / 1000) +
      TOKEN_TTL,
  };

  const encoded = Buffer.from(
    JSON.stringify(payload),
    "utf8"
  ).toString("base64url");

  const signature = signPayload(
    encoded
  ).toString("base64url");

  return `${encoded}.${signature}`;
}

// ==========================================
// 驗證圖片上傳憑證
// ==========================================

export function verifyProductImageToken(
  token: string,
  imageUrl: string,
  lineUserId: string,
  email: string
): boolean {
  if (
    typeof token !== "string" ||
    !token ||
    token.length > 4096
  ) {
    return false;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const [encoded, signature] = parts;

  if (
    !/^[A-Za-z0-9_-]+$/.test(encoded) ||
    !/^[A-Za-z0-9_-]+$/.test(signature)
  ) {
    return false;
  }

  // 重新計算正確簽章
  const expected = signPayload(encoded);

  try {
    const received = Buffer.from(
      signature,
      "base64url"
    );

    if (
      received.length !== expected.length
    ) {
      return false;
    }

    if (
      !timingSafeEqual(
        received,
        expected
      )
    ) {
      return false;
    }

    const payload =
      JSON.parse(
        Buffer.from(
          encoded,
          "base64url"
        ).toString("utf8")
      ) as ImageTokenPayload;

    if (
      !payload ||
      payload.version !== 1
    ) {
      return false;
    }

    if (
      !Number.isSafeInteger(payload.exp) ||
      payload.exp <=
        Math.floor(Date.now() / 1000)
    ) {
      return false;
    }

    return (
      payload.imageUrl === imageUrl &&
      payload.lineUserId === lineUserId &&
      payload.email === email.toLowerCase()
    );
  } catch {
    return false;
  }
}
