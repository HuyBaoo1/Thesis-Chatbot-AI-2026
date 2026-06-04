import { BrandingPanel } from "@/components/login/branding-panel"
import { LoginForm } from "@/components/login/login-form"

export default function LoginPage() {
  return (
    <main className="flex min-h-screen">
      <BrandingPanel />
      <LoginForm />
    </main>
  )
}
