import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import "./i18n/i18n"
import { ThemeProvider } from "@/app/theme-provider"
import App from "./app/App"
import Providers from "./app/query-providers"
import { TooltipProvider } from "./components/ui/tooltip"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <Providers>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </Providers>
    </ThemeProvider>
  </StrictMode>
)
