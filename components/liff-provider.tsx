"use client";

// components/liff-provider.tsx 終極完美安全防刷版

import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";

interface LiffContextType {
  isAuthenticated: boolean;
  userEmail: string | null;'use client';

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

        // 檢查登入狀態
        if (liff.isLoggedIn()) {
          setIsLoggedIn(true);
          const profile = await liff.getProfile();
          setLineId(profile.userId);
          setDisplayName(profile.displayName);
          setPictureUrl(profile.pictureUrl || null);

          // 快取登入資訊
          localStorage.setItem('line_user_id', profile.userId);
          localStorage.setItem('line_display_name', profile.displayName);
        } else {
          // 若在外部瀏覽器開啟，強制觸發 LINE 登入頁面
          if (!liff.isInClient()) {
            liff.login({ redirectUri: window.location.href });
          }
        }
      } catch (err: any) {
        console.error('LIFF 初始化失敗:', err);
        setError(err.message || 'LIFF 初始化失敗');

        // 回退機制：嘗試使用 local memory
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
  lineUserId: string | null;
  userProfile: any | null; 
  userName: string | null;
  isLiffInit: boolean; 
  isLoading: boolean; 
  login: () => void;
  sendOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
}

const LiffContext = createContext<LiffContextType>({
  isAuthenticated: false,
  userEmail: null,
  lineUserId: null,
  userProfile: null, 
  userName: null,
  isLiffInit: false, 
  isLoading: true,
  login: () => {},
  sendOtp: async () => ({ success: false }),
  verifyOtp: async () => ({ success: false }),
});

export const useLiff = () => useContext(LiffContext);

export function LiffProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null); 
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiffInit, setIsLiffInit] = useState(false); 
  const [liffInstance, setLiffInstance] = useState<any>(null);

  const extractNameFromEmail = (email: string | null) => {
    if (!email) return null;
    return email.split("@")[0].toUpperCase();
  };

  // 🎯 修正：使用更明確的 Vercel 主網址作為重導向目標，確保兩端 100% 對齊
  const login = useCallback(() => {
    if (!liffInstance) {
      console.warn("LIFF 還沒準備好，無法執行登入");
      return;
    }
    if (typeof window !== "undefined") {
      liffInstance.login({ redirectUri: "https://v0-supabase-form-integration-two.vercel.app/" });
    } else {
      liffInstance.login();
    }
  }, [liffInstance]);

  useEffect(() => {
    let isMounted = true;

    async function initAuthAndLiff() {
      try {
        // 1. 先確認 Supabase 狀態
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          const email = session.user.email ?? null;
          setUserEmail(email);
          setUserName(extractNameFromEmail(email));
          setIsAuthenticated(true);
        }

        // 2. 實時監聽 Supabase 變更
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (isMounted) {
            if (session) {
              const email = session.user.email ?? null;
              setUserEmail(email);
              setUserName(extractNameFromEmail(email));
              setIsAuthenticated(true);
            } else {
              setUserEmail(null);
              setUserName(null);
              setIsAuthenticated(false);
            }
          }
        });

        // 3. 動態初始化 LIFF 身分
        if (LIFF_ID && typeof window !== "undefined") {
          const { default: liff } = await import("@line/liff");
          
          await liff.init({ liffId: LIFF_ID });
          
          if (isMounted) {
            setLiffInstance(liff);
          }

          // 🎯 核心防刷安全機制：
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            if (isMounted) {
              setLineUserId(profile.userId);
              setUserProfile(profile);
            }
          } else {
            // ❌ 移除原本的 else if (liff.isInClient()) { liff.login(); } 
            // ⭕ 絕不在初始化階段自動強制呼叫登入！將選擇權交給頁面按鈕，徹底消滅無限刷新的噩夢。
            console.log("LINE LIFF 初始化成功，使用者當前為未登入狀態，等待手動點擊。");
          }
        }
      } catch (e) {
        console.error("安全認證或 LIFF 初始化失敗:", e);
      } finally {
        if (isMounted) {
          setIsLiffInit(true); 
          setIsLoading(false);
        }
      }
    }

    initAuthAndLiff();

    return () => {
      isMounted = false;
    };
  }, []);

  const sendOtp = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const verifyOtp = async (email: string, token: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) throw error;
      
      if (data.session) {
        const email = data.session.user.email ?? null;
        setUserEmail(email);
        setUserName(extractNameFromEmail(email));
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: "驗證成功但未能建立安全工作階段" };
    } catch (err: any) {
      return { success: false, error: err.message || "驗證碼錯誤，請重新輸入" };
    }
  };

  return (
    <LiffContext.Provider value={{ 
      isAuthenticated, 
      userEmail, 
      lineUserId,
      userProfile, 
      userName,
      isLiffInit, 
      isLoading,
      login,
      sendOtp,
      verifyOtp
    }}>
      {isLoading ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7]">
          <Loader2 className="w-10 h-10 animate-spin text-[#D35400] mb-4" />
          <p className="text-slate-500 font-bold tracking-wider text-sm">正在安全同步南臺市集資料...</p>
        </div>
      ) : (
        children
      )}
    </LiffContext.Provider>
  );
}
