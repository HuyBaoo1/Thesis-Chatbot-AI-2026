import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { chatService } from "../../services/chat.service";
import { useRealtime } from "../../hooks/useRealtime";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Spinner } from "../../components/ui/spinner";
import { formatRelativeTime } from "../../lib/utils";
import { CONVERSATION_STATUS, LEAD_TEMPERATURE, TEMPERATURE_COLORS } from "../../lib/constants";
import { MessageSquare, ArrowRight, MessageCircle, Send, ChevronRight } from 'lucide-react';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function useCursorPagination(initialLimit = 20) {
  const [limit] = useState(initialLimit);
  const [beforeCursor, setBeforeCursor] = useState(null);
  const [cursorHistory, setCursorHistory] = useState([]);
  const reset = useCallback(() => {
    setBeforeCursor(null);
    setCursorHistory([]);
  }, []);
  const next = useCallback((nextBefore) => {
    setCursorHistory(prev => [...prev, beforeCursor]);
    setBeforeCursor(nextBefore);
  }, [beforeCursor]);
  const prev = useCallback(() => {
    setCursorHistory(history => {
      const previous = history[history.length - 1] ?? null;
      setBeforeCursor(previous);
      return history.slice(0, -1);
    });
  }, []);
  return { beforeCursor, limit, reset, next, prev, hasPrev: cursorHistory.length > 0 };
}

function groupByLead(conversations) {
  const groups = {};
  for (const conv of conversations) {
    const key = conv.lead_id || "unknown";
    if (!groups[key]) {
      groups[key] = {
        lead_id: conv.lead_id,
        lead_name: conv.lead_name,
        lead_email: conv.lead_email,
        channel: conv.channel,
        conversations: [],
      };
    }
    groups[key].conversations.push(conv);
  }
  return Object.values(groups);
}

const CHANNEL_COLORS = {
  WEB: "bg-blue-100 text-blue-700 border-blue-200",
  TELEGRAM: "bg-sky-100 text-sky-700 border-sky-200",
  ZALO: "bg-violet-100 text-violet-700 border-violet-200",
  FACEBOOK: "bg-indigo-100 text-indigo-700 border-indigo-200",
};

const CHANNEL_ICONS = {
  WEB: <MessageCircle className="w-3.5 h-3.5" />,
  TELEGRAM: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.475 1.209-.765 1.23-.199.014-.372-.054-.468-.225-.085-.154-.132-.373-.153-.567a.79.79 0 0 1-.03-.395l.349-.475c.094-.133.217-.302.352-.347.128-.044.346-.046.544-.043.165 0 .29.002.442.056.273.099.613.412.796.818.168.375.33 1.137.33 1.57 0 .198-.025.36-.068.487-.035.103-.105.155-.193.155-.096 0-.198-.053-.37-.158-.315-.2-.687-.456-1.236-.838-.616-.426-.9-1.016-1.05-1.72-.137-.639-.19-1.583-.2-2.485a.54.54 0 0 0-.02-.23.526.526 0 0 0-.03-.17.548.548 0 0 0-.11-.083l-.37-.355a.66.66 0 0 0-.328-.14.63.63 0 0 0-.347.07.584.584 0 0 0-.262.142.592.592 0 0 0-.05.366l.011.33-.016.16c-.003.08-.02.149-.035.206l-.016.068c-.038.152-.096.282-.17.396-.063.097-.16.177-.277.24-.137.073-.26.12-.397.15a.64.64 0 0 1-.352 0c-.122-.025-.234-.072-.322-.14a.538.538 0 0 1-.174-.212l-.016-.09a.537.537 0 0 1-.021-.19c.013-.143.06-.262.14-.353.072-.08.182-.13.317-.15.153-.02.26-.028.324-.01l.18-.014c.08-.003.148.018.203.066a.486.486 0 0 0 .14.095c.095.037.15.07.185.113.032.04.054.095.07.16.01.052.017.12.026.2l.012.088a.61.61 0 0 1-.013.194.62.62 0 0 1-.047.16.63.63 0 0 1-.104.155.59.59 0 0 1-.15.112.628.628 0 0 1-.198.063.636.636 0 0 1-.203.016.63.63 0 0 1-.203-.016.62.62 0 0 1-.198-.063.596.596 0 0 1-.15-.112.613.613 0 0 1-.104-.155.612.612 0 0 1-.047-.16.614.614 0 0 1-.012-.194l.011-.088c.009-.08.016-.148.026-.2a.593.593 0 0 0 .07-.16c.035-.043.09-.076.185-.113a.493.493 0 0 1 .14-.096c.055-.047.122-.069.203-.066l.18.014c.064-.018.171-.01.324.01.135.02.245.07.317.15.08.091.127.21.14.353a.537.537 0 0 1-.021.19.53.53 0 0 1-.031.18.54.54 0 0 1-.03.17l-.37.355a.548.548 0 0 0-.11.083.526.526 0 0 0-.03.17.54.54 0 0 0-.02.23c-.01.902-.063 1.846-.2 2.485-.15.704-.434 1.294-1.05 1.72-.569.382-.921.676-1.236.838-.172.105-.274.158-.37.158-.088 0-.128-.052-.193-.155a.525.525 0 0 1-.021-.19.53.53 0 0 1 .031-.18.54.54 0 0 1 .03-.17l.37-.355a.548.548 0 0 0 .11-.083.526.526 0 0 0 .03-.17.54.54 0 0 0 .02-.23c.01-.902.063-1.846.2-2.485.15-.704.434-1.294 1.05-1.72.569-.382.921-.676 1.236-.838.172-.105.274-.158.37-.158.088 0 .128.052.193.155.035.103.053.232.021.38z"/>
    </svg>
  ),
  ZALO: <Send className="w-3.5 h-3.5" />,
  FACEBOOK: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 12.221l-1.97.001c-.16.003-.285.005-.406.005-.12 0-.245-.002-.406-.005-3.055-.03-4.982-2.484-4.982-5.227C4.13 6.16 6.058 3.7 9.114 3.67c.16-.003.285-.005.406-.005.121 0 .246.002.406.005C15.942 3.7 17.87 6.16 17.87 9.995c0 2.743-1.927 5.197-4.982 5.226z"/>
    </svg>
  ),
};

export default function ChatInboxPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [pageInfo, setPageInfo] = useState({ total: 0, has_more: false, next_before: null });
  const [collapsedLeads, setCollapsedLeads] = useState({});

  const debouncedSearch = useDebounce(search, 300);
  const { beforeCursor, limit, reset, next: goNext, prev: goPrev, hasPrev } = useCursorPagination();

  const toggleLead = (leadId) => {
    setCollapsedLeads(prev => ({ ...prev, [leadId]: !prev[leadId] }));
  };

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { limit };
      if (beforeCursor) params.before = beforeCursor;
      if (debouncedSearch) params.q = debouncedSearch;
      if (status) params.status = status;
      if (channel) params.channel = channel;
      const res = await chatService.listConversations(params);
      const items = res.data?.items || res.data || [];
      setConversations(Array.isArray(items) ? items : []);
      setPageInfo({ total: res.data?.total || 0, has_more: !!res.data?.has_more, next_before: res.data?.next_before || null });
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, status, channel, limit, beforeCursor]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);
  useEffect(() => { reset(); }, [status, channel, reset]);

  useRealtime("chat.conversation.updated", useCallback(() => {
    fetchConversations();
  }, [fetchConversations]));

  useRealtime("chat.message.created", useCallback(() => {
    fetchConversations();
  }, [fetchConversations]));

  const statusColors = {
    [CONVERSATION_STATUS.OPEN]: "bg-emerald-50 text-emerald-600 border-emerald-200",
    [CONVERSATION_STATUS.HANDOFF]: "bg-amber-50 text-amber-600 border-amber-200",
    [CONVERSATION_STATUS.CLOSED]: "bg-[var(--color-surface-tertiary)] text-[var(--color-text-muted)] border-[var(--color-border)]",
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Chat Inbox</h1>
          <p className="page-subtitle">Manage conversations with students</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/15 focus:border-[var(--color-primary-500)]"
          />
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] text-sm cursor-pointer min-w-[130px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/15"
          >
            <option value="">All Channels</option>
            <option value="WEB">Web Chat</option>
            <option value="TELEGRAM">Telegram</option>
            <option value="ZALO">Zalo</option>
            <option value="FACEBOOK">Facebook</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] text-sm cursor-pointer min-w-[130px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/15"
          >
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="HANDOFF">Handoff</option>
            <option value="CLOSED">Closed</option>
          </select>
          <Button variant="outline" onClick={fetchConversations}>Search</Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
        ) : !Array.isArray(conversations) || conversations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-tertiary)] flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-[var(--color-text-muted)]" />
            </div>
            <p className="text-[var(--color-text-secondary)] font-medium">No conversations yet</p>
            <p className="text-[var(--color-text-muted)] text-sm mt-1">Conversations will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]/50">
            {groupByLead(conversations).map((lead) => {
              const isCollapsed = collapsedLeads[lead.lead_id];
              return (
              <div key={lead.lead_id || "unknown"}>
                {/* Lead Group Header - clickable to collapse/expand */}
                <div
                  onClick={() => toggleLead(lead.lead_id)}
                  className="flex items-center gap-3 px-4 py-3 bg-[var(--color-surface-secondary)] border-b border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-surface-tertiary)] transition-colors"
                >
                  <ChevronRight className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${isCollapsed ? "" : "rotate-90"}`} />
                  <div className="w-10 h-10 rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-600)] flex items-center justify-center font-semibold text-sm">
                    {lead.lead_name?.[0]?.toUpperCase() || lead.lead_id?.slice(0, 2)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[var(--color-text-primary)]">{lead.lead_name || `Lead #${lead.lead_id?.slice(0, 8) || "N/A"}`}</p>
                      {lead.conversations.length > 1 && (
                        <Badge className="bg-[var(--color-primary-100)] text-[var(--color-primary-600)] border-[var(--color-primary-200)] text-[10px]">
                          {lead.conversations.length} threads
                        </Badge>
                      )}
                      {lead.conversations[0]?.lead_temperature && (
                        <Badge className={`text-[10px] px-1.5 py-0.5 ${TEMPERATURE_COLORS[lead.conversations[0].lead_temperature] || ""}`}>
                          {lead.conversations[0].lead_temperature}
                        </Badge>
                      )}
                      {lead.conversations[0]?.lead_score != null && (
                        <span className="text-[10px] font-medium text-[var(--color-text-muted)]">Score: {lead.conversations[0].lead_score}</span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">{lead.lead_email || lead.conversations[0]?.channel}</p>
                  </div>
                </div>
                {/* Individual Conversations under this lead - hidden when collapsed */}
                {!isCollapsed && lead.conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => navigate(`/chat/${conv.id}`)}
                    className="flex items-center gap-4 p-4 pl-8 hover:bg-[var(--color-surface-secondary)] cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-[var(--color-text-secondary)] truncate">
                          {conv.last_message || "No messages"}
                        </p>
                        <Badge className={`text-[10px] px-1.5 py-0.5 ${statusColors[conv.status] || ""}`}>{conv.status}</Badge>
                        {conv.lead_temperature && (
                          <Badge className={`text-[10px] px-1.5 py-0.5 ${TEMPERATURE_COLORS[conv.lead_temperature] || ""}`}>
                            {conv.lead_temperature}
                          </Badge>
                        )}
                        {conv.lead_score != null && (
                          <span className="text-[10px] font-medium text-[var(--color-text-muted)]">Score: {conv.lead_score}</span>
                        )}
                        {conv.channel && (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${CHANNEL_COLORS[conv.channel] || "bg-[var(--color-surface-tertiary)] text-[var(--color-text-muted)] border-[var(--color-border)]"}`}>
                            {CHANNEL_ICONS[conv.channel]}
                            {conv.channel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-[var(--color-text-muted)]">{formatRelativeTime(conv.last_message_at)}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">{conv.message_count || 0} msgs</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[var(--color-border-hover)]" />
                  </div>
                ))}
              </div>
              );
            })}
          </div>
        )}
        {pageInfo.total > limit && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-muted)]">{pageInfo.total} conversations</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!hasPrev} onClick={goPrev}>Previous</Button>
              <Button variant="outline" size="sm" disabled={!pageInfo.has_more} onClick={() => goNext(pageInfo.next_before)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
