import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { knowledgeService } from "../../lib/knowledge.service";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Spinner } from "../../components/ui/spinner";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { KnowledgeChunkFormDialog } from "./KnowledgeChunkFormDialog";
import { KnowledgeFileUploadDialog } from "./KnowledgeFileUploadDialog";
import { formatDateTime } from "../../lib/utils";
import { Plus, Search, Upload, RefreshCw, Trash2, FileText, Edit } from 'lucide-react';

// Custom hook for debounced search
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// Custom hook for pagination
function usePagination(initialOffset = 0, initialLimit = 10) {
  const [offset, setOffset] = useState(initialOffset);
  const [limit] = useState(initialLimit);

  const reset = useCallback(() => setOffset(0), []);
  const next = useCallback(() => setOffset(prev => prev + limit), [limit]);
  const prev = useCallback(() => setOffset(prev => Math.max(0, prev - limit)), [limit]);
  const goToPage = useCallback((page) => setOffset((page - 1) * limit), [limit]);

  return { offset, limit, reset, next, prev, goToPage, setOffset };
}

export default function KnowledgeBasePage() {
  const { t } = useTranslation();
  const [chunks, setChunks] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingChunk, setEditingChunk] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  const { offset, limit, reset, next, prev, goToPage } = usePagination();
  const hasNext = offset + limit < total;
  const hasPrev = offset > 0;

  const paginationPages = useMemo(() => {
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    return Array.from({ length: totalPages }, (_, i) => i + 1).reduce((pages, page) => {
      if (page <= 2 || page > totalPages - 2 || Math.abs(page - currentPage) <= 2) {
        pages.push(page);
      } else if (pages.at(-1) !== '...') {
        pages.push('...');
      }
      return pages;
    }, []);
  }, [total, limit, offset]);

  const fetchChunks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { limit, offset };
      if (debouncedSearch) params.q = debouncedSearch;
      if (category) params.category = category;
      const res = await knowledgeService.search(params);
      const items = res.data?.items || res.data || [];
      const total = res.data?.total ?? items.length;
      setChunks(Array.isArray(items) ? items : []);
      setTotal(total);
    } catch (error) {
      console.error("Failed to fetch chunks:", error);
      setChunks([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [category, debouncedSearch, limit, offset]);

  useEffect(() => {
    fetchChunks();
  }, [fetchChunks]);

  // Reset offset when filters change
  useEffect(() => {
    reset();
  }, [category, debouncedSearch, reset]);

  const handleRebuildMissing = async () => {
    try {
      await knowledgeService.rebuildMissingEmbeddings({ limit: 100 });
      fetchChunks();
    } catch (error) {
      console.error("Failed to rebuild embeddings:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await knowledgeService.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchChunks();
    } catch (error) {
      console.error("Failed to delete chunk:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const categories = [
    "TUITION", "SCHOLARSHIP", "REQUIREMENT", "DEADLINE", "PROCESS", "MAJOR_INFO", "FAQ"
  ];

  const getCategoryColor = (cat) => {
    const colors = {
      TUITION: "bg-blue-50 text-blue-700 border border-blue-200",
      SCHOLARSHIP: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      REQUIREMENT: "bg-purple-50 text-purple-700 border border-purple-200",
      DEADLINE: "bg-rose-50 text-rose-700 border border-rose-200",
      PROCESS: "bg-amber-50 text-amber-700 border border-amber-200",
      MAJOR_INFO: "bg-cyan-50 text-cyan-700 border border-cyan-200",
      FAQ: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    };
    return colors[cat] || "";
  };

  return (
    <div className="space-y-6 animate-fade-in text-[var(--color-text-primary)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">{t('knowledge.title')}</h1>
          <p className="text-[var(--color-text-muted)] mt-1">{t('knowledge.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRebuildMissing}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('knowledge.rebuildMissing')}
          </Button>
          <Button variant="outline" onClick={() => setUploadOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            {t('knowledge.uploadFile')}
          </Button>
          <Button onClick={() => { setEditingChunk(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            {t('knowledge.addChunk')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Search row */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <Input
                placeholder={t('knowledge.searchChunks')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fetchChunks()}>
                {t('common.search')}
              </Button>
            </div>
          </div>

          {/* Category pills row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[var(--color-text-muted)] mr-1">Category:</span>
            <button
              type="button"
              onClick={() => setCategory("")}
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                category === ""
                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                  : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)]"
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  category === c
                    ? "bg-[var(--color-primary)] text-white shadow-sm"
                    : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)]"
                }`}
              >
                {c.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Chunks List */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        ) : !Array.isArray(chunks) || chunks.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
            <p className="text-[var(--color-text-muted)]">{t('knowledge.noKnowledgeChunksFound')}</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {chunks.map((chunk) => (
              <div key={chunk.id} className="p-4 hover:bg-[var(--color-surface-secondary)] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getCategoryColor(chunk.category)}>
                        {chunk.category?.replace(/_/g, " ") || t('knowledge.general')}
                      </Badge>
                      {chunk.needs_embedding && (
                        <Badge className="bg-amber-50 text-amber-700 border border-amber-200">{t('knowledge.needsEmbedding')}</Badge>
                      )}
                      <span className="text-xs text-[var(--color-text-muted)]">v{chunk.version || 1}</span>
                    </div>
                    <h3 className="font-medium text-[var(--color-text-primary)] mb-1">{chunk.title || t('knowledge.untitled')}</h3>
                    <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">{chunk.content || ""}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-text-muted)]">
                      <span>{t('knowledge.source')}: {chunk.source || "-"}</span>
                      <span>{t('knowledge.updated')}: {formatDateTime(chunk.updated_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingChunk(chunk); setFormOpen(true); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-[var(--color-accent-500)] hover:text-[var(--color-accent-600)] hover:bg-[var(--color-accent-50)]" onClick={() => setDeleteTarget(chunk)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-muted)]">
              {t('common.showing')} {offset + 1} {t('common.to')} {Math.min(offset + limit, total)} {t('common.of')} {total}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={!hasPrev} onClick={prev}>{t('common.previous')}</Button>
              {paginationPages.map((page, idx) =>
                page === '...' ? (
                  <span key={`ellipsis-${idx}`} className="w-8 text-center text-xs text-[var(--color-text-muted)]">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                      offset === (page - 1) * limit
                        ? "bg-[var(--color-primary)] text-white"
                        : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <Button variant="outline" size="sm" disabled={!hasNext} onClick={next}>{t('common.next')}</Button>
            </div>
          </div>
        )}
      </Card>

      <KnowledgeChunkFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        chunk={editingChunk}
        onSuccess={fetchChunks}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('knowledge.deleteChunk')}
        description={t('knowledge.deleteChunkConfirm', { title: deleteTarget?.title })}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        variant="danger"
      />

      <KnowledgeFileUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={fetchChunks}
      />
    </div>
  );
}
