// 請在你的瀏覽頁面中尋找 Hero 區塊的程式碼，並將顏色 class 改為如下：

{/* 頂部藍色區塊 -> 改為橘色漸層區塊 */}
<div className="relative overflow-hidden bg-gradient-to-br from-[#FF8C00] to-[#D95300] rounded-[2.5rem] p-8 text-white shadow-lg shadow-orange-200/50 mb-8">
  <div className="relative z-10">
    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold mb-3">
      ✨ 南臺科技大學專屬
    </div>
    <h2 className="text-3xl font-black mb-2 tracking-tight">屬於南臺人的二手淘寶地</h2>
    <p className="text-orange-50/90 text-sm font-medium">省錢、環保、校內面交！快來尋寶吧 🎒</p>
  </div>
  
  {/* 背景裝飾圓圈 (選配，增加質感) */}
  <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
</div>

{/* 下方的分類按鈕 (如果是藍色的也請改掉) */}
{/* 例如：isActive ? "bg-[#D95300] text-white" : "bg-white text-gray-600" */}
