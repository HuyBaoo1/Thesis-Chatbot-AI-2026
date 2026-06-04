import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { chatService } from "../../services/chat.service";
import { staffService } from "../../lib/staff.service";
import { useConversationRealtime } from "../../hooks/useRealtime";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Spinner } from "../../components/ui/spinner";
import { Badge } from "../../components/ui/badge";
import { formatDateTime } from "../../lib/utils";
import { CONVERSATION_STATUS, LEAD_TEMPERATURE, TEMPERATURE_COLORS } from "../../lib/constants";
import { ArrowLeft, Send, User, Bot, ExternalLink, UserCheck, Edit3, Save, X } from 'lucide-react';

export default function ConversationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [staffs, setStaffs] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const messagesEndRef = useRef(null);

  const handleRealtimeEvent = useCallback((data) => {
    if (data?.id) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    }
    if (data?.status || data?.assigned_staff_id !== undefined) {
      setConversation((prev) => (prev ? { ...prev, ...data } : prev));
    }
  }, []);

  useConversationRealtime(id, handleRealtimeEvent);

  const fetchConversation = async () => {
    try {
      const [convRes, msgsRes] = await Promise.all([
        chatService.getConversation(id),
        chatService.getMessages(id, 50),
      ]);
      setConversation(convRes.data);
      setMessages(msgsRes.data.items || []);
    } catch (error) {
      console.error("Failed to fetch conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversation();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      const res = await chatService.sendStaffMessage(id, newMessage);
      setNewMessage("");
      // Add the new message to the local state immediately
      if (res.data) {
        setMessages(prev => [...prev, res.data]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleViewSources = async (messageId) => {
    try {
      const res = await chatService.getMessageSources(messageId);
      console.log("Message sources:", res.data);
      // Could show in a modal or tooltip
    } catch (error) {
      console.error("Failed to fetch sources:", error);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      const res = await chatService.updateStatus(id, status);
      setConversation(res.data);
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const fetchStaffs = async () => {
    try {
      const res = await staffService.list({ limit: 100 });
      setStaffs(res.data.items || []);
    } catch (error) {
      console.error("Failed to fetch staffs:", error);
    }
  };

  const handleAssignStaff = async (staffId) => {
    try {
      const res = await chatService.assign(id, staffId || null);
      setConversation(res.data);
      setIsAssigning(false);
    } catch (error) {
      console.error("Failed to assign staff:", error);
    }
  };

  const handleSaveSummary = async () => {
    if (!summaryText.trim()) return;
    try {
      const res = await chatService.updateSummary(id, summaryText);
      setConversation(res.data);
      setIsEditingSummary(false);
    } catch (error) {
      console.error("Failed to update summary:", error);
    }
  };

  useEffect(() => {
    fetchStaffs();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-text-muted)]">Conversation not found</p>
        <Button variant="outline" onClick={() => navigate("/chat/inbox")} className="mt-4">
          Back to Inbox
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/chat/inbox")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            Conversation with {conversation.lead_name || `Lead #${conversation.lead_id?.slice(0, 8)}`}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {conversation.lead_temperature && (
              <Badge className={`text-[10px] px-1.5 py-0.5 ${TEMPERATURE_COLORS[conversation.lead_temperature] || ""}`}>
                {conversation.lead_temperature}
              </Badge>
            )}
            {conversation.lead_score != null && (
              <span className="text-xs font-medium text-[var(--color-text-muted)]">Score: {conversation.lead_score}</span>
            )}
          </div>
        </div>
        <Select
          value={conversation.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="w-40"
        >
          {Object.values(CONVERSATION_STATUS).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAssigning(!isAssigning)}
          className="gap-2"
        >
          <UserCheck className="w-4 h-4" />
          {conversation.assigned_staff_name || "Assign"}
        </Button>
      </div>

      {/* Assign Staff Dropdown */}
      {isAssigning && (
        <div className="mb-4 p-4 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="w-4 h-4 text-[var(--color-primary-500)]" />
            <span className="font-medium">Assign Counselor</span>
          </div>
          <div className="flex gap-2">
            <Select
              value={conversation.assigned_staff_id || ""}
              onChange={(e) => handleAssignStaff(e.target.value || null)}
              className="flex-1"
            >
              <option value="">-- Unassigned --</option>
              {staffs.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.role})
                </option>
              ))}
            </Select>
            <Button variant="ghost" size="sm" onClick={() => setIsAssigning(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Summary Section */}
      <div className="mb-4 p-4 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-[var(--color-text-muted)]" />
            <span className="font-medium text-sm">Summary</span>
          </div>
          {!isEditingSummary && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSummaryText(conversation.summary || "");
                setIsEditingSummary(true);
              }}
            >
              <Edit3 className="w-3 h-3" />
            </Button>
          )}
        </div>
        {isEditingSummary ? (
          <div className="space-y-2">
            <textarea
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              placeholder="Enter conversation summary..."
              className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-sm resize-none"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingSummary(false)}
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleSaveSummary}
                className="gap-1"
              >
                <Save className="w-3 h-3" /> Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-secondary)]">
            {conversation.summary || "No summary yet. Click edit to add one."}
          </p>
        )}
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "USER" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "USER"
                    ? "bg-[var(--color-accent-50)] text-[var(--color-accent-600)]"
                    : msg.role === "ASSISTANT"
                    ? "bg-[var(--color-primary-100)] text-[var(--color-primary-600)]"
                    : "bg-[var(--color-warning-light)] text-amber-600"
                }`}
              >
                {msg.role === "USER" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                  msg.role === "USER"
                    ? "gradient-primary text-white"
                    : "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                {msg.intent && (
                  <p className="text-xs opacity-70 mt-1">Intent: {msg.intent}</p>
                )}
                <p className="text-xs opacity-50 mt-1">
                  {formatDateTime(msg.created_at)}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-[var(--color-border)]">
          <div className="flex gap-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              disabled={isSending}
            />
            <Button type="submit" disabled={isSending || !newMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
