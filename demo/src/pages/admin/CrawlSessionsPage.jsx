import { useEffect, useState, useCallback, useMemo } from "react";
import { crawlService } from "../../lib/crawl.service";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Spinner } from "../../components/ui/spinner";
import { formatDateTime } from "../../lib/utils";
import {
  Plus,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  FileText,
  Loader2,
  Globe,
  ExternalLink,
  Search,
  ChevronLeft,
  X,
  Trash2,
} from "lucide-react";
import { CreateCrawlModal } from "./CreateCrawlModal";

const STATUS_COLORS = {
  PENDING: "bg-gray-50 text-gray-700 border-gray-200",
  SCRAPING: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
};

const URL_STATUS_COLORS = {
  PENDING: "bg-gray-50 text-gray-700 border-gray-200",
  CRAWLED: "bg-blue-50 text-blue-700 border-blue-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  PROCESSED: "bg-purple-50 text-purple-700 border-purple-200",
};

function usePagination(initialLimit = 20) {
  const [offset, setOffset] = useState(0);
  const [limit] = useState(initialLimit);
  const reset = useCallback(() => setOffset(0), []);
  const next = useCallback(() => setOffset((prev) => prev + limit), [limit]);
  const prev = useCallback(() => setOffset((prev) => Math.max(0, prev - limit)), [limit]);
  const goToPage = useCallback((page) => setOffset((page - 1) * limit), [limit]);
  return { offset, limit, reset, next, prev, goToPage };
}

// === Sessions Tab ===
function SessionsTab({ onViewSession }) {
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingSession, setDeletingSession] = useState(null);

  const { offset, limit, reset, next, prev, goToPage } = usePagination();
  const hasNext = offset + limit < total;
  const hasPrev = offset > 0;

  const paginationPages = useMemo(() => {
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    return Array.from({ length: totalPages }, (_, i) => i + 1).reduce((pages, page) => {
      if (page <= 2 || page > totalPages - 2 || Math.abs(page - currentPage) <= 2) {
        pages.push(page);
      } else if (pages.at(-1) !== "...") {
        pages.push("...");
      }
      return pages;
    }, []);
  }, [total, limit, offset]);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await crawlService.listSessions({ limit, offset });
      setSessions(res.data?.items || []);
      setTotal(res.data?.total || 0);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      setSessions([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleDelete = async (sessionId, e) => {
    e.stopPropagation();
    if (!confirm("Delete this crawl session and all its URLs?")) return;
    setDeletingSession(sessionId);
    try {
      await crawlService.deleteSession(sessionId);
      fetchSessions();
    } catch (error) {
      console.error("Failed to delete session:", error);
    } finally {
      setDeletingSession(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Crawl
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
        ) : !sessions.length ? (
          <div className="text-center py-12">
            <Globe className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
            <p className="text-[var(--color-text-muted)]">No crawl sessions</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {sessions.map((session) => (
              <div key={session.id} className="p-4 flex items-center justify-between hover:bg-[var(--color-surface-secondary)]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={STATUS_COLORS[session.status]}>{session.status}</Badge>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {session.completed_pages}/{session.total_pages} pages
                    </span>
                  </div>
                  <p className="font-medium truncate">{session.target_url}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {formatDateTime(session.created_at)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => onViewSession(session)}>
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-red-600 hover:bg-red-50"
                    onClick={(e) => handleDelete(session.id, e)}
                    disabled={deletingSession === session.id}
                  >
                    {deletingSession === session.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {total > limit && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={!hasPrev} onClick={prev}>Prev</Button>
          <Button variant="outline" size="sm" disabled={!hasNext} onClick={next}>Next</Button>
        </div>
      )}

      <CreateCrawlModal open={createOpen} onOpenChange={setCreateOpen} onSuccess={() => { setCreateOpen(false); reset(); fetchSessions(); }} />
    </div>
  );
}

// === URLs Tab ===
function URLsTab({ sessionId, showSessionFilter = false }) {
  const [urls, setUrls] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [processingUrl, setProcessingUrl] = useState(null);
  const [deletingUrl, setDeletingUrl] = useState(null);

  const { offset, limit, reset, next, prev, goToPage } = usePagination();
  const hasNext = offset + limit < total;
  const hasPrev = offset > 0;

  const fetchUrls = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { limit, offset };
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.q = searchQuery;
      if (sessionId) params.crawl_session_id = sessionId;
      const res = await crawlService.listUrls(params);
      setUrls(res.data?.items || []);
      setTotal(res.data?.total || 0);
    } catch (error) {
      console.error("Failed to fetch URLs:", error);
      setUrls([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [limit, offset, statusFilter, searchQuery, sessionId]);

  useEffect(() => { fetchUrls(); }, [fetchUrls]);

  const handleApprove = async (urlId) => {
    setProcessingUrl(urlId);
    try { await crawlService.approveUrl(urlId); fetchUrls(); }
    finally { setProcessingUrl(null); }
  };

  const handleReject = async (urlId) => {
    setProcessingUrl(urlId);
    try { await crawlService.rejectUrl(urlId); fetchUrls(); }
    finally { setProcessingUrl(null); }
  };

  const handleProcess = async (urlId) => {
    setProcessingUrl(urlId);
    try { await crawlService.processUrl(urlId); fetchUrls(); }
    finally { setProcessingUrl(null); }
  };

  const handleDelete = async (urlId, e) => {
    e.stopPropagation();
    if (!confirm("Delete this URL?")) return;
    setDeletingUrl(urlId);
    try {
      await crawlService.deleteUrl(urlId);
      if (selectedUrl?.id === urlId) setSelectedUrl(null);
      fetchUrls();
    } catch (error) {
      console.error("Failed to delete URL:", error);
    } finally {
      setDeletingUrl(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Simple Filter Row */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
        >
          <option value="">All Status</option>
          <option value="CRAWLED">Crawled</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="PROCESSED">Processed</option>
        </select>
        <Button variant="outline" onClick={fetchUrls}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {/* URL List - Simple table-like layout */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
        ) : !urls.length ? (
          <div className="text-center py-12 text-[var(--color-text-muted)]">No URLs found</div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {urls.map((url) => (
              <div
                key={url.id}
                className={`p-4 flex items-center gap-4 hover:bg-[var(--color-surface-secondary)] cursor-pointer ${
                  selectedUrl?.id === url.id ? "bg-[var(--color-surface-secondary)]" : ""
                }`}
                onClick={() => setSelectedUrl(url)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={URL_STATUS_COLORS[url.status]}>{url.status}</Badge>
                    {url.metadata_json?.category && <Badge variant="outline">{url.metadata_json.category}</Badge>}
                    {url.metadata_json?.year && <span className="text-xs text-[var(--color-text-muted)]">{url.metadata_json.year}</span>}
                  </div>
                  <p className="font-medium truncate">{url.title || url.url}</p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{url.url}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {url.status === "CRAWLED" && (
                    <>
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-emerald-600" onClick={(e) => { e.stopPropagation(); handleApprove(url.id); }} disabled={!!processingUrl}><CheckCircle className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-red-600" onClick={(e) => { e.stopPropagation(); handleReject(url.id); }} disabled={!!processingUrl}><XCircle className="w-4 h-4" /></Button>
                    </>
                  )}
                  {url.status === "APPROVED" && (
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleProcess(url.id); }} disabled={!!processingUrl}>
                      {processingUrl === url.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-red-600 hover:bg-red-50" onClick={(e) => handleDelete(url.id, e)} disabled={deletingUrl === url.id}>
                    {deletingUrl === url.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {total > limit && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-[var(--color-text-muted)]">{offset + 1}-{Math.min(offset + limit, total)} of {total}</span>
          <Button variant="outline" size="sm" disabled={!hasPrev} onClick={prev}>Prev</Button>
          <Button variant="outline" size="sm" disabled={!hasNext} onClick={next}>Next</Button>
        </div>
      )}

      {/* Content Preview Modal */}
      {selectedUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedUrl(null)}>
          <div className="bg-card rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold truncate">{selectedUrl.title || selectedUrl.url}</h2>
              <Button variant="ghost" size="icon" onClick={() => setSelectedUrl(null)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {selectedUrl.metadata_json && (
                <div className="flex flex-wrap gap-4 mb-4 p-3 bg-[var(--color-surface-secondary)] rounded-lg text-sm">
                  <span><strong>Category:</strong> {selectedUrl.metadata_json.category || "-"}</span>
                  <span><strong>Year:</strong> {selectedUrl.metadata_json.year || "-"}</span>
                  <span><strong>Source:</strong> {selectedUrl.metadata_json.source || "-"}</span>
                  <span><Badge className={URL_STATUS_COLORS[selectedUrl.status]}>{selectedUrl.status}</Badge></span>
                </div>
              )}
              <pre className="whitespace-pre-wrap text-sm bg-[var(--color-surface-secondary)] p-4 rounded-lg max-h-[60vh] overflow-auto font-mono">
                {selectedUrl.content || "No content"}
              </pre>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
              <Button variant="ghost" onClick={() => window.open(selectedUrl.url, "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open URL
              </Button>
              {selectedUrl.status === "CRAWLED" && (
                <>
                  <Button variant="outline" onClick={() => handleReject(selectedUrl.id)}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button onClick={() => handleApprove(selectedUrl.id)}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </>
              )}
              {selectedUrl.status === "APPROVED" && (
                <Button onClick={() => handleProcess(selectedUrl.id)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Process
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === Main Page ===
export default function CrawlPage() {
  const [activeTab, setActiveTab] = useState("sessions");
  const [selectedSession, setSelectedSession] = useState(null);

  // When clicking View on a session
  const handleViewSession = useCallback((session) => {
    setSelectedSession(session);
    setActiveTab("session-urls");
  }, []);

  // Back button
  const handleBack = useCallback(() => {
    setSelectedSession(null);
    setActiveTab("sessions");
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {selectedSession && (
          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        )}
        <div>
          <h1 className="text-xl font-semibold">
            {activeTab === "session-urls" ? selectedSession?.target_url : "Web Crawler"}
          </h1>
          {activeTab === "session-urls" && selectedSession && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {selectedSession.status} • {selectedSession.completed_pages}/{selectedSession.total_pages} pages
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--color-border)]">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("sessions")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "sessions"
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            Sessions
          </button>
          <button
            onClick={() => setActiveTab("all-urls")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "all-urls"
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            All URLs
          </button>
          {selectedSession && (
            <button
              onClick={() => setActiveTab("session-urls")}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "session-urls"
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              This Session
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "sessions" && <SessionsTab onViewSession={handleViewSession} />}
      {activeTab === "all-urls" && <URLsTab showSessionFilter />}
      {activeTab === "session-urls" && selectedSession && <URLsTab sessionId={selectedSession.id} />}
    </div>
  );
}
