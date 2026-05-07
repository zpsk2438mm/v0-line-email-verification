useEffect(() => {
    async function initializeLiff() {
      // 1. 檢查是否在本地開發 (這部分最容易出錯)
      if (isLocalhost()) {
        const devData = { 
          displayName: "椅子 🪑", 
          email: "dev@stust.edu.tw", 
          pictureUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
        };
        setLineUserId("dev_user_123");
        setUserEmail(devData.email);
        setUserProfile(devData); // 👈 確保這一行有執行！
        setIsAuthenticated(true);
        setIsReady(true);
        setIsLoading(false);
        return;
      }

      // 2. 檢查快取 (LocalStorage)
      const authCheck = isAuthValid();
      if (authCheck.valid && authCheck.data) {
        setUserEmail(authCheck.data.email || null);
        setLineUserId(authCheck.data.lineUserId || null);
        // 👈 這裡也要補上，否則從快取讀取時會沒資料
        setUserProfile({ 
          email: authCheck.data.email || null, 
          displayName: "已驗證用戶", 
          pictureUrl: "" 
        });
        setIsAuthenticated(true);
        setIsReady(true);
        setIsLoading(false);
        return;
      }

      try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const profile = await liff.getProfile();
        const decodedToken = liff.getDecodedIDToken();
        const email = decodedToken?.email || null;

        // 3. 核心：同步 LINE 資料到狀態中
        const finalProfile = {
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl || "",
          email: email,
        };

        setUserProfile(finalProfile); // 👈 存入狀態
        setUserEmail(email);
        setLineUserId(profile.userId);

        if (isEmailAllowed(email)) {
          setStoredAuth(email || undefined, profile.userId || undefined);
          setIsAuthenticated(true);
          setIsReady(true);
        } else {
          setNeedsVerification(true);
        }
      } catch (error) {
        console.error("LIFF Init Error:", error);
        setNeedsVerification(true);
      } finally {
        setIsLoading(false);
      }
    }
    initializeLiff();
  }, []);
