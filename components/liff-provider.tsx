'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import liff from '@line/liff';

interface LiffContextType {
  liff: typeof liff | null;
  lineId: string | null;
  displayName: string | null;
  pictureUrl: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
}

const LiffContext = createContext<LiffContextType>({
  liff: null,
  lineId: null,
  displayName: null,
  pictureUrl: null,
  isLoggedIn: false,
  isLoading: true,
  error: null,
});

export const LiffProvider = ({ children }: { children: React.ReactNode }) => {
  const [liffObject, setLiffObject] = useState<typeof liff | null>(null);
  const [lineId, setLineId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          throw new Error('未設定 NEXT_PUBLIC_LIFF_ID 環境變數');
        }

        await liff.init({ liffId });
        setLiffObject(liff);

        if (liff.isLoggedIn()) {
          setIsLoggedIn(true);
          const profile = await liff.getProfile();
          setLineId(profile.userId);
          setDisplayName(profile.displayName);
          setPictureUrl(profile.pictureUrl || null);

          // 快取 LINE 身分資訊
          localStorage.setItem('line_user_id', profile.userId);
          localStorage.setItem('line_display_name', profile.displayName);
        } else {
          // 若在外部瀏覽器開啟，引導至 LINE 登入授權
          if (!liff.isInClient()) {
            liff.login({ redirectUri: window.location.href });
          }
        }
      } catch (err: any) {
        console.error('LIFF 初始化失敗:', err);
        setError(err.message || 'LIFF 初始化失敗');

        // 回退機制：嘗試讀取快取
        const cachedId = localStorage.getItem('line_user_id');
        const cachedName = localStorage.getItem('line_display_name');
        if (cachedId) setLineId(cachedId);
        if (cachedName) setDisplayName(cachedName);
      } finally {
        setIsLoading(false);
      }
    };

    initLiff();
  }, []);

  return (
    <LiffContext.Provider
      value={{
        liff: liffObject,
        lineId,
        displayName,
        pictureUrl,
        isLoggedIn,
        isLoading,
        error,
      }}
    >
      {children}
    </LiffContext.Provider>
  );
};

export const useLiff = () => useContext(LiffContext);
