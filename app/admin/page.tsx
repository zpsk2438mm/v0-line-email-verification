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
