                setCondition(e.target.value)
              }
              disabled={isSubmitting}
              required
              className="flex h-12 w-full min-w-0 appearance-auto rounded-xl border border-input bg-background px-3 py-2 text-base text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#D95300]"
            >
              <option value="" disabled>
                請選擇商品新舊程度
              </option>

              {CONDITIONS.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.label}
                </option>
              ))}
            </select>

            <p className="text-xs text-slate-500">
              請依照商品實際使用狀況選擇。
            </p>
          </div>

          {/* 價格 */}

          <div className="space-y-2">
            <Label htmlFor="price">
              預售價格 (NT$) *
            </Label>

            <Input
              id="price"
              type="number"
              min="0"
              max="2147483647"
              step="1"
              inputMode="numeric"
              placeholder="請輸入金額"
              value={price}
              onChange={(e) =>
                setPrice(e.target.value)
              }
              disabled={isSubmitting}
              required
              className="h-12 rounded-xl"
            />
          </div>

          {/* LINE 聯絡方式 */}

          <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

            <div className="space-y-1">
              <p className="text-sm font-bold text-emerald-800">
                LINE 聯絡方式自動帶入
              </p>

              <p className="text-xs leading-relaxed text-emerald-700">
                系統會使用你在個人中心設定的私人
                LINE 加好友連結，刊登時不需要重複輸入。
              </p>
            </div>
          </div>

          {/* 商品詳情 */}

          <div className="space-y-2">
            <Label htmlFor="description">
              商品詳情
            </Label>

            <Textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="說明物品瑕疵、面交地點等"
              disabled={aiLoading || isSubmitting}
              maxLength={2000}
              className="rounded-xl"
            />
          </div>

          {/* 商品儲存錯誤訊息 */}

          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <p className="whitespace-pre-wrap break-words">
                {submitError}
              </p>
            </div>
          )}

          {/* 送出審核 */}

          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-[#D95300] hover:bg-[#B84600] text-white font-bold text-base"
            disabled={
              isSubmitting ||
              uploadingImage ||
              aiLoading
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                資料處理中...
              </>
            ) : uploadingImage ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                正在上傳照片...
              </>
            ) : aiLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                AI 正在辨識商品...
