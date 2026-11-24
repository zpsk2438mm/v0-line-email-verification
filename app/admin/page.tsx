
"use client";

import { useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
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
  Sparkles,
  Clock,
  ShieldAlert,
} from "lucide-react";

// ==========================================
// 管理員 LINE ID
// 前端僅用於介面顯示
// 實際權限由後端 API 驗證
// ==========================================

const ADMIN_IDS = [
  "Ued7dfd77b63273d497cebc62f1a7b1df",
  "Uf7c4668bc96315297b02b0a67fff88ea",
  "U6d1c1541184ea9202c0d0acc07e92a4e",
  "Uaea09099f0f6301955360eb64d238243",
];

// ==========================================
// 型別定義
// ==========================================

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  condition?: string | null;
  description?: string | null;
  image_url?: unknown;
  line_user_id?: string | null;
  status?: string;
  is_approved?: boolean;
  created_at?: string;
  approved_at?: string | null;

  ai_review_status?: string;
  ai_review_reason?: string | null;
  ai_risk_level?: string | null;
  ai_review_flags?: string[];
  ai_reviewed_at?: string | null;
  ai_review_model?: string | null;
  ai_review_version?: string;
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

// ==========================================
// 商品分類中文名稱
// ==========================================

const CATEGORY_LABELS: Record<string, string> = {
  electronics: "電子產品",
  books: "書籍教材",
  tools_stationery: "文具／專業工具",
  dorm_supplies: "租屋收納／雜貨",
  hobbies: "遊戲／娛樂",
  cosmetics: "化妝品／美妝",
  food: "食物／零食",
  clothing: "服飾配件",
  furniture: "家具家電",
  sports: "運動用品",
  other: "其他",
};

// ==========================================
// 商品新舊程度
// ==========================================

const CONDITION_LABELS: Record<string, string> = {
  new_sealed: "全新未拆封",
  new_opened: "全新已拆封",
  like_new: "近全新（9成新以上）",
  good: "保存良好（7～8成新）",
  fair: "有使用痕跡（5～6成新）",
  used: "明顯使用痕跡（5成新以下）",
};

// ==========================================
// 檢舉原因
// ==========================================

const REASON_LABELS: Record<string, string> = {
  fraud: "詐騙或可疑交易",
  prohibited: "違禁或不適合販售的商品",
  misleading: "商品資訊不實",
  spam: "垃圾訊息或重複刊登",
  harassment: "騷擾或不當內容",
  other: "其他原因",
};

// ==========================================
// AI 風險標記中文名稱
// ==========================================

const AI_FLAG_LABELS: Record<string, string> = {
  image_text_mismatch: "商品圖文不一致",
  prohibited_item: "疑似違禁商品",
  inappropriate_content: "不當內容",
  fraud_risk: "疑似詐騙風險",
  personal_information: "敏感個人資料",
  wrong_category: "商品分類不符",
  incomplete_information: "商品資訊不足",
  abnormal_price: "商品價格異常",
  counterfeit_risk: "疑似仿冒風險",
  unclear_image: "商品照片不清楚或無法分析",
  uncertain: "AI 無法確定",
};

// ==========================================
// AI 審核狀態
// ==========================================

const AI_STATUS_LABELS: Record<string, string> = {
  not_reviewed: "尚未進行 AI 審核",
  pending: "等待 AI 審核",
  reviewing: "AI 正在審核",
  passed: "AI 建議通過",
  manual_review: "需要人工審核",
  failed: "AI 審核失敗",
};

// ==========================================
// AI 風險等級
// ==========================================

const RISK_LABELS: Record<string, string> = {
  low: "低風險",
  medium: "中風險",
  high: "高風險",
};

// ==========================================
// 商品狀態
// ==========================================

const PRODUCT_STATUS_LABELS: Record<string, string> = {
  pending: "待審核",
  approved: "已上架",
  rejected: "審核未通過",
  reported: "檢舉審核中",
  removed: "違規下架",
};

// ==========================================
// 處理商品圖片
// ==========================================

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

    const cleaned = value
      .replace(/[\[\]"']/g, "")
      .replace(/\\/g, "")
      .trim();

    if (!cleaned) return fallback;

    const url = new URL(cleaned);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return fallback;
    }

    return cleaned;
  } catch {
    return fallback;
  }
}

// ==========================================
// AI 狀態樣式
// ==========================================

function getAIStatusStyle(status?: string) {
  switch (status) {
    case "passed":
      return "bg-green-100 text-green-700";

    case "manual_review":
      return "bg-amber-100 text-amber-700";

    case "failed":
      return "bg-red-100 text-red-700";

    case "reviewing":
      return "bg-purple-100 text-purple-700";

    case "pending":
      return "bg-blue-100 text-blue-700";

    default:
      return "bg-gray-100 text-gray-600";
  }
}

// ==========================================
// AI 風險樣式
// ==========================================

function getRiskStyle(risk?: string | null) {
  switch (risk) {
    case "low":
      return "bg-green-100 text-green-700";

    case "medium":
      return "bg-yellow-100 text-yellow-700";

    case "high":
      return "bg-red-100 text-red-700";

    default:
      return "bg-gray-100 text-gray-500";
  }
}

// ==========================================
// AI 審核結果元件
// ==========================================

function AIReviewCard({
  product,
}: {
  product: Product;
}) {
  const status =
    product.ai_review_status || "not_reviewed";

  const risk = product.ai_risk_level;

  const flags = Array.isArray(
    product.ai_review_flags
  )
    ? product.ai_review_flags.filter(
        (flag) => typeof flag === "string"
      )
    : [];

  return (
    <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 p-4 space-y-3">

      {/* AI 標題 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />

          <h4 className="font-bold text-purple-800">
            AI 智慧審核
          </h4>
        </div>

        {risk && (
          <Badge
            className={`border-none ${getRiskStyle(
              risk
            )}`}
          >
            {RISK_LABELS[risk] || "未知風險"}
          </Badge>
        )}
      </div>

      {/* AI 審核狀態 */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          className={`border-none px-3 py-1 ${getAIStatusStyle(
            status
          )}`}
        >
          {status === "reviewing" && (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          )}

          {status === "pending" && (
            <Clock className="mr-1 h-3 w-3" />
          )}

          {status === "passed" && (
            <CheckCircle2 className="mr-1 h-3 w-3" />
          )}

          {status === "manual_review" && (
            <ShieldAlert className="mr-1 h-3 w-3" />
          )}

          {status === "failed" && (
            <AlertCircle className="mr-1 h-3 w-3" />
          )}

          {AI_STATUS_LABELS[status] || "未知狀態"}
        </Badge>
      </div>

      {/* AI 審核原因 */}
      <div className="rounded-xl bg-white/80 p-3 space-y-1">
        <p className="text-xs font-bold text-purple-700">
          AI 審核原因
        </p>

        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
          {product.ai_review_reason ||
            (status === "pending"
              ? "商品已進入 AI 審核等待狀態。"
              : status === "reviewing"
              ? "AI 正在分析商品照片及資訊。"
              : status === "not_reviewed"
              ? "目前尚無 AI 審核紀錄。"
              : "目前沒有審核原因。")}
        </p>
      </div>

      {/* AI 風險標記 */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-purple-700">
          風險標記
        </p>

        {flags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {flags.map((flag, index) => (
              <Badge
                key={`${flag}-${index}`}
                className="bg-orange-100 text-orange-700 border-none whitespace-normal"
              >
                {AI_FLAG_LABELS[flag] || flag}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            {status === "passed"
              ? "未發現明顯風險"
              : "目前沒有風險標記紀錄"}
          </p>
        )}
      </div>

      {/* AI 審核時間及模型 */}
      {(product.ai_reviewed_at ||
        product.ai_review_model) && (
        <div className="border-t border-purple-200 pt-2 space-y-1">

          {product.ai_reviewed_at && (
            <p className="text-xs text-purple-500">
              審核時間：
              {new Date(
                product.ai_reviewed_at
              ).toLocaleString("zh-TW")}
            </p>
          )}

          {product.ai_review_model && (
            <p className="text-xs text-purple-500 break-all">
              AI 模型：{product.ai_review_model}
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-purple-600 leading-relaxed">
        AI 審核結果僅供參考，商品最終審核仍以管理員決定為準。
      </p>
    </div>
  );
}

// ==========================================
// 管理員後台
// ==========================================

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

  const [loading, setLoading] =
    useState(true);

  const [reportsLoading, setReportsLoading] =
    useState(true);

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

  const [productFilter, setProductFilter] =
    useState<
      "all" | "waiting" | "manual" | "passed"
    >("all");

  // 前端介面權限判斷
  const isAdmin =
    Boolean(lineUserId) &&
    ADMIN_IDS.includes(lineUserId || "") &&
    isAuthenticated;

  // ========================================
  // 初始化後台
  // ========================================

  useEffect(() => {
    if (liffLoading) return;

    if (!isAdmin) {
      setLoading(false);
      setReportsLoading(false);
      setPendingProducts([]);
      setReports([]);
      return;
    }

    void fetchProducts();
    void fetchReports();
  }, [liffLoading, isAdmin, lineUserId]);

  // ========================================
  // 讀取待審核商品
  // 改用後端 API
  // ========================================

  async function fetchProducts() {
    setLoading(true);

    try {
      const result = await contactRequest(
        "/api/admin/products",
        "GET"
      );

      if (
        !result?.success ||
        !Array.isArray(result.products)
      ) {
        throw new Error(
          result?.error ||
            "讀取待審核商品失敗"
        );
      }

      setPendingProducts(result.products);
    } catch (error: unknown) {
      console.error(
        "讀取商品失敗:",
        error
      );

      setPendingProducts([]);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "讀取待審核商品失敗"
      );
    } finally {
      setLoading(false);
    }
  }

  // ========================================
  // 讀取商品檢舉
  // 保留原本 API
  // ========================================

  async function fetchReports() {
    setReportsLoading(true);

    try {
      const result = await contactRequest(
        "/api/admin/reports",
        "GET"
      );

      if (
        !result?.success ||
        !Array.isArray(result.reports)
      ) {
        throw new Error(
          result?.error ||
            "讀取檢舉紀錄失敗"
        );
      }

      setReports(result.reports);
    } catch (error: unknown) {
      console.error(
        "讀取檢舉失敗:",
        error
      );

      setReports([]);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "讀取檢舉紀錄失敗"
      );
    } finally {
      setReportsLoading(false);
    }
  }

  // ========================================
  // 切換分頁
  // ========================================

  function changeTab(
    tab: "products" | "reports"
  ) {
    setActiveTab(tab);
    setErrorMessage("");
    setSuccessMessage("");
  }

  // ========================================
  // 手動刷新
  // ========================================

  function handleRefresh() {
    setErrorMessage("");
    setSuccessMessage("");

    if (activeTab === "products") {
      void fetchProducts();
    } else {
      void fetchReports();
    }
  }

  // ========================================
  // 管理員人工審核商品
  // ========================================

  async function handleProductAction(
    product: Product,
    action: "approve" | "reject"
  ) {
    if (processingId) return;

    if (!product.ai_review_version) {
      setErrorMessage(
        "商品缺少審核版本，請重新整理。"
      );
      return;
    }

    const message =
      action === "approve"
        ? `確定要准許「${product.name}」上架嗎？`
        : `確定要退回「${product.name}」嗎？`;

    if (!window.confirm(message)) {
      return;
    }

    setProcessingId(product.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await contactRequest(
        "/api/admin/products",
        "POST",
        {
          productId: product.id,
          action,
          reviewVersion:
            product.ai_review_version,
        }
      );

      if (!result?.success) {
        throw new Error(
          result?.error ||
            "商品審核失敗"
        );
      }

      setPendingProducts((prev) =>
        prev.filter(
          (item) => item.id !== product.id
        )
      );

      setSuccessMessage(
        result.message ||
          (action === "approve"
            ? "商品已准許上架"
            : "商品已退回")
      );

      // LINE 通知及智慧媒合
      // 由 Supabase 既有觸發器負責
      // 不再由前端呼叫 /api/notify
    } catch (error: unknown) {
      console.error(
        "商品審核失敗:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "商品審核失敗"
      );
    } finally {
      setProcessingId(null);
    }
  }

  // ========================================
  // 審核檢舉
  // 保留原本處理流程
  // ========================================

  async function handleReportAction(
    report: ProductReport,
    action: "dismiss" | "remove"
  ) {
    if (processingId) return;

    const message =
      action === "remove"
        ? `確定要將「${
            report.product?.name || "此商品"
          }」下架嗎？`
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
            adminNotes[report.id]?.trim() ||
            "",
        }
      );

      if (!result?.success) {
        throw new Error(
          result?.error || "審核失敗"
        );
      }

      setSuccessMessage(
        result.message || "檢舉審核完成"
      );

      await Promise.all([
        fetchReports(),
        fetchProducts(),
      ]);
    } catch (error: unknown) {
      console.error(
        "檢舉審核失敗:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "檢舉審核失敗"
      );
    } finally {
      setProcessingId(null);
    }
  }

  // ========================================
  // AI 審核統計
  // ========================================

  const waitingProducts =
    pendingProducts.filter(
      (product) =>
        !product.ai_review_status ||
        product.ai_review_status ===
          "not_reviewed" ||
        product.ai_review_status ===
          "pending" ||
        product.ai_review_status ===
          "reviewing"
    );

  const manualReviewProducts =
    pendingProducts.filter(
      (product) =>
        product.ai_review_status ===
          "manual_review" ||
        product.ai_review_status === "failed"
    );

  const passedProducts =
    pendingProducts.filter(
      (product) =>
        product.ai_review_status === "passed"
    );

  const highRiskProducts =
    pendingProducts.filter(
      (product) =>
        product.ai_risk_level === "high"
    );

  const displayedProducts =
    productFilter === "waiting"
      ? waitingProducts
      : productFilter === "manual"
      ? manualReviewProducts
      : productFilter === "passed"
      ? passedProducts
      : pendingProducts;

  const pendingReports = reports.filter(
    (report) => report.status === "pending"
  );

  const displayedReports = showAllReports
    ? reports
    : pendingReports;

  // ========================================
  // LINE 初始化畫面
  // ========================================

  if (liffLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FDFBF7]">
        <Loader2 className="animate-spin h-10 w-10 text-orange-500" />
      </div>
    );
  }

  // ========================================
  // 管理員權限驗證
  // ========================================

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

  // ========================================
  // 管理員後台介面
  // ========================================

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
            disabled={
              !!processingId ||
              loading ||
              reportsLoading
            }
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
            onClick={() =>
              changeTab("products")
            }
            className={`rounded-2xl p-4 font-bold flex flex-col items-center gap-2 border transition-colors ${
              activeTab === "products"
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            <PackageCheck className="h-6 w-6" />

            <span>商品審核</span>

            <span className="text-xs">
              {loading
                ? "載入中..."
                : `待審核 ${pendingProducts.length} 筆`}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              changeTab("reports")
            }
            className={`rounded-2xl p-4 font-bold flex flex-col items-center gap-2 border transition-colors ${
              activeTab === "reports"
                ? "bg-red-500 text-white border-red-500"
                : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            <Flag className="h-6 w-6" />

            <span>檢舉審核</span>

            <span className="text-xs">
              {reportsLoading
                ? "載入中..."
                : `待處理 ${pendingReports.length} 筆`}
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

        {/* =================================
            商品審核分頁
        ================================= */}

        {activeTab === "products" && (
          <div className="space-y-5">

            {/* AI 審核統計 */}
            <Card className="rounded-2xl border-purple-200 bg-white p-4 shadow-sm space-y-4">

              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />

                <h2 className="font-bold text-purple-800">
                  AI 智慧審核總覽
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">

                <div className="rounded-xl bg-blue-50 p-3">
                  <p className="text-xs font-medium text-blue-600">
                    等待 AI 審核
                  </p>

                  <p className="mt-1 text-2xl font-black text-blue-700">
                    {waitingProducts.length}
                  </p>
                </div>

                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-xs font-medium text-amber-600">
                    需要人工審核
                  </p>

                  <p className="mt-1 text-2xl font-black text-amber-700">
                    {manualReviewProducts.length}
                  </p>
                </div>

                <div className="rounded-xl bg-green-50 p-3">
                  <p className="text-xs font-medium text-green-600">
                    AI 建議通過
                  </p>

                  <p className="mt-1 text-2xl font-black text-green-700">
                    {passedProducts.length}
                  </p>
                </div>

                <div className="rounded-xl bg-red-50 p-3">
                  <p className="text-xs font-medium text-red-600">
                    高風險商品
                  </p>

                  <p className="mt-1 text-2xl font-black text-red-700">
                    {highRiskProducts.length}
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                統計範圍為目前載入的待審核商品，最多 200 筆。
              </p>
            </Card>

            {/* AI 審核篩選 */}
            <div className="flex flex-wrap gap-2">

              {(
                [
                  {
                    id: "all",
                    label: "全部",
                  },
                  {
                    id: "waiting",
                    label: "等待 AI",
                  },
                  {
                    id: "manual",
                    label: "人工審核",
                  },
                  {
                    id: "passed",
                    label: "AI 建議通過",
                  },
                ] as const
              ).map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() =>
                    setProductFilter(filter.id)
                  }
                  className={`rounded-full px-4 py-2 text-xs font-bold border transition-colors ${
                    productFilter === filter.id
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* 商品清單 */}
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16">

                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />

                <p className="text-sm text-gray-500">
                  正在載入待審核商品...
                </p>
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="py-20 text-center text-gray-400 font-medium">
                目前沒有符合條件的待審核商品
              </div>
            ) : (
              displayedProducts.map(
                (product) => (
                  <Card
                    key={product.id}
                    className="border-none shadow-xl rounded-[32px] bg-white overflow-hidden"
                  >

                    <div className="p-6 space-y-5">

                      {/* 商品基本資料 */}
                      <div className="flex gap-5 text-left">

                        <div className="w-28 h-28 bg-gray-50 rounded-3xl overflow-hidden shrink-0 border border-gray-100">

                          <img
                            src={getImageUrl(
                              product.image_url
                            )}
                            className="w-full h-full object-cover"
                            alt={product.name}
                            onError={(event) => {
                              if (
                                !event.currentTarget.src.endsWith(
                                  "/placeholder-logo.png"
                                )
                              ) {
                                event.currentTarget.src =
                                  "/placeholder-logo.png";
                              }
                            }}
                          />
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-center">

                          <Badge className="w-fit bg-orange-50 text-orange-700 border-none mb-2 px-3 py-1 rounded-full text-xs font-bold">
                            {CATEGORY_LABELS[
                              product.category
                            ] || product.category}
                          </Badge>

                          <h3 className="text-xl font-bold text-slate-900 break-words mb-1">
                            {product.name}
                          </h3>

                          <p className="text-2xl font-black text-orange-600">
                            NT${" "}
                            {Number(
                              product.price
                            ).toLocaleString(
                              "zh-TW"
                            )}
                          </p>

                          {product.condition && (
                            <p className="mt-1 text-xs text-gray-500">
                              {CONDITION_LABELS[
                                product.condition
                              ] ||
                                product.condition}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 商品詳情 */}
                      <div className="rounded-xl bg-gray-50 p-3 space-y-1">

                        <p className="text-xs font-bold text-gray-600">
                          商品詳情
                        </p>

                        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                          {product.description ||
                            "賣家未填寫商品詳情"}
                        </p>

                        {product.created_at && (
                          <p className="pt-2 text-xs text-gray-400">
                            刊登時間：
                            {new Date(
                              product.created_at
                            ).toLocaleString(
                              "zh-TW"
                            )}
                          </p>
                        )}
                      </div>

                      {/* AI 審核結果 */}
                      <AIReviewCard
                        product={product}
                      />

                      {/* 人工審核按鈕 */}
                      <div className="flex gap-3">

                        <Button
                          onClick={() =>
                            handleProductAction(
                              product,
                              "approve"
                            )
                          }
                          disabled={
                            !!processingId
                          }
                          className="flex-[2] bg-[#00E000] hover:bg-[#00CC00] text-white h-16 rounded-2xl text-lg font-black"
                        >
                          {processingId ===
                          product.id ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            "准許上架"
                          )}
                        </Button>

                        <Button
                          onClick={() =>
                            handleProductAction(
                              product,
                              "reject"
                            )
                          }
                          disabled={
                            !!processingId
                          }
                          className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-500 h-16 rounded-2xl font-bold"
                        >
                          退回
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              )
            )}
          </div>
        )}

        {/* =================================
            檢舉審核分頁
        ================================= */}

        {activeTab === "reports" && (
          <div className="space-y-5">

            <div className="flex items-center justify-between gap-2">

              <h2 className="font-bold text-lg">
                商品檢舉紀錄
              </h2>

              <button
                type="button"
                onClick={() =>
                  setShowAllReports(
                    (prev) => !prev
                  )
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
              displayedReports.map(
                (report) => (
                  <Card
                    key={report.id}
                    className="border border-gray-100 shadow-lg rounded-3xl bg-white overflow-hidden"
                  >

                    <div className="p-5 space-y-4">

                      {/* 檢舉狀態 */}
                      <div className="flex items-center justify-between gap-2">

                        <Badge
                          className={
                            report.status ===
                            "pending"
                              ? "bg-yellow-100 text-yellow-700 border-none"
                              : report.status ===
                                "resolved"
                              ? "bg-green-100 text-green-700 border-none"
                              : "bg-gray-100 text-gray-600 border-none"
                          }
                        >
                          {report.status ===
                          "pending"
                            ? "待審核"
                            : report.status ===
                              "resolved"
                            ? "已確認違規"
                            : "已駁回"}
                        </Badge>

                        <span className="text-xs text-gray-400">
                          {new Date(
                            report.created_at
                          ).toLocaleString(
                            "zh-TW"
                          )}
                        </span>
                      </div>

                      {/* 被檢舉商品 */}
                      <div className="flex gap-4">

                        <div className="w-24 h-24 shrink-0 rounded-2xl bg-gray-50 overflow-hidden border">

                          <img
                            src={getImageUrl(
                              report.product
                                ?.image_url
                            )}
                            alt={
                              report.product
                                ?.name ||
                              "商品圖片"
                            }
                            className="w-full h-full object-cover"
                            onError={(event) => {
                              if (
                                !event.currentTarget.src.endsWith(
                                  "/placeholder-logo.png"
                                )
                              ) {
                                event.currentTarget.src =
                                  "/placeholder-logo.png";
                              }
                            }}
                          />
                        </div>

                        <div className="min-w-0 flex-1">

                          <h3 className="font-bold text-lg break-words">
                            {report.product
                              ?.name ||
                              "商品資料不存在"}
                          </h3>

                          <p className="text-sm text-orange-600 font-bold mt-1">
                            NT${" "}
                            {Number(
                              report.product
                                ?.price || 0
                            ).toLocaleString(
                              "zh-TW"
                            )}
                          </p>

                          <p className="text-xs text-gray-500 mt-1">
                            商品狀態：
                            {PRODUCT_STATUS_LABELS[
                              report.product
                                ?.status || ""
                            ] ||
                              report.product
                                ?.status ||
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

                      {/* 檢舉原因 */}
                      <div className="rounded-xl bg-red-50 p-4 space-y-2">

                        <p className="text-sm font-bold text-red-700">
                          檢舉原因：
                          {REASON_LABELS[
                            report.reason
                          ] || report.reason}
                        </p>

                        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                          {report.description ||
                            "檢舉者未填寫補充說明"}
                        </p>
                      </div>

                      {/* 待審核檢舉 */}
                      {report.status ===
                      "pending" ? (
                        <>

                          <div>

                            <label className="block text-sm font-bold text-gray-700 mb-2">
                              管理員審核備註（選填）
                            </label>

                            <textarea
                              value={
                                adminNotes[
                                  report.id
                                ] || ""
                              }
                              onChange={(
                                event
                              ) =>
                                setAdminNotes(
                                  (prev) => ({
                                    ...prev,
                                    [report.id]:
                                      event
                                        .target
                                        .value,
                                  })
                                )
                              }
                              maxLength={2000}
                              rows={3}
                              placeholder="輸入審核原因或處理說明..."
                              disabled={
                                !!processingId
                              }
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
                              disabled={
                                !!processingId
                              }
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
                              disabled={
                                !!processingId
                              }
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white h-14 rounded-xl font-bold"
                            >
                              {processingId ===
                              report.id ? (
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
                            {report.status ===
                            "resolved"
                              ? "已確認違規並處理"
                              : "檢舉已駁回"}
                          </p>

                          {report.admin_note && (
                            <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap break-words">
                              備註：
                              {report.admin_note}
                            </p>
                          )}

                          {report.reviewed_at && (
                            <p className="text-xs text-gray-400 mt-2">
                              審核時間：
                              {new Date(
                                report.reviewed_at
                              ).toLocaleString(
                                "zh-TW"
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                )
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}
