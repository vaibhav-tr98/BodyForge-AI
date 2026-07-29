import { createBrowserRouter } from "react-router-dom";

import MainLayout from "../components/layout/MainLayout";
import AuthLayout from "../components/layout/AuthLayout";

import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import NotFoundPage from "../pages/NotFoundPage";

export const router = createBrowserRouter([
  // Public Website
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
    ],
  },

  // Authentication
  {
    element: (
      <AuthLayout
        title=""
        subtitle=""
      >
        {/* We'll fix this in the next step */}
      </AuthLayout>
    ),
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/register",
        element: <RegisterPage />,
      },
    ],
  },
]);