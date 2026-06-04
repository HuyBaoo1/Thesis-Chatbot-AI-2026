import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Avatar } from "../../components/ui/avatar";

export default function ChatTestPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const [leadId, setLeadId] = useState("");

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          lead_id: leadId || undefined,
          session_id: sessionId || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();

      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
      }

      const botMessage = {
        role: "assistant",
        content: data.response || data.message || JSON.stringify(data)
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      setError(err.message);
      setMessages(prev => [...prev, { role: "error", content: err.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Chat Test</CardTitle>
          <p className="text-sm text-[var(--color-text-muted)]">Test backend chat API</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--color-text-secondary)] block mb-1">Lead ID (optional)</label>
            <input type="text" value={leadId} onChange={(e) => setLeadId(e.target.value)} placeholder="Enter lead_id for context"
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/15 focus:border-[var(--color-primary-500)] transition-all" />
          </div>

          <div className="h-96 overflow-y-auto border border-[var(--color-border)] rounded-xl p-4 space-y-3 bg-[var(--color-surface-secondary)]">
            {messages.length === 0 ? (
              <p className="text-center text-[var(--color-text-muted)] text-sm mt-20">Send a message to test the chat API</p>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : msg.role === "error" ? "justify-center" : "justify-start"}`}>
                  {msg.role !== "user" && (
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-semibold">AI</span>
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "gradient-primary text-white"
                      : msg.role === "error"
                      ? "bg-[var(--color-error-light)] text-[var(--color-accent-600)] border border-[var(--color-accent-200)]"
                      : "bg-white border border-[var(--color-border)] text-[var(--color-text-primary)]"
                  }`}>
                    {msg.content}
                  </div>
                  {msg.role === "user" && (
                    <Avatar fallback="U" size="sm" />
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-semibold">AI</span>
                </div>
                <div className="bg-white border border-[var(--color-border)] rounded-xl px-4 py-2.5">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[var(--color-text-muted)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-[var(--color-text-muted)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-[var(--color-text-muted)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-[var(--color-accent-600)] text-sm p-3 bg-[var(--color-error-light)] rounded-xl border border-[var(--color-accent-200)]">
              Error: {error}
            </div>
          )}

          {sessionId && (
            <div className="text-xs text-[var(--color-text-muted)]">
              Session: <span className="font-mono">{sessionId}</span>
            </div>
          )}

          <form onSubmit={sendMessage} className="flex gap-2">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message..." disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/15 focus:border-[var(--color-primary-500)] disabled:bg-[var(--color-surface-tertiary)] disabled:cursor-not-allowed transition-all" />
            <Button type="submit" disabled={isLoading || !input.trim()}>Send</Button>
            <Button type="button" variant="outline" onClick={clearChat}>Clear</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
