import { useEffect } from "react"
import HomeAdmissionConditionsSection from "@/features/home/components/home-admission-conditions-section"
import HomeAdmissionProcessSection from "@/features/home/components/home-admission-process-section"
import HomeLandingSection from "@/features/home/components/home-landing-section"
import HomeProgramsSection from "@/features/home/components/home-programs-section"
import HomeScholarshipSection from "@/features/home/components/home-scholarship-section"
import { useLocation } from "react-router-dom"

const HomePage = () => {
  const location = useLocation()

  useEffect(() => {
    const sectionId = location.hash.replace("#", "") || "home"
    const element = document.getElementById(sectionId)

    if (!element) {
      return
    }

    element.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [location.hash])

  return (
    <div className="bg-[#faf9f6]">
      <HomeLandingSection />
      <HomeProgramsSection />
      <HomeScholarshipSection />
      <HomeAdmissionConditionsSection />
      <HomeAdmissionProcessSection />
    </div>
  )
}

export default HomePage
