"use client"

import { useState } from "react"
import { Mail, Lock, Eye, EyeOff, ArrowRight, MessageCircle, Send, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showDemoAccounts, setShowDemoAccounts] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {}
    
    if (!email) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email"
    }
    
    if (!password) {
      newErrors.password = "Password is required"
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsLoading(false)
  }

  return (
    <div className="w-full lg:w-[45%] flex flex-col min-h-screen bg-vinuni-light-gray">
      {/* Mobile Header */}
      <div className="lg:hidden bg-vinuni-navy p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <span className="text-vinuni-navy font-bold text-lg">V</span>
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg">VinUniversity</h1>
            <p className="text-white/60 text-sm">Admissions Portal</p>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <p className="text-vinuni-red text-sm font-semibold tracking-widest uppercase mb-2">
              Welcome Back
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold text-vinuni-navy">
              Sign in to portal
            </h2>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-black/5 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-vinuni-navy font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@vinuni.edu.vn"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors({ ...errors, email: undefined })
                    }}
                    className={cn(
                      "pl-10 h-12 border-2 focus:border-vinuni-red focus:ring-vinuni-red/20",
                      errors.email && "border-vinuni-red/50 bg-red-50/50"
                    )}
                  />
                </div>
                {errors.email && (
                  <p className="text-vinuni-red text-sm">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-vinuni-navy font-medium">
                    Password
                  </Label>
                  <button
                    type="button"
                    className="text-sm text-vinuni-red hover:text-vinuni-red/80 font-medium transition-colors"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (errors.password) setErrors({ ...errors, password: undefined })
                    }}
                    className={cn(
                      "pl-10 pr-10 h-12 border-2 focus:border-vinuni-red focus:ring-vinuni-red/20",
                      errors.password && "border-vinuni-red/50 bg-red-50/50"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-vinuni-navy transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-vinuni-red text-sm">{errors.password}</p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-3">
                <Switch
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={setRememberMe}
                  className="data-[state=checked]:bg-vinuni-red"
                />
                <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                  Remember me on this device
                </Label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-vinuni-red to-vinuni-red/90 hover:from-vinuni-red/90 hover:to-vinuni-red text-white font-semibold text-base shadow-lg shadow-vinuni-red/25 transition-all duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Sign in to portal</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-muted-foreground">or continue with</span>
              </div>
            </div>

            {/* Social Login */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 border-2 hover:border-vinuni-navy/20 hover:bg-vinuni-light-gray transition-all"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Chat AI
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 border-2 hover:border-vinuni-navy/20 hover:bg-vinuni-light-gray transition-all"
              >
                <Send className="w-5 h-5 mr-2" />
                Telegram
              </Button>
            </div>

            {/* Demo Accounts */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-vinuni-navy transition-colors py-2"
              >
                <span>Demo accounts</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", showDemoAccounts && "rotate-180")} />
              </button>
              {showDemoAccounts && (
                <div className="mt-2 p-4 bg-vinuni-light-gray rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Admin:</span>
                    <span className="font-mono text-vinuni-navy">admin@vinuni.edu.vn</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Staff:</span>
                    <span className="font-mono text-vinuni-navy">staff@vinuni.edu.vn</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Password: demo123</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Link */}
          <p className="text-center mt-6 text-sm text-muted-foreground">
            Staff access only.{" "}
            <a href="#" className="text-vinuni-red hover:underline font-medium">
              Contact admissions
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
