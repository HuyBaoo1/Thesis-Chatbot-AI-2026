import HomeChatShell from "@/features/home/components/home-chat-shell"
import HomeHero from "@/features/home/components/home-hero"

const HomeLandingSection = () => {
  return (
    <section id="home" className="relative scroll-mt-28 overflow-x-clip">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_-10%_-10%,rgba(214,174,78,0.13),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_110%_110%,rgba(15,23,42,0.04),transparent)]" />
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,#0f172a 0px,#0f172a 1px,transparent 1px,transparent 64px),repeating-linear-gradient(90deg,#0f172a 0px,#0f172a 1px,transparent 1px,transparent 64px)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-6 lg:px-10 lg:py-8">
        <div className="grid gap-6 lg:h-[calc(100dvh-10rem)] lg:grid-cols-[1fr_1.18fr] lg:items-stretch">
          <HomeHero />
          <HomeChatShell />
        </div>
      </div>
    </section>
  )
}

export default HomeLandingSection
