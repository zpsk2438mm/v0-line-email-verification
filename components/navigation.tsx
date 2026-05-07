// 1. 引入 Liff Context
const { userProfile, isAuthenticated } = useLiff();

// ... 在 Sidebar 的內容中找到原本顯示學號的地方 ...

<div className="flex items-center gap-3 px-4 py-6 border-b bg-slate-50/50">
  {/* 動態頭像 */}
  <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow-sm bg-white shrink-0 flex items-center justify-center">
    {userProfile?.pictureUrl ? (
      <img 
        src={userProfile.pictureUrl} 
        alt="Avatar" 
        className="h-full w-full object-cover"
        referrerPolicy="no-referrer"
      />
    ) : (
      <User className="h-6 w-6 text-slate-300" />
    )}
  </div>

  <div className="min-w-0">
    {/* 顯示「椅子 🪑」 */}
    <p className="text-sm font-bold text-slate-900 truncate">
      {userProfile?.displayName || "未登入"}
    </p>
    {/* 顯示信箱 */}
    <p className="text-[10px] text-slate-500 truncate font-medium">
      {userProfile?.email || "請完成驗證"}
    </p>
  </div>
</div>
