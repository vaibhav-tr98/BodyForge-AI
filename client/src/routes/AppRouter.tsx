import { createBrowserRouter } from "react-router-dom";

import MainLayout from "../components/layout/MainLayout";
import AuthLayout from "../components/layout/AuthLayout";
import GuestLayout from "../components/layout/GuestLayout";
import ProtectedLayout from "../components/layout/ProtectedLayout";

import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import DashboardPage from "../pages/DashboardPage";
import OnboardingPage from "../pages/OnboardingPage";
import ProfilePage from "../pages/ProfilePage";
import NotFoundPage from "../pages/NotFoundPage";

import WorkoutListPage from "../pages/workouts/WorkoutListPage";
import WorkoutCreatePage from "../pages/workouts/WorkoutCreatePage";
import WorkoutDetailPage from "../pages/workouts/WorkoutDetailPage";
import WorkoutEditPage from "../pages/workouts/WorkoutEditPage";
import WorkoutSessionPage from "../pages/workouts/WorkoutSessionPage";
import WorkoutHistoryPage from "../pages/workouts/WorkoutHistoryPage";
import WorkoutSessionDetailPage from "../pages/workouts/WorkoutSessionDetailPage";

export const router = createBrowserRouter([
  // ── Public website ──────────────────────────────────────────────────────────
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

  // ── Guest-only auth pages ───────────────────────────────────────────────────
  {
    element: <GuestLayout />,
    children: [
      {
        element: <AuthLayout />,
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
    ],
  },

  // ── Authenticated app ───────────────────────────────────────────────────────
  {
    element: <ProtectedLayout />,
    children: [
      {
        path: "/dashboard",
        element: <DashboardPage />,
      },
      {
        path: "/onboarding",
        element: <OnboardingPage />,
      },
      {
        path: "/profile",
        element: <ProfilePage />,
      },
      {
        path: "/workouts",
        element: <WorkoutListPage />,
      },
      {
        path: "/workouts/new",
        element: <WorkoutCreatePage />,
      },
      {
        path: "/workouts/:id",
        element: <WorkoutDetailPage />,
      },
      {
        path: "/workouts/:id/edit",
        element: <WorkoutEditPage />,
      },
      {
        path: "/workouts/session/:id",
        element: <WorkoutSessionPage />,
      },
      {
        path: "/workouts/history",
        element: <WorkoutHistoryPage />,
      },
      {
        path: "/workouts/session/:id/detail",
        element: <WorkoutSessionDetailPage />,
      },
    ],
  },
]);