setUploadProgress("傳送管理員通知...");

// 使用相對路徑呼叫 API
try {
  await fetch("/api/notify", {
    method: "POST", // 👈 移除了重疊寫錯的 style: "POST"
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "INSERT", // 讓後端明確認定是新上架
      name: formData.name,
      price: formData.price,
      status: "pending", // 新上架一律是審核中
      line_user_id: lineUserId, // 👈 修正成底線，完美對齊後端
      verified_email: userEmail
    }),
  });
} catch (notifyErr) {
  console.error("通知 API 呼叫失敗:", notifyErr);
}
