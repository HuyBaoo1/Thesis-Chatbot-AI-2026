import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Loader2, LockKeyhole, ShieldCheck } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, Navigate } from "react-router-dom"

import logo from "@/assets/logo.png"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import useAuth from "@/hooks/use-auth"
import { loginSchema, type LoginSchema } from "@/schemas/auth-schema"

const LoginLayout = () => {
  const { t } = useTranslation("login")
  const { accessToken, user, login, loginPending, loginError } = useAuth()

  const INFO_CARDS = [
    {
      label: t("infoCards.session.label"),
      value: t("infoCards.session.value"),
      description: t("infoCards.session.description"),
    },
    {
      label: t("infoCards.role.label"),
      value: t("infoCards.role.value"),
      description: t("infoCards.role.description"),
    },
    {
      label: t("infoCards.store.label"),
      value: t("infoCards.store.value"),
      description: t("infoCards.store.description"),
    },
  ]

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  if (accessToken && user) {
    return <Navigate to="/admin" replace />
  }

  const handleSubmit = async (values: LoginSchema) => {
    try {
      await login(values)
      // Redirect handled by <Navigate> above when accessToken/user update
    } catch {
      // login mutation sets loginError automatically
    }
  }

  const errorMessage = loginError?.message ?? null

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#faf9f6]">
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-linear(ellipse_70%_50%_at_-5%_-5%,rgba(214,174,78,0.13),transparent)]" />
        <div className="absolute inset-0 bg-[radial-linear(ellipse_50%_40%_at_105%_105%,rgba(15,23,42,0.04),transparent)]" />
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              "repeating-linear-linear(0deg,#0f172a 0px,#0f172a 1px,transparent 1px,transparent 64px),repeating-linear-linear(90deg,#0f172a 0px,#0f172a 1px,transparent 1px,transparent 64px)",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10 lg:px-10">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
          {/* ── Left column ── */}
          <div className="hidden max-w-xl space-y-8 lg:block">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("backToHome")}
            </Link>

            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d6ae4e]/30 bg-[#d6ae4e]/8 px-4 py-2 text-[13px] font-medium text-[#a07c24]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#d6ae4e]" />
                {t("adminZone")}
              </div>

              <h1 className="text-[2.6rem] leading-[1.1] font-semibold tracking-[-0.02em] text-slate-950">
                {t("title")}
              </h1>

              <div className="h-px w-12 bg-linear-to-r from-[#d6ae4e]/60 to-transparent" />

              <p className="text-[15px] leading-relaxed text-slate-500">
                {t("description")}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {INFO_CARDS.map((card) => (
                <div
                  key={card.label}
                  className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]"
                >
                  <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-linear-to-r from-[#d6ae4e]/60 via-[#d6ae4e]/30 to-transparent" />
                  <p className="text-[10px] font-semibold tracking-[0.2em] text-[#b8922e] uppercase">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {card.value}
                  </p>
                  <p className="mt-1.5 text-[12px] leading-normal text-slate-500">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right column: Login card ── */}
          <div className="mx-auto w-full max-w-md">
            <div className="overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-[0_32px_80px_-24px_rgba(15,23,42,0.18),0_0_0_1px_rgba(255,255,255,0.8)_inset]">
              {/* Gold accent bar */}
              <div className="h-0.75 bg-linear-to-r from-[#d6ae4e] via-[#e8c96a] to-[#d6ae4e]/30" />

              <div className="p-7 sm:p-8">
                {/* Header */}
                <div className="mb-7 flex items-center justify-between">
                  <Link to="/" className="shrink-0">
                    <img
                      className="h-11 w-auto"
                      src={logo}
                      alt="VinUni AI Admissions"
                    />
                  </Link>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
                    <LockKeyhole className="h-4 w-4" />
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <h2 className="text-[22px] font-semibold tracking-tight text-slate-950">
                    {t("loginTitle")}
                  </h2>
                  <p className="text-[13px] leading-relaxed text-slate-500">
                    {t("loginSubtitle")}
                  </p>
                </div>

                {/* Form */}
                <form
                  noValidate
                  className="mt-7 space-y-5"
                  onSubmit={form.handleSubmit(handleSubmit)}
                >
                  <FieldGroup className="gap-4">
                    <Field>
                      <FieldLabel
                        htmlFor="login-email"
                        className="text-[13px] font-medium text-slate-700"
                      >
                        {t("emailLabel")}
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          id="login-email"
                          type="email"
                          autoComplete="email"
                          className="h-11 rounded-xl border-slate-200 bg-slate-50/50 px-3.5 text-[14px] text-slate-800 placeholder:text-slate-400 focus-visible:border-slate-400 focus-visible:bg-white focus-visible:shadow-[0_0_0_3px_rgba(15,23,42,0.06)]"
                          placeholder="admin@vinuni.edu.vn"
                          {...form.register("email")}
                        />
                        <FieldError errors={[form.formState.errors.email]} />
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldLabel
                        htmlFor="login-password"
                        className="text-[13px] font-medium text-slate-700"
                      >
                        {t("passwordLabel")}
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          id="login-password"
                          type="password"
                          autoComplete="current-password"
                          className="h-11 rounded-xl border-slate-200 bg-slate-50/50 px-3.5 text-[14px] text-slate-800 placeholder:text-slate-400 focus-visible:border-slate-400 focus-visible:bg-white focus-visible:shadow-[0_0_0_3px_rgba(15,23,42,0.06)]"
                          placeholder={t("passwordPlaceholder")}
                          {...form.register("password")}
                        />
                        <FieldError errors={[form.formState.errors.password]} />
                      </FieldContent>
                    </Field>
                  </FieldGroup>

                  {errorMessage ? (
                    <div className="rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-[13px] text-red-600">
                      {errorMessage}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    size="lg"
                    className="h-11 w-full cursor-pointer rounded-xl bg-slate-950 text-[14px] font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                    disabled={loginPending}
                  >
                    {loginPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {loginPending ? t("loggingIn") : t("loginButton")}
                  </Button>
                </form>

                {/* Mobile back link */}
                <div className="mt-6 block lg:hidden">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-700"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t("backToHome")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginLayout
