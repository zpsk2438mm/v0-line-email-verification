
"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { supabase } from "@/lib/supabase";
import { contactRequest } from "@/lib/contact-client";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ShieldCheck,
  AlertCircle,
  Flag,
  PackageCheck,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";

const ADMIN_IDS = [
  "Ued7dfd77b63273d497cebc62f1a7b1df",
  "Uf7c4668bc96315297b02b0a67fff88ea",
  "U6d1c1541184ea9202c0d0acc07e92a4e",
  "Uaea09099f0f6301955360eb64d238243",
];

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url?: unknown;
  line_user_id?: string | null;
  status?: string;
}

interface ProductReport {
  id: string;
  product_id: string;
  reporter_id: string;
  reason: string;
  description: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  product: Product | null;
}

const REASON_LABELS: Record<string, string> = {
  fraud: "詐騙或可疑交易",
  prohibited: "違禁或不適合販售的商品",
  misleading: "商品資訊不實",
  spam: "垃圾訊息或重複刊登",
  harassment: "騷擾或不當內容",
  other: "其他原因",
};

function getImageUrl(raw: unknown): string {
  const fallback = "/placeholder-logo.png";

  if (!raw) return fallback;

  try {
    let value: unknown = raw;

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);

        if (Array.isArray(parsed)) {
          value = parsed[0];
        }
      } catch {
        // 一般圖片網址
      }
    }

    if (Array.isArray(value)) {
      value = value[0];
    }

    if (typeof value !== "string") {
      return fallback;
    }

    const clean = value
      .replace(/[\[\]"']/g, "")
      .replace(/\\/g, "")
      .trim();

    return clean || fallback;
  } catch {
    return fallback;
  }
}

export default function AdminPage() {
  const {
    lineUserId,
    isAuthenticated,
    isLoading: liffLoading,
  } = useLiff();

  const [activeTab, setActiveTab] = useState<
    "products" | "reports"
  >("products");

  const [pendingProducts, setPendingProducts] =
    useState<Product[]>([]);

  const [reports, setReports] =
    useState<ProductReport[]>([]);

  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] =
    useState(false);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [adminNotes, setAdminNotes] = useState<
    Record<string, string>
  >({});

  const [showAllReports, setShowAllReports] =
    useState(false);

  const isAdmin =
    Boolean(lineUserId) &&
    ADMIN_IDS.includes(lineUserId || "") &&
    isAuthenticated;

  useEffect(() => {
    if (liffLoading) return;

    if (!isAdmin) {
      setLoading(false);
      return;
    }

    void fetchProducts();
  }, [liffLoading, isAdmin]);

  // 讀取待審核商品
  async function fetchProducts() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "pending")
        .order("created_at", {
          ascending: false,
        });

      if (error) throw error;

      setPendingProducts(data || []);
    } catch (error) {
      console.error("讀取商品失敗:", error);
      setErrorMessage("讀取待審核商品失敗");
    } finally {
      setLoading(false);
    }
  }

  // 讀取商品檢舉
  async function fetchReports() {
    setReportsLoading(true);
    setErrorMessage("");

    try {
      const result = await contactRequest(
        "/api/admin/reports",
        "GET"
      );

      if (!result.success) {
        throw new Error(
          result.error || "讀取檢舉紀錄失敗"
        );
      }

      setReports(result.reports || []);
    } catch (error) {
      console.error("讀取檢舉失敗:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "讀取檢舉紀錄失敗"
      );
    } finally {
      setReportsLoading(false);
    }
  }

  // 切換分頁
  function changeTab(tab: "products" | "reports") {
    setActiveTab(tab);
    setErrorMessage("");
    setSuccessMessage("");

    if (tab === "reports") {
      void fetchReports();
    }
  }

  // 刷新
  function handleRefresh() {
    setErrorMessage("");
    setSuccessMessage("");

    if (activeTab === "products") {
      void fetchProducts();
    } else {
      void fetchReports();
    }
  }

  // 准許商品上架
  async function handleApprove(id: string) {
    const product = pendingProducts.find(
      (p) => p.id === id
    );

    if (!product || processingId) return;

    setProcessingId(id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase
        .from("products")
        .update({
          is_approved: true,
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      const cleanImgUrl = getImageUrl(
        product.image_url
      );

      try {
        await fetch("/api/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "UPDATE",
            status: "approved",
            line_user_id: product.line_user_id,
            name: product.name,
            price: product.price,
            productImage:
              cleanImgUrl.startsWith("http")
                ? cleanImgUrl
                : undefined,
          }),
        });
      } catch (notifyError) {
        console.error(
          "LINE 通知失敗:",
          notifyError
        );
      }

      setPendingProducts((prev) =>
        prev.filter((p) => p.id !== id)
      );

      setSuccessMessage(
        "商品已准許上架"
      );
    } catch (error) {
      console.error("核准失敗:", error);
      setErrorMessage("商品核准失敗");
    } finally {
      setProcessingId(null);
    }
  }

  // 退回商品
  async function handleReject(id: string) {
    const product = pendingProducts.find(
      (p) => p.id === id
    );

    if (!product || processingId) return;

    setProcessingId(id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase
        .from("products")
        .update({
          status: "rejected",
          is_approved: false,
        })
        .eq("id", id);

      if (error) throw error;

      const cleanImgUrl = getImageUrl(
        product.image_url
      );

      try {
        await fetch("/api/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "UPDATE",
            status: "rejected",
            line_user_id: product.line_user_id,
            name: product.name,
            price: product.price,
            productImage:
              cleanImgUrl.startsWith("http")
                ? cleanImgUrl
                : undefined,
          }),
        });
      } catch (notifyError) {
        console.error(
          "LINE 通知失敗:",
          notifyError
        );
      }

      setPendingProducts((prev) =>
        prev.filter((p) => p.id !== id)
      );

      setSuccessMessage("商品已退回");
    } catch (error) {
      console.error("退回商品失敗:", error);
      setErrorMessage("商品退回失敗");
    } finally {
      setProcessingId(null);
    }
  }

  // 審核檢舉
  async function handleReportAction(
    report: ProductReport,
    action: "dismiss" | "remove"
  ) {
    if (processingId) return;

    const message =
      action === "remove"
        ? `確定要將「${report.product?.name || "此商品"}」下架嗎？`
        : "確定要駁回這筆檢舉嗎？";

    if (!window.confirm(message)) {
      return;
    }

    setProcessingId(report.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await contactRequest(
        "/api/admin/reports",
        "POST",
        {
          reportId: report.id,
          action,
          adminNote:
            adminNotes[report.id]?.trim() || "",
        }
      );

      if (!result.success) {
        throw new Error(
          result.error || "審核失敗"
        );
      }

      setSuccessMessage(
        result.message ||
          "檢舉審核完成"
      );

      await fetchReports();
    } catch (error) {
      console.error("檢舉審核失敗:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "檢舉審核失敗"
      );
    } finally {
      setProcessingId(null);
    }
  }

  const pendingReports = reports.filter(
    (report) => report.status === "pending"
  );

  const displayedReports = showAllReports
    ? reports
    : pendingReports;

  if (liffLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FDFBF7]">
        <Loader2 className="animate-spin h-10 w-10 text-orange-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />

        <h1 className="text-2xl font-bold">
          權限不足
        </h1>

        <p className="mt-2 text-gray-500">
          請使用管理員 LINE 帳號並完成學校信箱驗證
        </p>

        <Button
          asChild
          className="mt-6 bg-orange-600 text-white rounded-xl"
        >
          <a href="/">回首頁</a>
        </Button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-24 text-slate-800 font-sans">
      {/* 頂部導覽 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Navigation />
            <ShieldCheck className="text-orange-500 w-6 h-6" />

            <h1 className="font-black text-lg tracking-tight">
              管理員後台
            </h1>
          </div>

          <Button
            onClick={handleRefresh}
            disabled={!!processingId || reportsLoading}
            variant="ghost"
            className="text-orange-600 font-bold hover:bg-orange-50"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-5">
        {/* 功能分頁 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => changeTab("products")}
            className={`rounded-2xl p-4 font-bold flex flex-col items-center gap-2 border transition-colors ${
              activeTab === "products"
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            <PackageCheck className="h-6 w-6" />
            <span>商品審核</span>
            <span className="text-xs">
              待審核 {pendingProducts.length} 筆
            </span>
          </button>

          <button
            type="button"
            onClick={() => changeTab("reports")}
            className={`rounded-2xl p-4 font-bold flex flex-col items-center gap-2 border transition-colors ${
              activeTab === "reports"
                ? "bg-red-500 text-white border-red-500"
                : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            <Flag className="h-6 w-6" />
            <span>檢舉審核</span>
            <span className="text-xs">
              待處理 {pendingReports.length} 筆
            </span>
          </button>
        </div>

        {/* 成功提示 */}
        {successMessage && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-2"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />

            <p className="text-sm text-green-700">
              {successMessage}
            </p>
          </div>
        )}

        {/* 錯誤提示 */}
        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-2"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />

            <p className="text-sm text-red-700 break-words">
              {errorMessage}
            </p>
          </div>
        )}

        {/* 商品審核 */}
        {activeTab === "products" && (
          <div className="space-y-6">
            {pendingProducts.length === 0 ? (
              <div className="py-20 text-center text-gray-400 font-medium">
                目前沒有待審核商品
              </div>
            ) : (
              pendingProducts.map((product) => (
                <Card
                  key={product.id}
                  className="border-none shadow-xl rounded-[32px] bg-white overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex gap-5 mb-7 text-left">
                      <div className="w-28 h-28 bg-gray-50 rounded-3xl overflow-hidden shrink-0 border border-gray-100">
                        <img
                          src={getImageUrl(
                            product.image_url
                          )}
                          className="w-full h-full object-cover"
                          alt={product.name}
                          onError={(event) => {
                            event.currentTarget.src =
                              "/placeholder-logo.png";
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <Badge className="w-fit bg-orange-50 text-orange-700 border-none mb-2 px-3 py-1 rounded-full text-xs font-bold">
                          {product.category}
                        </Badge>

                        <h3 className="text-xl font-bold text-slate-900 truncate mb-1">
                          {product.name}
                        </h3>

                        <p className="text-2xl font-black text-orange-600">
                          NT${" "}
                          {Number(
                            product.price
                          ).toLocaleString("zh-TW")}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() =>
                          handleApprove(product.id)
                        }
                        disabled={!!processingId}
                        className="flex-[2] bg-[#00E000] hover:bg-[#00CC00] text-white h-16 rounded-2xl text-lg font-black"
                      >
                        {processingId === product.id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          "准許上架"
                        )}
                      </Button>

                      <Button
                        onClick={() =>
                          handleReject(product.id)
                        }
                        disabled={!!processingId}
                        className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-500 h-16 rounded-2xl font-bold"
                      >
                        退回
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* 檢舉審核 */}
        {activeTab === "reports" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold text-lg">
                商品檢舉紀錄
              </h2>

              <button
                type="button"
                onClick={() =>
                  setShowAllReports((prev) => !prev)
                }
                className="text-sm font-bold text-orange-600"
              >
                {showAllReports
                  ? "只看待審核"
                  : "查看全部紀錄"}
              </button>
            </div>

            {reportsLoading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : displayedReports.length === 0 ? (
              <div className="py-20 text-center text-gray-400 font-medium">
                目前沒有符合條件的檢舉紀錄
              </div>
            ) : (
              displayedReports.map((report) => (
                <Card
                  key={report.id}
                  className="border border-gray-100 shadow-lg rounded-3xl bg-white overflow-hidden"
                >
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        className={
                          report.status === "pending"
                            ? "bg-yellow-100 text-yellow-700 border-none"
                            : report.status === "resolved"
                            ? "bg-green-100 text-green-700 border-none"
                            : "bg-gray-100 text-gray-600 border-none"
                        }
                      >
                        {report.status === "pending"
                          ? "待審核"
                          : report.status === "resolved"
                          ? "已確認違規"
                          : "已駁回"}
                      </Badge>

                      <span className="text-xs text-gray-400">
                        {new Date(
                          report.created_at
                        ).toLocaleString("zh-TW")}
                      </span>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-24 h-24 shrink-0 rounded-2xl bg-gray-50 overflow-hidden border">
                        <img
                          src={getImageUrl(
                            report.product?.image_url
                          )}
                          alt={
                            report.product?.name ||
                            "商品圖片"
                          }
                          className="w-full h-full object-cover"
                          onError={(event) => {
                            event.currentTarget.src =
                              "/placeholder-logo.png";
                          }}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-lg break-words">
                          {report.product?.name ||
                            "商品資料不存在"}
                        </h3>

                        <p className="text-sm text-orange-600 font-bold mt-1">
                          NT${" "}
                          {Number(
                            report.product?.price || 0
                          ).toLocaleString("zh-TW")}
                        </p>

                        <p className="text-xs text-gray-500 mt-1">
                          商品狀態：
                          {report.product?.status ||
                            "未知"}
                        </p>

                        {report.product && (
                          <a
                            href={`/products/${report.product_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600"
                          >
                            查看商品
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl bg-red-50 p-4 space-y-2">
                      <p className="text-sm font-bold text-red-700">
                        檢舉原因：
                        {REASON_LABELS[report.reason] ||
                          report.reason}
                      </p>

                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                        {report.description ||
                          "檢舉者未填寫補充說明"}
                      </p>
                    </div>

                    {report.status === "pending" ? (
                      <>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            管理員審核備註（選填）
                          </label>

                          <textarea
                            value={
                              adminNotes[report.id] || ""
                            }
                            onChange={(event) =>
                              setAdminNotes((prev) => ({
                                ...prev,
                                [report.id]:
                                  event.target.value,
                              }))
                            }
                            maxLength={2000}
                            rows={3}
                            placeholder="輸入審核原因或處理說明..."
                            disabled={!!processingId}
                            className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-orange-400"
                          />
                        </div>

                        <div className="flex gap-3">
                          <Button
                            onClick={() =>
                              handleReportAction(
                                report,
                                "dismiss"
                              )
                            }
                            disabled={!!processingId}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 h-14 rounded-xl font-bold"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            駁回檢舉
                          </Button>

                          <Button
                            onClick={() =>
                              handleReportAction(
                                report,
                                "remove"
                              )
                            }
                            disabled={!!processingId}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white h-14 rounded-xl font-bold"
                          >
                            {processingId === report.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Flag className="h-4 w-4 mr-1" />
                                確認違規並下架
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl bg-gray-50 p-4">
                        <p className="text-sm font-bold text-gray-700">
                          審核結果
                        </p>

                        <p className="text-sm text-gray-600 mt-1">
                          {report.status === "resolved"
                            ? "已確認違規並處理"
                            : "檢舉已駁回"}
                        </p>

                        {report.admin_note && (
                          <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                            備註：{report.admin_note}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
