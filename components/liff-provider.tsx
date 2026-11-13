    if (error) {
      console.error("Supabase 登出失敗:", error);
      throw new Error("學校信箱登出失敗，請稍後再試。");
    }

    if (liffInstance?.isLoggedIn()) {
      try {
        liffInstance.logout();
      } catch (err) {
        console.error("LINE LIFF 登出失敗:", err);
        throw new Error("LINE 登出失敗，請重新整理後再試。");
      }
    }

    localStorage.removeItem("stust_authenticated");
    localStorage.removeItem("line_user_id");
    sessionStorage.removeItem(LOGIN_NEXT_KEY);
    setIsAuthenticated(false);
    setUserEmail(null);
    setLineUserId(null);
    setUserProfile(null);
    setUserName(null);
    window.location.replace("/");
  }, [liffInstance]);

  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | undefined;

    async function initAuthAndLiff() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          const email = session?.user.email ?? null;
          setUserEmail(email);
          setUserName(extractNameFromEmail(email));
          setIsAuthenticated(email?.toLowerCase().endsWith("@stust.edu.tw") ?? false);
        }

        const authListener = supabase.auth.onAuthStateChange((_event, session) => {
          if (!isMounted) return;
          const email = session?.user.email ?? null;
          setUserEmail(email);
          setUserName(extractNameFromEmail(email));
          setIsAuthenticated(email?.toLowerCase().endsWith("@stust.edu.tw") ?? false);
        });
        subscription = authListener.data.subscription;

        if (LIFF_ID && typeof window !== "undefined") {
          const { default: liff } = await import("@line/liff");
          await liff.init({ liffId: LIFF_ID });
          if (isMounted) setLiffInstance(liff);

          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            if (isMounted) {
              setLineUserId(profile.userId);
              setUserProfile(profile);
            }
          } else {
            console.log("LINE LIFF 初始化成功，等待手動登入。");
          }
        } else {
          console.warn("尚未設定 NEXT_PUBLIC_LIFF_ID");
        }
      } catch (err) {
        console.error("LINE / Supabase 初始化失敗:", err);
      } finally {
        if (isMounted) {
          setIsLiffInit(true);
          setIsLoading(false);
        }
      }
    }

    void initAuthAndLiff();
    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const sendOtp = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "驗證碼發送失敗" };
    }
  };

  const verifyOtp = async (email: string, token: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
      if (error) throw error;
      if (data.session) {
        const verifiedEmail = data.session.user.email ?? null;
        setUserEmail(verifiedEmail);
        setUserName(extractNameFromEmail(verifiedEmail));
        setIsAuthenticated(verifiedEmail?.toLowerCase().endsWith("@stust.edu.tw") ?? false);
        return { success: true };
      }
      return { success: false, error: "驗證成功，但未能建立安全工作階段" };
    } catch (err: any) {
      return { success: false, error: err?.message || "驗證碼錯誤，請重新輸入" };
    }
  };

  return (
    <LiffContext.Provider value={{
      isAuthenticated, userEmail, lineUserId, userProfile, userName,
      isLiffInit, isLoading, login, logout, sendOtp, verifyOtp,
    }}>
      {isLoading ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7]">
          <Loader2 className="w-10 h-10 animate-spin text-[#D35400] mb-4" />
          <p className="text-slate-500 font-bold tracking-wider text-sm">
            正在安全同步南臺市集資料...
          </p>
        </div>
      ) : children}
    </LiffContext.Provider>
  );
}
