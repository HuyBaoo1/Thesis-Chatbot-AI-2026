import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { crawlService } from "../../lib/crawl.service";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Spinner } from "../../components/ui/spinner";
import { formatDateTime } from "../../lib/utils";
import {
  CheckCircle,
  XCircle,
  FileText,
  RefreshCw,
  Eye,
  Loader2,
} from "lucide-react";

const URL_STATUS_COLORS = {
  PENDING: "bg-gray-50 text-gray-700 border-gray-200",
  CRAWLED: "bg-blue-50 text-blue-700 border-blue-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  PROCESSED: "bg-purple-50 text-purple-700 border-purple-200",
};

export function CrawlSessionDetail({ session, onClose, onRefresh }) {
  const [urls, setUrls] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [processingUrl, setProcessingUrl] = useState(null);
  const [viewMode, setViewMode] = useState(false);

  const fetchUrls = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const res = await crawlService.listUrls({
        crawl_session_id: session.id,
        limit: 100,
        offset: 0,
      });
      setUrls(res.data?.items || []);
      setTotal(res.data?.total || 0);
    } catch (error) {
      console.error("Failed to fetch crawled URLs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchUrls();
    }
  }, [session, fetchUrls]);

  const handleApprove = async (urlId) => {
    setProcessingUrl(urlId);
    try {
      await crawlService.approveUrl(urlId);
      fetchUrls();
    } catch (error) {
      console.error("Failed to approve URL:", error);
    } finally {
      setProcessingUrl(null);
    }
  };

  const handleReject = async (urlId) => {
    setProcessingUrl(urlId);
    try {
      await crawlService.rejectUrl(urlId);
      fetchUrls();
    } catch (error) {
      console.error("Failed to reject URL:", error);
    } finally {
      setProcessingUrl(null);
    }
  };

  const handleProcess = async (urlId) => {
    setProcessingUrl(urlId);
    try {
      await crawlService.processUrl(urlId);
      fetchUrls();
    } catch (error) {
      console.error("Failed to process URL:", error);
    } finally {
      setProcessingUrl(null);
    }
  };

  const handleProcessAll = async () => {
    if (!confirm("Process all APPROVED URLs?")) return;
    setProcessingUrl("all");
    try {
      await crawlService.processAllApproved(session.id);
      fetchUrls();
    } catch (error) {
      console.error("Failed to process all URLs:", error);
    } finally {
      setProcessingUrl(null);
    }
  };

  if (!session) return null;

  const approvedCount = urls.filter((u) => u.status === "APPROVED").length;

  return (
    <>
      <Dialog open={!!session} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Crawl Session: {session.target_url}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
                  <span>Status: {session.status}</span>
                  <span>
                    {urls.filter((u) => u.status === "CRAWLED").length} crawled / {total} total
                  </span>
                  <span>Approved: {approvedCount}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchUrls}
                    disabled={isLoading}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                  </Button>
                  {approvedCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleProcessAll}
                      disabled={processingUrl !== null}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Process All Approved
                    </Button>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Spinner size="lg" />
                </div>
              ) : !urls.length ? (
                <div className="text-center py-8 text-[var(--color-text-muted)]">
                  No URLs crawled yet. Poll to check status.
                </div>
              ) : (
                <div className="space-y-2">
                  {urls.map((url) => (
                    <div
                      key={url.id}
                      className="p-3 border border-border rounded-lg hover:bg-[var(--color-surface-secondary)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={URL_STATUS_COLORS[url.status] || ""}>
                              {url.status}
                            </Badge>
                            {url.metadata_json?.category && (
                              <Badge variant="outline">{url.metadata_json.category}</Badge>
                            )}
                            {url.metadata_json?.year && (
                              <span className="text-xs text-[var(--color-text-muted)]">
                                {url.metadata_json.year}
                              </span>
                            )}
                          </div>
                          <h4 className="font-medium text-sm mb-1 break-all">
                            {url.title || url.url}
                          </h4>
                          <p className="text-xs text-[var(--color-text-muted)] break-all">
                            {url.url}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedUrl(url);
                              setViewMode(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {url.status === "CRAWLED" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApprove(url.id)}
                                disabled={processingUrl !== null}
                                className="text-emerald-600"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleReject(url.id)}
                                disabled={processingUrl !== null}
                                className="text-red-600"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {url.status === "APPROVED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleProcess(url.id)}
                              disabled={processingUrl !== null}
                            >
                              {processingUrl === url.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <FileText className="w-4 h-4 mr-1" />
                                  Process
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Content Viewer */}
      <Dialog open={viewMode} onOpenChange={setViewMode}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="break-all">{selectedUrl?.title || selectedUrl?.url}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4">
            {selectedUrl?.metadata_json && (
              <div className="mb-4 p-3 bg-[var(--color-surface-secondary)] rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Category:</span>{" "}
                    {selectedUrl.metadata_json.category || "-"}
                  </div>
                  <div>
                    <span className="font-medium">Year:</span>{" "}
                    {selectedUrl.metadata_json.year || "-"}
                  </div>
                  <div>
                    <span className="font-medium">Source:</span>{" "}
                    {selectedUrl.metadata_json.source || "-"}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> {selectedUrl.status}
                  </div>
                </div>
              </div>
            )}
            <pre className="whitespace-pre-wrap text-sm font-mono bg-[var(--color-surface-secondary)] p-4 rounded-lg max-h-[60vh] overflow-auto">
              {selectedUrl?.content || "No content"}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewMode(false)}>
              Close
            </Button>
            {selectedUrl?.status === "CRAWLED" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleReject(selectedUrl.id);
                    setViewMode(false);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    handleApprove(selectedUrl.id);
                    setViewMode(false);
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
