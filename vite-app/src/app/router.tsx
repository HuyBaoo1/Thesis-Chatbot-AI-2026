import adminRouter from "./router.admin"
import publicRouter from "./router.public"

const router =
  import.meta.env.VITE_APP_MODE === "admin" ? adminRouter : publicRouter

export default router
