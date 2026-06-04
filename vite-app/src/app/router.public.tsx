import NotFound from "@/components/common/not-found"
import HomePage from "@/features/home/home-page"
import HomeLayout from "@/layouts/home-layout"
import WidgetLayout from "@/layouts/widget-layout"
import { createBrowserRouter } from "react-router-dom"

const publicRouter = createBrowserRouter([
  {
    path: "/",
    element: <HomeLayout />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
    ],
  },
  {
    path: "/widget",
    element: <WidgetLayout />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
])

export default publicRouter
