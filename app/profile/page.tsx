"use client";
// ... (保持原本所有的 import 和 interface 內容)

export default function ProfilePage() {
  // ... (保持原本所有的 state 和 useEffect 邏輯)

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-12">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-100 bg-white/80 backdrop-blur-md px-4 py-4 shadow-sm">
        <Navigation />
        <h1 className="text-lg font-black text-slate-800">帳戶中心</h1>
      </header>

      <div className="p-4 space-y-5 max-w-md mx-auto">
        {/* 用戶資訊區塊 - 升級漸層與陰影 */}
        <div className="relative rounded-[2rem] overflow-hidden shadow-xl shadow-blue-900/10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-700 opacity-95" />
          <div className="relative p-8 text-white">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-24 w-24 rounded-full border-4 border-white/20 shadow-2xl overflow-hidden bg-white/10 backdrop-blur-sm">
                {userProfile?.pictureUrl ? (
                  <img src={userProfile.pictureUrl} alt="LINE Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 m-auto mt-6 text-white" />
                )}
              </div>
              <div className="space-y-1">
                <h2 className="font-black text-2xl tracking-tight leading-tight">
                  {userProfile?.displayName || "南台同學"}
                </h2>
                <div className="inline-flex items-center gap-1.5 bg-black/10 px-3 py-1 rounded-full backdrop-blur-sm">
                  <Mail className="h-3 w-3 text-blue-200" />
                  <p className="text-[11px] font-medium text-blue-50">{userEmail || "帳號未驗證"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 管理員入口 - 更強烈的視覺引導 */}
        {isAdmin && (
          <Link href="/admin">
            <Button className="w-full bg-white border-2 border-amber-400 text-amber-600 hover:bg-amber-50 font-black py-7 rounded-2xl shadow-lg shadow-amber-500/10 group transition-all">
              <ShieldCheck className="mr-2 group-hover:scale-110 transition-transform" /> 進入系統管理後台
            </Button>
          </Link>
        )}

        {/* 商品清單卡片 */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-0.5">
                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" /> 我的刊登
                </h3>
                <p className="text-xs text-slate-400 font-medium">共 {myProducts.length} 件物品</p>
              </div>
              <Link href="/upload">
                <Button size="sm" className="rounded-full font-bold px-5 shadow-md shadow-primary/20">
                  + 上架物品
                </Button>
              </Link>
            </div>

            {isLoadingProducts ? (
              <div className="space-y-4">
                {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
              </div>
            ) : myProducts.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <Package className="h-10 w-10 mx-auto text-slate-200 mb-2" />
                <p className="text-sm text-slate-400 font-medium font-sans">目前還空空如也</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myProducts.map((product) => {
                  const isApproved = product.is_approved === true || String(product.is_approved) === "true";
                  return (
                    <div key={product.id} className="group flex items-center gap-4 p-3 rounded-2xl border border-slate-50 bg-slate-50/30 hover:bg-white hover:shadow-md hover:border-slate-100 transition-all duration-300">
                      <div className="h-20 w-20 rounded-2xl overflow-hidden shadow-inner bg-white shrink-0">
                        <img 
                          src={getProductImage(product.image_url)} 
                          alt={product.name} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => (e.currentTarget.src = "/placeholder-logo.png")}
                        />
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <h4 className="font-black text-sm text-slate-700 truncate">{product.name}</h4>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-[10px] font-bold text-rose-400 uppercase">NT$</span>
                          <span className="text-lg font-black text-rose-500 tracking-tighter">{product.price.toLocaleString()}</span>
                        </div>
                        <div className="mt-2">
                          {isApproved ? (
                            <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white border-none text-[9px] font-black rounded-md px-2 py-0.5">
                              已上架
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[9px] font-black rounded-md px-2 py-0.5">
                              審核中
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
