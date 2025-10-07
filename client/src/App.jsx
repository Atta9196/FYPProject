import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./index.css"; // Tailwind import

// Context Providers
import { FirebaseAuthProvider, AppProvider } from "./context";
import GoogleAuthProvider from "./components/GoogleAuth/GoogleAuthProvider";

// Pages
import { 
  HomePage, 
  LoginPage, 
  RegisterPage, 
  ResetPasswordPage,
  DashboardPage, 
  PracticePage, 
  TestsPage,
  AboutIELTSCoachPage
} from "./pages";
import LandingPage from './pages/LandingPage';
import { 
  HomeLanding,
  DashboardView,
  SpeakingPracticeView,
  FullTestSimulatorView,
  MCQPracticeView,
  PerformanceDashboardView,
  ProfileView,
  SupportView
} from './pages/appPages';

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
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />

                {/* Authentication Routes */}
                <Route path="/login" element={
                  <ProtectedRoute requireAuth={false}>
                    <LoginPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/register" element={
                  <ProtectedRoute requireAuth={false}>
                    <RegisterPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/reset-password" element={
                  <ProtectedRoute requireAuth={false}>
                    <ResetPasswordPage />
                  </ProtectedRoute>
                } />

                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute requireAuth={true}>
                    <DashboardView />
                  </ProtectedRoute>
                } />
                
                <Route path="/speaking" element={
                  <ProtectedRoute requireAuth={true}>
                    <SpeakingPracticeView />
                  </ProtectedRoute>
                } />
                
                <Route path="/tests" element={
                  <ProtectedRoute requireAuth={true}>
                    <FullTestSimulatorView />
                  </ProtectedRoute>
                } />

                <Route path="/mcq" element={
                  <ProtectedRoute requireAuth={true}>
                    <MCQPracticeView />
                  </ProtectedRoute>
                } />

                <Route path="/performance" element={
                  <ProtectedRoute requireAuth={true}>
                    <PerformanceDashboardView />
                  </ProtectedRoute>
                } />

                <Route path="/profile" element={
                  <ProtectedRoute requireAuth={true}>
                    <ProfileView />
                  </ProtectedRoute>
                } />

                <Route path="/support" element={<SupportView />} />

                <Route path="/about" element={<AboutIELTSCoachPage />} />

                {/* Catch all route - redirect to home */}
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
