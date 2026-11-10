          正在同步您的 LINE 個人資料...
        </p>
      </div>
    );
  }

  const previewProducts = myProducts.slice(0, 4);

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-20">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-white px-4 py-4 shadow-sm">
        <Navigation />
        <h1 className="text-lg font-bold text-slate-800">
          個人中心
        </h1>
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* 個人資料 */}
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-br from-[#D35400] to-[#A04000] text-white py-8 px-6">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-full border-[3px] border-white/30 overflow-hidden bg-white/20 shrink-0">
                {userProfile?.pictureUrl ? (
                  <img
                    src={userProfile.pictureUrl}
                    alt="LINE 頭像"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/10 text-white">
                    <User className="h-10 w-10" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h2 className="font-black text-2xl truncate">
                  {userProfile?.displayName ||
                    userName ||
                    "南臺同學"}
                </h2>

                <div className="flex flex-col gap-1 mt-1 opacity-80">
                  <p className="text-[11px] font-bold uppercase flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3" />
                    {userEmail || "已驗證南臺信箱"}
                  </p>

                  <p className="text-[10px] font-bold opacity-70">
                    LINE 帳號已連結
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 功能選單 */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/my-listings" className="block">
            <Button
              variant="outline"
              className="w-full h-24 flex flex-col items-center justify-center gap-2 rounded-[24px] border-none bg-white shadow-sm hover:bg-orange-50/50 transition-all text-slate-800"
            >
              <div className="p-3 bg-orange-50 rounded-xl">
                <Package className="h-6 w-6 text-[#D35400]" />
              </div>
              <span className="font-black text-base">
                我的商品
              </span>
            </Button>
          </Link>

          <Link href="/" className="block">
            <Button
              variant="outline"
              className="w-full h-24 flex flex-col items-center justify-center gap-2 rounded-[24px] border-none bg-white shadow-sm hover:bg-orange-50/50 transition-all text-slate-800"
            >
              <div className="p-3 bg-orange-50 rounded-xl">
                <Plus className="h-6 w-6 text-[#D35400]" />
              </div>
              <span className="font-black text-base">
                我要刊登
              </span>
            </Button>
          </Link>
        </div>

        {/* 新增：LINE 加好友連結設定 */}
        <Card className="border-none shadow-sm rounded-[32px] bg-white p-5 space-y-4">
          <h3 className="font-black text-base text-slate-700 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#D35400]" />
            我的 LINE 加好友連結
          </h3>

          <p className="text-xs text-slate-500 leading-relaxed">
            請從 LINE 的「加入好友 → 我的行動條碼」
            取得個人加好友連結。
            買家完成 LINE 與南臺信箱驗證後，
            就可以透過這個連結聯絡你。
          </p>

          <Input
            type="url"
            placeholder="https://line.me/ti/p/..."
            value={lineFriendUrl}
            onChange={(e) => {
              setLineFriendUrl(e.target.value);
              setContactMessage("");
              setContactError("");
            }}
            disabled={loadingContact || savingContact}
            className="rounded-xl"
          />

          <Button
            type="button"
            onClick={saveContact}
            disabled={loadingContact || savingContact}
            className="w-full h-11 bg-[#D35400] hover:bg-[#A04000] text-white font-bold rounded-xl"
          >
            {loadingContact
              ? "正在讀取..."
              : savingContact
                ? "儲存中..."
                : "儲存 LINE 聯絡方式"}
          </Button>

          {contactMessage && (
            <p
              role="status"
              className="text-sm text-emerald-600 font-medium"
            >
              {contactMessage}
            </p>
          )}

          {contactError && (
            <p
              role="alert"
              className="text-sm text-red-600 font-medium"
            >
              {contactError}
            </p>
          )}
        </Card>

        {/* LINE 官方帳號商品通知綁定 */}
        <Card className="border-none shadow-sm rounded-[32px] bg-white p-5 space-y-4">
          <h3 className="font-black text-base text-slate-700 flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#D35400]" />
            綁定 LINE 商品通知
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            綁定「資想聽你說」LINE 官方帳號後，未來有買家點擊你的商品「聯絡賣家」時，就能收到官方帳號通知。
            此功能需先加入官方帳號好友並完成綁定；自動通知功能將於後續啟用。
          </p>

          {bindingAlreadyBound ? (
            <p role="status" className="text-sm font-bold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> 已綁定 LINE 商品通知
            </p>
          ) : (
            <>
              <Button
                type="button"
                onClick={createBindingCode}
                disabled={bindingLoading}
                className="w-full h-11 bg-[#D35400] hover:bg-[#A04000] text-white font-bold rounded-xl"
              >
                {bindingLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />產生中...</>
                ) : bindingCode ? "重新產生綁定碼" : "產生 LINE 通知綁定碼"}
              </Button>

              {bindingCode && (
                <div className="rounded-2xl bg-orange-50 p-4 space-y-3 text-center">
                  <p className="text-xs font-bold text-slate-600">你的 6 位數綁定碼</p>
                  <p className="text-3xl font-black tracking-[0.25em] text-[#D35400] select-all">
                    {bindingCode}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copyBindingCode}
                    className="rounded-xl"
                  >
                    <Copy className="h-4 w-4 mr-2" />複製綁定碼
                  </Button>
                  {bindingExpiresAt && (
                    <p className="text-xs text-slate-500">
