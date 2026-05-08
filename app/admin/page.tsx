const handleReview = async (product: Product, action: "approve" | "reject") => {
  try {
    const isApprove = action === "approve";

    // 🔴 除錯追蹤：看看前端到底有沒有抓到 ID
    console.log("正在處理商品:", product.name);
    console.log("目標 LINE ID:", product.line_user_id);

    if (!product.line_user_id) {
      alert("警告：此商品沒有綁定 LINE ID，無法發送通知！");
      // 雖然沒 ID，我們還是讓它更新資料庫，只是沒通知
    }

    // 1. 更新資料庫
    const { error } = await supabase
      .from("products")
      .update({ is_approved: isApprove })
      .eq("id", product.id);

    if (error) throw error;

    // 2. 主動呼叫通知 API
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // 這裡把所有可能的 ID 寫法都塞進去，確保後端一定讀得到
        lineUserId: product.line_user_id,
        line_user_id: product.line_user_id,
        record: {
          ...product,
          is_approved: isApprove,
          line_user_id: product.line_user_id
        },
        old_record: {
          ...product,
          is_approved: !isApprove 
        }
      })
    });

    const result = await response.json();
    console.log("通知 API 回傳結果:", result);

    alert(isApprove ? "🎉 已核准上架" : "❌ 已拒絕申請");
    
    // 從清單移除
    setPendingProducts((prev) => prev.filter((p) => p.id !== product.id));

  } catch (err) {
    console.error("審核過程發生嚴重錯誤:", err);
    alert("操作失敗，請查看開發者工具 Console");
  }
};
