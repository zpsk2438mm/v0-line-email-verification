function VerificationForm({
  onVerified,
}: {
  onVerified: (email: string) => void;
}) {
  const [schoolEmail, setSchoolEmail] = useState("");
  const [showTipDialog, setShowTipDialog] = useState(false); // 新增：用來顯示驗證碼提示的對話框
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const isValidSchoolEmail = schoolEmail.toLowerCase().endsWith(ALLOWED_DOMAIN);

  const handleSendCode = () => {
    if (!isValidSchoolEmail) {
      setError("請輸入有效的學校信箱 (@stust.edu.tw)");
      return;
    }
    setError("");
    // 改用 Dialog 代替 alert
    setShowTipDialog(true); 
  };

  const handleStartInputOtp = () => {
    setShowTipDialog(false);
    setShowOtpDialog(true);
  };

  const handleVerifyOtp = () => {
    setIsVerifying(true);
    setTimeout(() => {
      if (otpValue === VERIFICATION_CODE) {
        onVerified(schoolEmail);
      } else {
        setError("驗證碼錯誤，請重新輸入");
        setOtpValue("");
      }
      setIsVerifying(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            南台二手物平台
          </h1>
          <p className="text-sm text-muted-foreground">
            請驗證您的學校信箱以繼續
          </p>
        </div>

        {/* Verification Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                學校信箱
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="your_id@stust.edu.tw"
                  value={schoolEmail}
                  onChange={(e) => {
                    setSchoolEmail(e.target.value);
                    setError("");
                  }}
                  className="pl-10"
                />
              </div>
              {error && !showOtpDialog && !showTipDialog && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>

            <Button
              onClick={handleSendCode}
              disabled={!schoolEmail}
              className="w-full"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              發送驗證碼
            </Button>
          </div>
        </div>
      </div>

      {/* --- 新增：驗證碼提示對話框 --- */}
      <Dialog open={showTipDialog} onOpenChange={setShowTipDialog}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <DialogTitle>驗證碼已發送</DialogTitle>
            <DialogDescription className="py-2">
              系統已將驗證碼發送至您的信箱：<br/>
              <strong className="text-foreground">{schoolEmail}</strong>
              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <p className="text-xs text-slate-500">測試環境驗證碼為：</p>
                <p className="text-2xl font-black text-primary tracking-widest">{VERIFICATION_CODE}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <Button onClick={handleStartInputOtp} className="w-full mt-2">
            前往輸入驗證碼
          </Button>
        </DialogContent>
      </Dialog>

      {/* --- 原有的 OTP 輸入對話框 --- */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle>輸入驗證碼</DialogTitle>
            <DialogDescription>
              請輸入發送至信箱的 6 位數驗證碼
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            <InputOTP
              maxLength={6}
              value={otpValue}
              onChange={(value) => {
                setOtpValue(value);
                setError("");
              }}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}

            <Button
              onClick={handleVerifyOtp}
              disabled={otpValue.length !== 6 || isVerifying}
              className="w-full mt-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  驗證中...
                </>
              ) : (
                "確認驗證"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
