
"use client";

import { useState } from "react";
import {
  Flag,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
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
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (!open) return null;

  const handleClose = () => {
    if (submitting) return;

    setErrorMessage("");
    setSuccessMessage("");
    setReason("");
    setDescription("");
    onClose();
  };

  const handleSubmit = async () => {
    if (submitting || successMessage) return;

    setErrorMessage("");
    setSuccessMessage("");

    if (!reason) {
      setErrorMessage("請選擇檢舉原因");
      return;
    }

    if (description.length > 2000) {
      setErrorMessage("補充說明不可超過 2000 字");
      return;
    }

    setSubmitting(true);

    try {
      console.log("開始送出商品檢舉", {
        productId,
        reason,
      });

      const result = await contactRequest(
        "/api/reports",
        "POST",
        {
          productId,
          reason,
          description: description.trim(),
        }
      );

      console.log("商品檢舉 API 回應", result);

      if (result.success !== true) {
        throw new Error(
          result.error || "檢舉送出失敗"
        );
      }

      setSuccessMessage(
        "檢舉成功！商品已暫時隱藏，等待管理員審核。"
      );

      setReason("");
      setDescription("");
    } catch (error) {
      console.error("檢舉商品失敗：", error);

      const message =
        error instanceof Error
          ? error.message
          : "檢舉失敗，請稍後再試";

      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
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
            onClick={handleClose}
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

        {successMessage && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

              <div>
                <p className="text-sm font-bold text-green-700">
                  檢舉已送出
                </p>

                <p className="mt-1 text-sm text-green-700">
                  {successMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <p className="text-sm font-bold text-red-700">
                  檢舉送出失敗
                </p>

                <p className="mt-1 break-words text-sm text-red-700">
                  {errorMessage}
                </p>
              </div>
            </div>
          </div>
        )}

        {!successMessage && (
          <>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="report-reason"
                  className="mb-2 block text-sm font-medium text-gray-800"
                >
                  檢舉原因
                  <span className="text-red-500"> *</span>
                </label>

                <select
                  id="report-reason"
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    setErrorMessage("");
                  }}
                  disabled={submitting}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-red-400"
                >
                  <option value="">
                    請選擇檢舉原因
                  </option>

                  {REPORT_REASONS.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
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
              送出檢舉後，商品會暫時從市集隱藏，
              等待管理員審核。
              若檢舉不成立，商品將恢復上架。
              同一帳號無法重複檢舉相同商品。
            </p>
          </>
        )}

        <div className="mt-6 flex gap-3">
          {successMessage ? (
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700"
            >
              完成
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                取消
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleSubmit();
                }}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
