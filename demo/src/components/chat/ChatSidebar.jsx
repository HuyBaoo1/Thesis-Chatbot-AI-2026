import { GraduationCap, Award, Calendar, ArrowRight, MessageSquare, ShieldCheck } from 'lucide-react';

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

export function ChatSidebar({ step, setInput, t }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[92px] flex-col border-r border-[var(--color-vinuni-line)] bg-white px-4 py-6 shadow-[0_1px_2px_rgba(10,37,64,0.04),0_12px_32px_-12px_rgba(10,37,64,0.12)] lg:flex">
      {/* Logo */}
      <div className="flex justify-center">
        <a
          href="/"
          className="group flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-vinuni-line)] bg-white shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:border-[var(--color-vinuni-navy)]/30 hover:bg-[var(--color-vinuni-red-light)]"
          aria-label="VinUniversity Admissions Portal"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/vi/4/4b/Tr%C6%B0%E1%BB%9Dng_%C4%90%E1%BA%A1i_h%E1%BB%8Dc_VinUni_logo.png"
            alt="VinUniversity"
            className="h-8 w-8 object-contain"
          />
        </a>
      </div>

      {/* Active state pill */}
      <div className="mt-10 flex justify-center">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-vinuni-red)]/20 bg-[var(--color-vinuni-red-light)]"
          style={{ color: "var(--color-vinuni-red)" }}
          title="Admissions Bot"
        >
          <MessageSquare className="h-5 w-5" />
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-8 flex flex-col items-center gap-3">
        {TOPICS.map((topic, i) => (
          <button
            key={i}
            onClick={() => {
              if (step === "chatting") {
                setInput(topic.prompt);
              }
            }}
            className="group flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-vinuni-line)] bg-white text-[var(--color-vinuni-body)] transition-all duration-200 hover:-translate-y-[1px] hover:border-[var(--color-vinuni-navy)]/30 hover:bg-[var(--color-vinuni-red-light)] hover:text-[var(--color-vinuni-navy)] focus:outline-none focus:ring-4 focus:ring-[var(--color-vinuni-navy)]/10"
            title={t(topic.titleKey)}
            aria-label={t(topic.titleKey)}
          >
            <topic.icon className="h-4 w-4 transition-transform group-hover:scale-110" />
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-[40px]" />

      {/* Bottom: Trust strip + sign in */}
      <div className="flex flex-col items-center gap-4">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600"
          title="Private session"
        >
          <ShieldCheck className="h-5 w-5" />
        </div>
        <a
          href="/login"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-vinuni-line)] bg-white text-[var(--color-vinuni-body)] transition-all duration-200 hover:-translate-y-[1px] hover:border-[var(--color-vinuni-red)]/35 hover:bg-[var(--color-vinuni-red-light)] hover:text-[var(--color-vinuni-red)] focus:outline-none focus:ring-4 focus:ring-[var(--color-vinuni-red)]/15"
          title={t('chat.footer.staffLogin')}
          aria-label={t('chat.footer.staffLogin')}
        >
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </aside>
  );
}