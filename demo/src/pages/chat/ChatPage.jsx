import { useState, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { Send, Paperclip } from 'lucide-react';
import { ChatSidebar } from "../../components/chat/ChatSidebar";
import { ChatHeader } from "../../components/chat/ChatHeader";
import { OnboardingView } from "../../components/chat/OnboardingView";
import { MessageBubble, TypingIndicator } from "../../components/chat/MessageBubble";
import { GraduationCap, Award, Calendar, Bot } from 'lucide-react';
import { chatService } from "../../services/chat.service";
import "../../components/ui/LanguageToggle.css";

const TOPICS = [
  {
    icon: GraduationCap,
    titleKey: "chat.chatting.topics.undergraduate",
    prompt: "Tell me about VinUni's undergraduate programs"
  },
  {
    icon: Award,
    titleKey: "chat.chatting.topics.scholarships",
    prompt: "What scholarships does VinUni offer?"
  },
  {
    icon: Calendar,
    titleKey: "chat.chatting.topics.deadlines",
    prompt: "When are the application deadlines?"
  },
];

export default function ChatPage() {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [leadId, setLeadId] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [error, setError] = useState(null);
  const [step, setStep] = useState("onboarding");
  const messagesEndRef = useRef(null);
  const mountedRef = useRef(true);
  const streamIndexRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'vi' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initLead = async () => {
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim());
    const nameIsValid = nameInput.trim().length >= 2;

    if (!nameIsValid) {
      setError(t('chat.onboarding.enterFullName'));
      return;
    }
    if (!emailIsValid) {
      setError(t('chat.onboarding.enterValidEmail'));
      return;
    }
    try {
      setIsLoading(true);
      const res = await chatService.initLeadRaw({
        full_name: nameInput.trim(),
        email: emailInput.trim(),
        phone: phoneInput.trim() || undefined,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setLeadId(data.lead_id);
      setStep("chatting");
      setError(null);
    } catch (err) {
      setError(err.message || t('chat.onboarding.failedToStart'));
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const queryText = input;
    const userMessage = { role: "user", content: queryText, created_at: new Date().toISOString() };
    const assistantMsg = { role: "assistant", content: "", created_at: new Date().toISOString() };

    setMessages(prev => {
      const newIdx = prev.length + 1;
      streamIndexRef.current = newIdx;
      return [...prev, userMessage, assistantMsg];
    });
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      // Backend chỉ có /chat/query (non-streaming)
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/chat/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText, lead_id: leadId || undefined, top_k: 12 }),
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();

      const assistantMsgIndex = streamIndexRef.current;
      if (mountedRef.current && assistantMsgIndex !== null) {
        setMessages(prev => prev.map((msg, i) =>
          i === assistantMsgIndex
            ? { ...msg, content: data.answer || "Tôi đã nhận được câu hỏi của bạn." }
            : msg
        ));
      }

    } catch (err) {
      const errorMsg = err.message || "Something went wrong";
      setError(errorMsg);
      setMessages(prev => {
        const idx = streamIndexRef.current;
        if (idx !== null && idx < prev.length && prev[idx]?.role === "assistant" && prev[idx]?.content === "") {
          return prev.filter((_, i) => i !== idx);
        }
        return prev;
      });
      setMessages(prev => [...prev, { role: "error", content: errorMsg, created_at: new Date().toISOString() }]);
    } finally {
      streamIndexRef.current = null;
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setLeadId(null);
    setMessages([]);
    setStep("onboarding");
    setNameInput("");
    setEmailInput("");
    setPhoneInput("");
    setError(null);
  };

  return (
    <div
      className="min-h-screen w-full overflow-hidden antialiased"
      style={{
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        background: "var(--color-vinuni-light-gray)",
      }}
    >
      <ChatSidebar step={step} setInput={setInput} t={t} />

      <div className="flex min-h-screen flex-col lg:pl-[92px]">
        <ChatHeader
          step={step}
          nameInput={nameInput}
          t={t}
          i18n={i18n}
          onLanguageToggle={toggleLanguage}
          onNewChat={startNewChat}
        />

        <main className="flex flex-1 flex-col items-center justify-center px-6 py-8">
          {/* Onboarding View */}
          {step === "onboarding" && messages.length === 0 && (
            <OnboardingView
              nameInput={nameInput}
              setNameInput={setNameInput}
              emailInput={emailInput}
              setEmailInput={setEmailInput}
              phoneInput={phoneInput}
              setPhoneInput={setPhoneInput}
              error={error}
              setError={setError}
              onStart={initLead}
              isLoading={isLoading}
              t={t}
            />
          )}

          {/* Chat Container */}
          {(step === "chatting" || messages.length > 0) && (
            <div className="flex w-full max-w-3xl flex-col">
              {/* Chat Card */}
              <div className="rounded-2xl border border-[var(--color-vinuni-line)] bg-white p-6 shadow-[0_1px_2px_rgba(10,37,64,0.04),0_12px_32px_-12px_rgba(10,37,64,0.12)]">
                {/* Header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-vinuni-navy)]">
                      <Bot className="h-6 w-6" style={{ color: "var(--color-vinuni-gold-light)" }} />
                    </div>
                    <div>
                      <p className="text-base font-semibold" style={{ color: "var(--color-vinuni-navy)" }}>
                        {t('chat.chatting.header.title')}
                      </p>
                      <p className="text-sm" style={{ color: "var(--color-vinuni-muted)" }}>
                        {t('chat.chatting.header.subtitle')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="mb-5 border-t border-[var(--color-vinuni-line)]" />

                {/* Quick Action Buttons */}
                <div className="mb-6 flex flex-wrap gap-3">
                  {TOPICS.map((topic, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(topic.prompt)}
                      className="flex items-center gap-2 rounded-xl border border-[var(--color-vinuni-line)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-vinuni-body)] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-vinuni-red)]/30 hover:bg-[var(--color-vinuni-red-light)] hover:text-[var(--color-vinuni-red)]"
                    >
                      <topic.icon className="h-4 w-4" />
                      {t(topic.titleKey)}
                    </button>
                  ))}
                </div>

                {/* Messages Area */}
                <div className="min-h-[300px] space-y-6">
                  {messages.map((msg, i) => (
                    <MessageBubble
                      key={i}
                      msg={msg}
                      nameInput={nameInput}
                      t={t}
                      setInput={setInput}
                    />
                  ))}

                  {isLoading && <TypingIndicator t={t} />}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Area */}
              <div className="mt-6">
                <form
                  onSubmit={sendMessage}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--color-vinuni-line)] bg-white py-3 pl-4 pr-3 shadow-[0_1px_2px_rgba(10,37,64,0.04),0_12px_32px_-12px_rgba(10,37,64,0.12)] transition-all duration-200 focus-within:border-[var(--color-vinuni-navy)] focus-within:ring-4 focus-within:ring-[var(--color-vinuni-navy)]/8"
                >
                  <button type="button" className="shrink-0 rounded-xl p-2 text-[var(--color-vinuni-muted)] transition-colors hover:bg-[var(--color-vinuni-light-gray)] hover:text-[var(--color-vinuni-navy)]" aria-label="Attach file">
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={step === "chatting" ? t('chat.chatting.input.placeholder') : t('chat.chatting.input.disabled')}
                    disabled={isLoading || step !== "chatting"}
                    className="flex-1 bg-transparent py-3 text-[14px] outline-none placeholder:text-[var(--color-vinuni-muted)] disabled:cursor-not-allowed"
                    style={{ color: "var(--color-vinuni-navy)" }}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim() || step !== "chatting"}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_4px_14px_rgba(128,0,32,0.35)] transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-30"
                    style={{ backgroundColor: "var(--color-vinuni-red)" }}
                    aria-label="Send message"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
                <div className="mt-3 flex items-center justify-between text-xs" style={{ color: "var(--color-vinuni-muted)" }}>
                  <span>{t('chat.footer.disclaimer')}</span>
                  <a href="/login" className="font-semibold text-[var(--color-vinuni-red)] transition-colors hover:text-[var(--color-vinuni-red-dark)]">
                    {t('chat.footer.staffLogin')}
                  </a>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}