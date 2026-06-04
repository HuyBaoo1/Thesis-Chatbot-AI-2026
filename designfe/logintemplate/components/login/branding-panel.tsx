"use client"

import { GraduationCap, Globe2, Award, ShieldCheck } from "lucide-react"

export function BrandingPanel() {
  return (
    <div className="relative hidden lg:flex lg:w-[55%] flex-col justify-between bg-vinuni-navy overflow-hidden">
      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-vinuni-navy via-vinuni-navy/95 to-vinuni-navy/90" />
      
      {/* Campus Photo Overlay (subtle) */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-8 lg:p-12">
        {/* Header */}
        <div className="flex items-start justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-vinuni-navy font-bold text-lg">V</span>
            </div>
            <div>
              <h1 className="text-white font-semibold text-lg tracking-tight">VinUniversity</h1>
              <p className="text-white/60 text-sm">Admissions Portal</p>
            </div>
          </div>
          
          {/* QS Badge */}
          <div className="bg-vinuni-gold/90 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
            <div className="flex flex-col items-center">
              <span className="text-vinuni-navy font-bold text-sm">QS</span>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-2 h-2 text-vinuni-navy fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            <span className="text-vinuni-navy font-semibold text-xs">5 Stars</span>
          </div>
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-white/80 text-2xl lg:text-3xl font-light mb-2">Welcome to</h2>
          <h3 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-2">
            Admissions{" "}
            <span className="text-vinuni-gold font-serif italic">Portal</span>
          </h3>
          <div className="flex items-center gap-2 mt-4">
            <span className="text-white/70 text-sm tracking-widest uppercase">Excellence</span>
            <span className="w-1.5 h-1.5 rounded-full bg-vinuni-gold" />
            <span className="text-white/70 text-sm tracking-widest uppercase">Innovation</span>
            <span className="w-1.5 h-1.5 rounded-full bg-vinuni-gold" />
            <span className="text-white/70 text-sm tracking-widest uppercase">Impact</span>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-vinuni-gold/20 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-vinuni-gold" />
              </div>
              <div>
                <p className="text-white font-bold text-xl">16</p>
                <p className="text-white/60 text-xs">Programs</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-vinuni-gold/20 flex items-center justify-center">
                <Globe2 className="w-5 h-5 text-vinuni-gold" />
              </div>
              <div>
                <p className="text-white font-bold text-xl">20+</p>
                <p className="text-white/60 text-xs">Countries</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-vinuni-gold/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-vinuni-gold" />
              </div>
              <div>
                <p className="text-white font-bold text-xl">80%</p>
                <p className="text-white/60 text-xs">PhD Faculty</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-4 text-white/40 text-xs">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SSL secured</span>
          </div>
          <span>•</span>
          <span>SOC 2 compliant</span>
        </div>
      </div>
    </div>
  )
}
