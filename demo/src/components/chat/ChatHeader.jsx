import { Sparkles, Globe, Menu } from 'lucide-react';

export function ChatHeader({ step, nameInput, t, i18n, onLanguageToggle, onNewChat }) {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--color-vinuni-line)] bg-white/90 backdrop-blur-md">
      <div
        className="mx-auto flex h-[68px] items-center justify-between gap-4 px-4 pr-6 sm:px-6 lg:px-10"
        style={{ paddingLeft: '100px' }}
      >
        <div className="flex items-center gap-3">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-vinuni-line)] bg-white text-[var(--color-vinuni-muted)] shadow-sm lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-vinuni-navy)] sm:flex">
            <Sparkles className="h-5 w-5" style={{ color: "var(--color-vinuni-gold-light)" }} />
          </div>
          <div>
            <h2 className="text-[18px] font-bold tracking-[-0.02em] sm:text-[21px]">
              {t('chat.chatting.header.title')}
            </h2>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--color-vinuni-muted)" }}>
              {step === "chatting" ? `${nameInput || "Guest"}` : t('chat.welcome.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Toggle */}
          <button
            onClick={onLanguageToggle}
            className="language-toggle"
            title={i18n.language === 'en' ? 'Chuyển sang Tiếng Việt' : 'Switch to English'}
          >
            <Globe className="h-4 w-4" />
            <span className="lang-code">{i18n.language.toUpperCase()}</span>
          </button>

          {step === "chatting" && (
            <button
              onClick={onNewChat}
              className="rounded-xl border border-[var(--color-vinuni-line)] bg-white px-3 py-2 text-[12px] font-semibold text-[var(--color-vinuni-body)] shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:border-[var(--color-vinuni-navy)]/30 hover:bg-[var(--color-vinuni-light-gray)] hover:text-[var(--color-vinuni-navy)] sm:px-4"
            >
              {t('chat.chatting.header.newChat')}
            </button>
          )}
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700 sm:text-[11px]">
              {t('chat.status.aiOnline')}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}