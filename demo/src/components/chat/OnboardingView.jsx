import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { User, Mail, Phone, Bot, ShieldCheck, ArrowRight } from 'lucide-react';
import { GraduationCap, Award, Calendar } from 'lucide-react';

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

const inputBaseClass = "w-full h-12 rounded-xl border border-[var(--color-vinuni-line)] bg-white py-0 pl-16 pr-3.5 text-[14px] outline-none transition-all duration-200 ease-out placeholder:text-[var(--color-vinuni-muted)] hover:border-[var(--color-vinuni-hover)] focus:border-[var(--color-vinuni-navy)] focus:ring-4 focus:ring-[var(--color-vinuni-navy)]/8";

const FieldIcon = ({ icon: Icon }) => (
  <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-vinuni-muted)]" />
);

export function OnboardingView({ nameInput, setNameInput, emailInput, setEmailInput, phoneInput, setPhoneInput, error, setError, onStart, isLoading, t }) {
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim());
  const nameIsValid = nameInput.trim().length >= 2;
  const canStart = nameIsValid && emailIsValid && !isLoading;

  return (
    <section className="w-full max-w-xl rounded-2xl border border-[var(--color-vinuni-line)] bg-white p-8 shadow-[0_20px_60px_rgba(128,0,32,0.10)] animate-fade-in-up">
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--color-vinuni-red)]/20 bg-[var(--color-vinuni-red-light)] text-[var(--color-vinuni-red)] shadow-sm"
        >
          <Bot className="h-8 w-8" />
        </div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t('chat.welcome.privateSession')}
        </div>
        <h1 id="chat-welcome-title" className="text-3xl font-bold leading-tight tracking-[-0.02em] text-[var(--color-vinuni-red)]">
          {t('chat.welcome.title')}
        </h1>
        <p className="mx-auto mt-3 text-base leading-relaxed text-[#666666]">
          {t('chat.welcome.subtitle')}
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#333333]">
            {t('chat.welcome.fullName')} <span className="text-[var(--color-vinuni-red)]">{t('chat.welcome.required')}</span>
          </label>
          <div className="relative">
            <FieldIcon icon={User} />
            <input
              type="text"
              value={nameInput}
              onChange={(e) => { setNameInput(e.target.value); if (error) setError(null); }}
              placeholder="e.g. Nguyen Van A"
              className={inputBaseClass}
              aria-invalid={nameInput && !nameIsValid ? "true" : "false"}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#333333]">
            {t('chat.welcome.email')} <span className="text-[var(--color-vinuni-red)]">{t('chat.welcome.required')}</span>
          </label>
          <div className="relative">
            <FieldIcon icon={Mail} />
            <input
              type="email"
              value={emailInput}
              onChange={(e) => { setEmailInput(e.target.value); if (error) setError(null); }}
              placeholder="email@example.com"
              className={inputBaseClass}
              aria-invalid={emailInput && !emailIsValid ? "true" : "false"}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#333333]">
            {t('chat.welcome.phone')} <span className="font-normal normal-case tracking-normal text-[#666666]">{t('chat.welcome.phoneOptional')}</span>
          </label>
          <div className="relative">
            <FieldIcon icon={Phone} />
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="09xxxxxxxx"
              className={inputBaseClass}
            />
          </div>
        </div>

        {error && (
          <div
            className="rounded-xl border border-[var(--color-vinuni-red)]/20 bg-[var(--color-vinuni-red-light)] px-4 py-3 text-sm font-medium"
            style={{ color: "var(--color-vinuni-red-dark)" }}
          >
            {error}
          </div>
        )}

        <button
          onClick={onStart}
          disabled={!canStart}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-bold text-white shadow-[0_4px_14px_rgba(128,0,32,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(128,0,32,0.40)] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-vinuni-red)' }}
        >
          {isLoading ? (
            <>
              <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              {t('chat.welcome.starting')}
            </>
          ) : (
            <>
              {t('chat.welcome.startButton')}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </div>

      <div className="mt-8 text-center">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#999999]">
          {t('chat.welcome.popularQuestions')}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {TOPICS.map((topic, i) => (
            <button
              key={i}
              onClick={() => setInput(topic.prompt)}
              className="flex items-center gap-2 rounded-full bg-[#F5F5F5] px-4 py-2 text-sm font-medium text-[#333333] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--color-vinuni-red)] hover:text-white"
            >
              <topic.icon className="h-4 w-4 text-[var(--color-vinuni-red)] transition-colors group-hover:text-white" />
              <span>{t(topic.titleKey)}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}