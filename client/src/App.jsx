import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./index.css"; // Tailwind import

// Context Providers
import { FirebaseAuthProvider, AppProvider } from "./context";
import GoogleAuthProvider from "./components/GoogleAuth/GoogleAuthProvider";

// Pages
import LandingPage from "./pages/LandingPage";
import HomeLanding from "./pages/HomeLanding";
import { DashboardView } from "./pages/DashboardView";
import { SpeakingPracticeView } from "./pages/SpeakingPracticeView";
import { FullTestSimulatorView } from "./pages/FullTestSimulatorView";
import { MCQPracticeView } from "./pages/MCQPracticeView";
import { PerformanceDashboardView } from "./pages/PerformanceDashboardView";
import { ProfileView } from "./pages/ProfileView";
import { SupportView } from "./pages/SupportView";
import AboutIELTSCoachPage from "./pages/AboutPage";
import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";

// Components
import { Navbar, Footer, ProtectedRoute } from "./components";

function App() {
  return (
    <FirebaseAuthProvider>
      <AppProvider>
        <GoogleAuthProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                {/* ✅ Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/home" element={<HomeLanding />} />

                {/* ✅ Auth Routes */}
                <Route
                  path="/login"
                  element={
                    <ProtectedRoute requireAuth={false}>
                      <LoginPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <ProtectedRoute requireAuth={false}>
                      <RegisterPage />
                    </ProtectedRoute>
                  }
                />

                {/* ✅ Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute requireAuth={true}>
                      <DashboardView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/speaking"
                  element={
                    <ProtectedRoute requireAuth={true}>
                      <SpeakingPracticeView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tests"
                  element={
                    <ProtectedRoute requireAuth={true}>
                      <FullTestSimulatorView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mcq"
                  element={
                    <ProtectedRoute requireAuth={true}>
                      <MCQPracticeView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/performance"
                  element={
                    <ProtectedRoute requireAuth={true}>
                      <PerformanceDashboardView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute requireAuth={true}>
                      <ProfileView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/support"
                  element={
                    <ProtectedRoute requireAuth={true}>
                      <SupportView />
                    </ProtectedRoute>
                  }
                />

                <Route path="/about" element={<AboutIELTSCoachPage />} />

                {/* ✅ Catch-all route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </Router>
        </GoogleAuthProvider>
      </AppProvider>
    </FirebaseAuthProvider>
  );
}

export default App;
