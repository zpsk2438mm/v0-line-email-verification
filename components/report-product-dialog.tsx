
"use client";

import { useState } from "react";
import { Flag, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { contactRequest } from "@/lib/contact-client";

interface ReportProductDialogProps {
  productId: string;
  productName: string;
  open: boolean;
  onClose: () => void;
}

const REPORT_REASONS = [
  { value: "fraud", label: "詐騙或可疑交易" },
  { value: "prohibited", label: "違禁或不適合販售的商品" },
  { value: "misleading", label: "商品資訊不實" },
  { value: "spam", label: "垃圾訊息或重複刊登" },
  { value: "harassment", label: "騷擾或不當內容" },
  { value: "other", label: "其他原因" },
];

export default function ReportProductDialog({
  productId,
  productName,
  open,
  onClose,
}: ReportProductDialogProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (submitting) return;

    if (!reason) {
      toast.error("請選擇檢舉原因");
      return;
    }

    if (description.length > 2000) {
      toast.error("補充說明不可超過 2000 字");
      return;
    }

    setSubmitting(true);

    try {
      await contactRequest("/api/reports", "POST", {
        productId,
        reason,
        description: description.trim(),
      });

      toast.success("檢舉成功，等待管理員審核");

      setReason("");
      setDescription("");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "檢舉失敗，請稍後再試"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-500" />
            <h2
              id="report-dialog-title"
              className="text-lg font-bold text-gray-900"
            >
              檢舉商品
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="關閉檢舉視窗"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 break-words text-sm text-gray-600">
          檢舉商品：
          <span className="font-semibold text-gray-900">
            {productName}
          </span>
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="report-reason"
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              檢舉原因 <span className="text-red-500">*</span>
            </label>

            <select
              id="report-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={submitting}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-red-400"
            >
              <option value="">請選擇檢舉原因</option>

              {REPORT_REASONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="report-description"
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              補充說明（選填）
            </label>

            <textarea
              id="report-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              maxLength={2000}
              rows={4}
              disabled={submitting}
              placeholder="請描述商品有什麼問題，方便管理員審核..."
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-3 text-sm text-gray-900 outline-none focus:border-red-400"
            />

            <p className="mt-1 text-right text-xs text-gray-500">
              {description.length}/2000
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-gray-500">
          送出檢舉後，商品不會立即下架。
          管理員確認違規後才會進行處理。
          同一帳號無法重複檢舉相同商品。
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            取消
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !reason}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                送出中
              </>
            ) : (
              <>
                <Flag className="h-4 w-4" />
                送出檢舉
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
