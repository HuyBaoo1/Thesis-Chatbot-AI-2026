import Footer from "@/components/common/footer"
import Header from "@/components/common/header"
import { Outlet } from "react-router-dom"

const HomeLayout = () => {
  return (
    <div className="bg-background">
      <div className="grid min-h-screen grid-rows-[auto_1fr]">
        <Header />
        <main className="min-h-0">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  )
}

export default HomeLayout
