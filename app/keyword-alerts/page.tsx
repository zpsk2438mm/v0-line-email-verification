
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Plus,
  Trash2,
  Tag,
  Loader2,
  Info,
  CheckCircle2,
  AlertCircle,
  Search,
} from "lucide-react";
import { contactRequest } from "@/lib/contact-client";

interface KeywordAlert {
  id: string;
  keyword: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Feedback {
  type: "success" | "error";
  message: string;
}

const MAX_KEYWORDS = 10;
const API_PATH = "/api/keyword-alerts";

export default function KeywordAlertsPage() {
  const [alerts, setAlerts] = useState<KeywordAlert[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadError, setLoadError] = useState(false);

  const activeCount = alerts.filter(
    (item) => item.is_active
  ).length;

  const pausedCount = alerts.length - activeCount;

  const busy = adding || processingId !== null;

  // ==========================================
  // 顯示錯誤訊息
  // ==========================================

  function showError(error: unknown) {
    setFeedback({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "操作失敗，請稍後再試",
    });
  }

  // ==========================================
  // 取得關鍵字追蹤清單
  // ==========================================

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setFeedback(null);

    try {
      const result = await contactRequest(
        API_PATH,
        "GET"
      );

      setAlerts(
        Array.isArray(result.alerts)
          ? result.alerts
          : []
      );
    } catch (error) {
      setLoadError(true);

      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "無法取得關鍵字資料",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  // ==========================================
  // 新增追蹤關鍵字
  // ==========================================

  async function addKeyword() {
    if (busy || loading || loadError) {
      return;
    }

    const value = keyword.trim();

    setFeedback(null);

    if (!value) {
      setFeedback({
        type: "error",
        message: "請輸入想追蹤的關鍵字",
      });

      return;
    }

    if (Array.from(value).length > 50) {
      setFeedback({
        type: "error",
        message: "關鍵字不可超過 50 個字",
      });

      return;
    }

    if (alerts.length >= MAX_KEYWORDS) {
      setFeedback({
        type: "error",
        message: "最多只能追蹤 10 組關鍵字",
      });

      return;
    }

    const duplicate = alerts.some(
      (item) =>
        item.keyword.trim().toLowerCase() ===
        value.toLowerCase()
    );

    if (duplicate) {
      setFeedback({
        type: "error",
        message: "你已經追蹤過這個關鍵字",
      });

      return;
    }

    setAdding(true);

    try {
      const result = await contactRequest(
        API_PATH,
        "POST",
        {
          keyword: value,
        }
      );

      if (!result.alert?.id) {
        throw new Error("新增結果不完整，請重新整理");
      }

      setAlerts((previous) => [
        result.alert,
        ...previous,
      ]);

      setKeyword("");

      setFeedback({
        type: "success",
        message: `已成功追蹤「${value}」`,
      });
    } catch (error) {
      showError(error);
    } finally {
      setAdding(false);
    }
  }

  // ==========================================
  // 開啟或暫停通知
  // ==========================================

  async function toggleAlert(item: KeywordAlert) {
    if (busy || loading || loadError) {
      return;
    }

    setProcessingId(item.id);
    setFeedback(null);

    try {
      const result = await contactRequest(
        API_PATH,
        "PUT",
        {
          id: item.id,
          is_active: !item.is_active,
        }
      );

      if (!result.alert?.id) {
        throw new Error("更新結果不完整，請重新整理");
      }

      setAlerts((previous) =>
        previous.map((alert) =>
          alert.id === item.id
            ? result.alert
            : alert
        )
      );

      setFeedback({
        type: "success",
        message: result.alert.is_active
          ? `已開啟「${item.keyword}」通知`
          : `已暫停「${item.keyword}」通知`,
      });
    } catch (error) {
      showError(error);
    } finally {
      setProcessingId(null);
    }
  }

  // ==========================================
  // 刪除追蹤關鍵字
  // ==========================================

  async function deleteAlert(item: KeywordAlert) {
    if (busy || loading || loadError) {
      return;
    }

    const confirmed = window.confirm(
      `確定要刪除「${item.keyword}」的追蹤嗎？`
    );

    if (!confirmed) {
      return;
    }

    setProcessingId(item.id);
    setFeedback(null);

    try {
      await contactRequest(
        API_PATH,
        "DELETE",
        {
          id: item.id,
        }
      );

      setAlerts((previous) =>
        previous.filter(
          (alert) => alert.id !== item.id
        )
      );

      setFeedback({
        type: "success",
        message: `已刪除「${item.keyword}」的追蹤`,
      });
    } catch (error) {
      showError(error);
    } finally {
      setProcessingId(null);
    }
  }

  // ==========================================
  // 頁面介面
  // ==========================================

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="mx-auto max-w-3xl px-4 py-6">

        {/* 返回個人中心 */}

        <Link
          href="/profile"
          className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#D35400]"
        >
          <ArrowLeft className="h-4 w-4" />
          返回個人中心
        </Link>

        {/* 頁面標題 */}

        <section className="mb-5 rounded-2xl bg-gradient-to-br from-[#D35400] to-[#E67E22] p-6 text-white shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            <Bell className="h-6 w-6" />
          </div>

          <h1 className="text-2xl font-bold">
            智慧媒合提醒
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-white/90">
            追蹤你想要的商品關鍵字，當符合條件的商品正式上架時，系統將透過 LINE 通知你。
          </p>
        </section>

        {/* 統計資訊 */}

        <section className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm">
            <p className="text-xs text-gray-500">
              追蹤總數
            </p>

            <p className="mt-2 text-2xl font-bold text-[#D35400]">
              {loading || loadError ? "—" : alerts.length}
              <span className="text-sm font-normal text-gray-400">
                /10
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm">
            <p className="text-xs text-gray-500">
              通知開啟
            </p>

            <p className="mt-2 text-2xl font-bold text-green-600">
              {loading || loadError ? "—" : activeCount}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm">
            <p className="text-xs text-gray-500">
              已暫停
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-500">
              {loading || loadError ? "—" : pausedCount}
            </p>
          </div>
        </section>

        {/* 操作提示 */}

        {feedback && (
          <div
            role={feedback.type === "error" ? "alert" : "status"}
            className={`mb-5 flex items-start gap-3 rounded-xl border p-4 text-sm ${
              feedback.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            )}

            <div className="min-w-0 flex-1 break-words">
              {feedback.message}

              {loadError && (
                <button
                  type="button"
                  onClick={() => void loadAlerts()}
                  className="mt-2 block font-medium underline"
                >
                  重新載入
                </button>
              )}
            </div>

            <button
              type="button"
              aria-label="關閉提示"
              onClick={() => setFeedback(null)}
              className="shrink-0 text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* 新增關鍵字 */}

        <section className="mb-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-[#D35400]" />

            <h2 className="text-lg font-bold text-gray-800">
              新增追蹤關鍵字
            </h2>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void addKeyword();
            }}
          >
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <input
                  type="text"
                  aria-label="追蹤關鍵字"
                  value={keyword}
                  onChange={(event) =>
                    setKeyword(event.target.value)
                  }
                  placeholder="例如：Java、電風扇"
                  maxLength={50}
                  disabled={
                    loading ||
                    loadError ||
                    busy ||
                    alerts.length >= MAX_KEYWORDS
                  }
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-[#D35400] focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
                />
              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  loadError ||
                  busy ||
                  !keyword.trim() ||
                  alerts.length >= MAX_KEYWORDS
                }
                className="flex shrink-0 items-center justify-center gap-1 rounded-xl bg-[#D35400] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#BA4A00] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}

                新增
              </button>
            </div>
          </form>

          <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
            <span>每組關鍵字最多 50 字</span>
            <span>{Array.from(keyword).length}/50</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">
              關鍵字範例：
            </span>

            {[
              "Java",
              "資料庫",
              "電風扇",
              "計算機",
              "腳踏車",
            ].map((example) => (
              <button
                key={example}
                type="button"
                disabled={
                  busy ||
                  loading ||
                  loadError ||
                  alerts.length >= MAX_KEYWORDS
                }
                onClick={() => setKeyword(example)}
                className="rounded-full bg-orange-50 px-3 py-1.5 text-xs text-[#D35400] transition hover:bg-orange-100 disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
        </section>

        {/* 我的關鍵字 */}

        <section className="mb-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-[#D35400]" />

              <h2 className="text-lg font-bold text-gray-800">
                我的追蹤關鍵字
              </h2>
            </div>

            {!loading && !loadError && (
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-[#D35400]">
                {alerts.length}/10
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <Loader2 className="mb-3 h-7 w-7 animate-spin text-[#D35400]" />

              <p className="text-sm">
                正在載入追蹤資料...
              </p>
            </div>
          ) : loadError ? (
            <div className="py-8 text-center">
              <AlertCircle className="mx-auto mb-3 h-8 w-8 text-gray-300" />

              <p className="text-sm text-gray-500">
                暫時無法取得追蹤資料
              </p>

              <Link
                href="/profile"
                className="mt-3 inline-block text-sm text-[#D35400] underline"
              >
                返回個人中心確認 LINE 通知綁定
              </Link>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
                <BellOff className="h-8 w-8 text-orange-300" />
              </div>

              <p className="font-medium text-gray-600">
                尚未追蹤任何關鍵字
              </p>

              <p className="mt-2 text-sm text-gray-400">
                新增你想要的物品名稱，開始追蹤吧！
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition hover:border-orange-200"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      item.is_active
                        ? "bg-orange-50 text-[#D35400]"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <Tag className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="break-all font-medium text-gray-800">
                      {item.keyword}
                    </p>

                    <div className="mt-1 flex items-center gap-1">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          item.is_active
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`}
                      />

                      <span
                        className={`text-xs ${
                          item.is_active
                            ? "text-green-600"
                            : "text-gray-400"
                        }`}
                      >
                        {item.is_active
                          ? "通知已開啟"
                          : "通知已暫停"}
                      </span>
                    </div>
                  </div>

                  {processingId === item.id ? (
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#D35400]" />
                  ) : (
                    <button
                      type="button"
                      role="switch"
                      aria-label={`${item.keyword}通知`}
                      aria-checked={item.is_active}
                      disabled={busy}
                      onClick={() =>
                        void toggleAlert(item)
                      }
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                        item.is_active
                          ? "bg-[#D35400]"
                          : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          item.is_active
                            ? "translate-x-5"
                            : "translate-x-0.5"
                        }`}
                        style={{ left: 0 }}
                      />
                    </button>
                  )}

                  <button
                    type="button"
                    aria-label={`刪除 ${item.keyword}`}
                    disabled={busy}
                    onClick={() =>
                      void deleteAlert(item)
                    }
                    className="shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 使用說明 */}

        <section className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Info className="h-5 w-5 text-[#D35400]" />

            <h2 className="font-bold text-[#D35400]">
              智慧媒合使用說明
            </h2>
          </div>

          <ul className="space-y-2 text-sm leading-relaxed text-gray-600">
            <li>
              • 每位使用者最多可追蹤 10 組關鍵字。
            </li>

            <li>
              • 系統將比對商品名稱及商品描述。
            </li>

            <li>
              • 商品通過管理員審核並正式上架後，才會觸發媒合通知。
            </li>

            <li>
              • 同一件商品即使符合多組關鍵字，也只會通知一次。
            </li>

            <li>
              • 暫停通知後，系統將停止比對該關鍵字。
            </li>

            <li>
              • 請確認已完成 LINE 官方帳號通知綁定。
            </li>
          </ul>

          <div className="mt-4 flex items-center gap-2 border-t border-orange-200 pt-3 text-xs font-medium text-green-600">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            智慧媒合服務已啟用，符合條件的新上架商品將透過 LINE 自動通知。
          </div>

        </section>
      </div>
    </main>
  );
}
