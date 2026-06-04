import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useAuthStore } from "../stores/authStore";
import LanguageToggle from "../components/ui/language-toggle";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
  Send,
  GraduationCap,
  Globe2,
  Award,
  Mail,
  Lock,
  CheckCircle2,
} from "lucide-react";

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@test.com", password: "admin123" },
  
];

// ── Design tokens → use CSS variables ─────────────────
// TOKENS kept for reference only, components now use var(--color-*) from index.css

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [capsOn, setCapsOn] = useState(false);
  const emailRef = useRef(null);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    if (serverError) setServerError("");
  }, [email, password]);

  // Validation
  const emailError =
    touched.email && !email.trim()
      ? t('login.emailRequired') || "Email is required"
      : touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? t('login.emailInvalid') || "Enter a valid email address"
      : "";
  const passwordError =
    touched.password && !password ? t('login.passwordRequired') || "Password is required" : "";

  const canSubmit = email && password && !emailError && !isLoading;

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setTouched({ email: true, password: true });
      setServerError("");
      if (!email.trim() || !password.trim() || emailError) return;

      setIsLoading(true);
      try {
        const result = await login(email, password);
        if (result.success) {
          navigate("/dashboard", { replace: true });
        } else {
          setServerError(
            result.error || t('login.error')
          );
        }
      } catch {
        setServerError(t('login.unexpectedError') || "An unexpected error occurred. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, emailError, login, navigate]
  );

  const fillDemo = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setTouched({ email: false, password: false });
  };

  const handleKey = (e) => {
    if (typeof e.getModifierState === "function") {
      setCapsOn(e.getModifierState("CapsLock"));
    }
  };

  return (
    <div
      className="min-h-screen w-full antialiased grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]"
      style={{
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
        {/* ─────────── LEFT: Photo + brand ─────────── */}
        <aside className="relative min-h-[280px] lg:min-h-screen overflow-hidden bg-[var(--color-vinuni-navy)]">
          {/* Campus photo */}
          <img
            src="https://vinuni.edu.vn/wp-content/uploads/2026/03/LF_07127-1-scaled.jpg"
            alt="VinUniversity campus"
            className="absolute inset-0 w-full h-full object-cover object-center scale-105 transition-transform duration-[1200ms] ease-out hover:scale-110"
            loading="eager"
            style={{ objectPosition: "center 40%" }}
          />
          {/* Strong dark gradient → text contrast WCAG AAA */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#0A2540] via-[#0A2540]/85 to-[#0A2540]/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070F2B] via-[#0A2540]/40 to-transparent" />
          {/* Accent glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(200,16,46,0.20),transparent_55%)]" />
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
            style={{
              backgroundImage:
                "linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)",
              backgroundSize: "56px 56px",
            }}
          />

          {/* Top brand bar */}
          <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-8 sm:px-12 lg:px-16 xl:px-20 pt-8">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/12 border border-white/25 backdrop-blur-md flex items-center justify-center">
                <img
                  src="https://upload.wikimedia.org/wikipedia/vi/4/4b/Tr%C6%B0%E1%BB%9Dng_%C4%90%E1%BA%A1i_h%E1%BB%8Dc_VinUni_logo.png"
                  alt=""
                  className="w-6 h-6 object-contain"
                />
              </div>
              <div className="leading-tight">
                <p className="text-[14px] font-semibold text-white tracking-tight">
                  VinUniversity
                </p>
                <p className="text-[9px] font-medium tracking-[0.24em] uppercase text-white/55">
                  Admissions Portal
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/10 border border-white/25 backdrop-blur-md">
              <Award className="w-3 h-3 text-[var(--color-vinuni-gold-light)]" />
              <span className="text-[10px] font-semibold tracking-[0.16em] uppercase text-white/85">
                QS 5 Stars
              </span>
            </div>
          </div>

          {/* Hero copy — vertically + horizontally centered */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full px-12 sm:px-16 lg:px-20 xl:px-24 py-24">
            <div className="w-full max-w-[460px] mx-auto">
              <div className="inline-flex items-center gap-2 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-vinuni-gold-light)]" />
                <span className="text-[10px] font-semibold tracking-[0.28em] uppercase text-white/70">
                  Excellence · Innovation · Impact
                </span>
              </div>

              <h1 className="text-[34px] sm:text-[40px] lg:text-[48px] font-bold text-white leading-[1.05] tracking-[-0.02em] drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
                Welcome to{" "}
                <span
                  className="block text-[var(--color-vinuni-gold-light)]"
                  style={{
                    fontFamily: "'Instrument Serif', serif",
                    fontStyle: "italic",
                    fontWeight: 400,
                  }}
                >
                  Admissions Portal
                </span>
              </h1>

              <p className="mt-6 text-[14px] sm:text-[15px] leading-[1.6] text-white/80 max-w-[420px]">
                Vietnam's first private university to achieve QS 5 Stars rating —
                proudly partnering with Cornell and the University of
                Pennsylvania.
              </p>

              {/* Glassmorphism stats card (floating, not heavy) */}
              <div className="hidden sm:block mt-10 rounded-xl bg-white/[0.06] border border-white/20 backdrop-blur-md sm:backdrop-blur-xl p-5">
                <div className="grid grid-cols-3 divide-x divide-white/10">
                  {[
                    { icon: GraduationCap, label: "16", sub: "Programs" },
                    { icon: Globe2, label: "20+", sub: "Countries" },
                    { icon: Award, label: "80%", sub: "PhD Faculty" },
                  ].map(({ icon: Icon, label, sub }) => (
                    <div
                      key={sub}
                      className="group/stat px-3 first:pl-0 last:pr-0 transition-transform duration-200 hover:-translate-y-0.5 cursor-default"
                    >
                      <Icon className="w-3.5 h-3.5 text-[var(--color-vinuni-gold-light)] mb-2 transition-transform duration-200 group-hover/stat:scale-110" />
                      <p className="text-[22px] font-bold text-white tracking-tight leading-none">
                        {label}
                      </p>
                      <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[var(--color-vinuni-gold-light)]/90 mt-1.5">
                        {sub}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Partnership */}
              <div className="hidden lg:flex items-center gap-3 mt-6 text-[11px] text-white/45">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="tracking-wide">SSL secured · SOC 2 compliant</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ─────────── RIGHT: Form ─────────── */}
        <main className="relative flex items-center justify-center bg-[var(--color-vinuni-light-gray)] px-6 py-10 sm:px-10 sm:py-12 lg:px-16 lg:py-16">
          {/* Soft bleed on left edge to break the hard split */}
          <div className="hidden lg:block absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0A2540]/[0.06] to-transparent pointer-events-none" />
          <div className="w-full max-w-[400px]">
            {/* Language Toggle */}
            <div className="flex justify-end mb-4">
              <LanguageToggle />
            </div>

            {/* Heading */}
            <div className="mb-7">
              <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-[var(--color-vinuni-red)] mb-2.5">
                {t('login.welcomeBack')}
              </p>
              <h2 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] leading-[1.1]">
                {t('login.title').split(' ')[0]} {" "}
                <span
                  style={{
                    fontFamily: "'Instrument Serif', serif",
                    fontStyle: "italic",
                    fontWeight: 400,
                    color: "var(--color-vinuni-red)",
                  }}
                >
                   {t('login.title').split(' ').slice(1).join(' ')}
                </span>
              </h2>
            
            </div>

            {/* Elevated form card */}
            <div className="bg-white rounded-2xl border border-[var(--color-vinuni-line)] shadow-[0_1px_2px_rgba(10,37,64,0.04),0_12px_32px_-12px_rgba(10,37,64,0.12)] p-7 sm:p-8">
            {/* Server-level error */}
            {serverError && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-xl border border-[var(--color-vinuni-red)]/20 bg-[var(--color-vinuni-red-light)] px-3.5 py-3 animate-[fadeIn_0.2s_ease]"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-[var(--color-vinuni-red)]" />
                <p className="text-[13px] leading-[1.5] text-[var(--color-vinuni-error-dark)] font-medium">
                  {serverError}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-[12px] font-semibold text-[var(--color-vinuni-navy)] mb-1.5"
                >
                  {t('login.email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-vinuni-muted)] pointer-events-none" />
                  <input
                    ref={emailRef}
                    id="login-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? "email-err" : undefined}
                    placeholder={t('login.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    disabled={isLoading}
                    className={`w-full h-12 pl-10 pr-3.5 rounded-xl bg-white text-[14px] text-[var(--color-vinuni-navy)] placeholder:text-[var(--color-vinuni-muted)] outline-none transition-all duration-200 ease-out border ${
                      emailError
                        ? "border-[#C8102E] focus:ring-[var(--color-vinuni-red)]/12"
                        : "border-[var(--color-vinuni-line)] hover:border-[var(--color-vinuni-hover)] focus:border-[var(--color-vinuni-navy)] focus:ring-[var(--color-vinuni-navy)]/8"
                    }`}
                  />
                </div>
                {emailError && (
                  <p
                    id="email-err"
                    className="mt-1.5 text-[12px] text-[var(--color-vinuni-red)] font-medium flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" /> {emailError}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="text-[12px] font-semibold text-[var(--color-vinuni-navy)]"
                  >
                    {t('login.password')}
                  </label>
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-[var(--color-vinuni-red)] hover:text-[var(--color-vinuni-red-dark)] transition-colors"
                  >
                    {t('login.forgotPassword')}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-vinuni-muted)] pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    aria-invalid={!!passwordError}
                    aria-describedby={passwordError ? "pw-err" : undefined}
                    placeholder={t('login.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKey}
                    onKeyUp={handleKey}
                    onBlur={() =>
                      setTouched((t) => ({ ...t, password: true }))
                    }
                    disabled={isLoading}
                    className={`w-full h-12 pl-10 pr-11 rounded-xl bg-white text-[14px] text-[var(--color-vinuni-navy)] placeholder:text-[var(--color-vinuni-muted)] outline-none transition-all duration-200 ease-out border ${
                      passwordError
                        ? "border-[#C8102E] focus:ring-[var(--color-vinuni-red)]/12"
                        : "border-[var(--color-vinuni-line)] hover:border-[var(--color-vinuni-hover)] focus:border-[var(--color-vinuni-navy)] focus:ring-[var(--color-vinuni-navy)]/8"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 inline-flex items-center justify-center rounded-lg text-[var(--color-vinuni-muted)] hover:text-[var(--color-vinuni-navy)] hover:bg-[var(--color-vinuni-light-gray)] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p
                    id="pw-err"
                    className="mt-1.5 text-[12px] text-[var(--color-vinuni-red)] font-medium flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" /> {passwordError}
                  </p>
                )}
                {capsOn && !passwordError && (
                  <p className="mt-1.5 text-[12px] text-[var(--color-vinuni-amber)] font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {t('login.capsLockOn')}
                  </p>
                )}
              </div>

              {/* Remember */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
                <span className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="w-4 h-4 rounded-md border border-[#C1CCD6] bg-white peer-checked:bg-[var(--color-vinuni-navy)] peer-checked:border-[var(--color-vinuni-navy)] peer-focus-visible:ring-4 peer-focus-visible:ring-[var(--color-vinuni-navy)]/15 transition-all flex items-center justify-center">
                    <svg
                      className="w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M2 6l3 3 5-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </span>
                <span className="text-[13px] text-[var(--color-vinuni-body)]">
                  {t('login.keepSignedIn')}
                </span>
              </label>

              {/* CTA — brand red, primary action anchor */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="group relative w-full h-12 mt-2 rounded-xl text-white text-[14px] font-semibold tracking-[0.01em] transition-all duration-200 bg-gradient-to-b from-[#D81E3F] to-[#A50D26] hover:from-[#E03452] hover:to-[#B81030] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#C8102E]/30 disabled:opacity-55 disabled:cursor-not-allowed shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_2px_4px_rgba(165,13,38,0.25),0_10px_24px_-6px_rgba(200,16,46,0.45)] hover:shadow-[0_1px_0_rgba(255,255,255,0.22)_inset,0_4px_10px_rgba(165,13,38,0.30),0_18px_40px_-8px_rgba(200,16,46,0.55)] hover:-translate-y-[1px]"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('login.loggingIn')}
                    </>
                  ) : (
                    <>
                      {t('login.loginButton')}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[var(--color-vinuni-line)]" />
              </div>
              <div className="relative flex justify-center bg-white">
                <span className="px-3 text-[10px] font-semibold tracking-[0.22em] uppercase text-[var(--color-vinuni-muted)]">
                  {t('login.orContinueWith')}
                </span>
              </div>
            </div>

            {/* Secondary auth */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href="/chat"
                className="group h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-vinuni-line)] bg-white text-[13px] font-medium text-[var(--color-vinuni-body)] hover:text-[var(--color-vinuni-navy)] hover:border-[var(--color-vinuni-navy)/30] hover:bg-[var(--color-vinuni-light-gray)] hover:-translate-y-[1px] transition-all duration-200"
              >
                <MessageSquare className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                {t('login.chatAI')}
              </a>
              <a
                href="https://t.me/vinunitele_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="group h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-vinuni-line)] bg-white text-[13px] font-medium text-[var(--color-vinuni-body)] hover:text-[var(--color-vinuni-navy)] hover:border-[var(--color-vinuni-telegram)/40] hover:bg-[var(--color-vinuni-light-gray)] hover:-translate-y-[1px] transition-all duration-200"
              >
                <Send className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                {t('login.telegram')}
              </a>
            </div>
            </div>{/* /elevated form card */}

            {/* Footer note + tucked-away demo trigger */}
            <p className="mt-7 text-center text-[12px] text-[var(--color-vinuni-muted)]">
              <span className="text-[var(--color-vinuni-muted)]">{t('login.staffAccessOnly')}</span>{" "}
              <a href="#" className="font-medium text-[var(--color-vinuni-red)] hover:text-[var(--color-vinuni-red-dark)] transition-colors">
                {t('login.contactAdmissions')}
              </a>
            </p>

            {/* Collapsible demo accounts (dev/test helper) */}
            <details className="mt-3 group">
              <summary className="cursor-pointer list-none text-center text-[10px] font-semibold tracking-[0.18em] uppercase text-[var(--color-vinuni-muted)] hover:text-[var(--color-vinuni-navy)] transition-colors select-none">
                <span className="inline-flex items-center gap-1">
                  {t('login.demoAccounts')}
                  <svg className="w-3 h-3 transition-transform group-open:rotate-180" viewBox="0 0 12 12" fill="none">
                    <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </summary>
              <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillDemo(acc)}
                    className="group/btn inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-vinuni-line)] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-vinuni-body)] hover:border-[#0A2540] hover:text-[var(--color-vinuni-navy)] transition-colors"
                  >
                    <CheckCircle2 className="w-3 h-3 opacity-50 group-hover/btn:opacity-100 transition-opacity" />
                    {acc.role} · {acc.email}
                  </button>
                ))}
              </div>
            </details>
          </div>
        </main>
    </div>
  );
}
