'use client';

import { useLiff } from '@/components/liff-provider';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { liff, lineId, isLoggedIn, isLoading } = useLiff();

  // 1. 還在初始化 LIFF 時，顯示載入中
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-2" />
        <p className="text-sm text-gray-500">正在驗證 LINE 身分...</p>
      </div>
    );
  }

  // 2. 已經取得 LINE ID 或已登入，直接顯示系統內容（例如信箱驗證或市集）
  if (isLoggedIn || lineId) {
    return (
      <div>
        {/* 這裏放成功登入後的內容，例如校園信箱驗證表單或市集頁面 */}
        <p className="text-center p-4">LINE 登入成功！LINE ID: {lineId}</p>
      </div>
    );
  }

  // 3. 未登入或外部瀏覽器，才顯示此卡片
  return (
    <div className="max-w-md mx-auto p-4 mt-10">
      <div className="bg-orange-500 text-white rounded-t-xl p-6 text-center shadow-md">
        <h2 className="text-xl font-bold mb-2">✦ 南台人限定二手市集 ✦</h2>
        <p className="text-sm opacity-90">專屬於南臺科技大學的安全校園交易平台</p>
      </div>
      <div className="bg-white rounded-b-xl p-6 shadow-md border border-t-0 text-center">
        <Button
          onClick={() => {
            if (liff && !liff.isLoggedIn()) {
              liff.login();
            }
          }}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2"
        >
          <span>➔]</span> 使用 LINE 安全快速登入
        </Button>
      </div>
    </div>
  );
}
