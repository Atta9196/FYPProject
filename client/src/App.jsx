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
                <Route path="/" element={
                  <div className="min-h-screen bg-gradient-to-r from-blue-500 to-indigo-600 flex flex-col">
                    {/* Navbar */}
                    <header className="flex justify-between items-center p-6 text-white">
                      <h1 className="text-2xl font-bold">IELTS Coach</h1>
                      <nav className="space-x-6">
                        <a href="/" className="hover:text-gray-200">Home</a>
                        <a href="/practice" className="hover:text-gray-200">Practice</a>
                        <a href="/tests" className="hover:text-gray-200">Tests</a>
                        <a href="/login" className="hover:text-gray-200">Login</a>
                        <a href="/register" className="hover:text-gray-200">Register</a>
                      </nav>
                    </header>

                    {/* Hero Section */}
                    <main className="flex flex-1 items-center justify-center text-center px-6">
                      <div className="max-w-2xl">
                        <h2 className="text-5xl font-extrabold text-white mb-6">
                          Master IELTS with <span className="text-yellow-300">Confidence</span>
                        </h2>
                        <p className="text-lg text-gray-200 mb-8">
                          Learn from expert tutors and boost your IELTS scores. Join thousands of successful students through this journey.
                        </p>
                        <div className="space-x-4">
                          <a 
                            href="/register" 
                            className="inline-block px-6 py-3 bg-yellow-400 text-black font-semibold rounded-lg shadow-md hover:bg-yellow-500 transition"
                          >
                            Get Started
                          </a>
                          <a 
                            href="/login" 
                            className="inline-block px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow-md hover:bg-gray-100 transition"
                          >
                            Sign In
                          </a>
                        </div>
                      </div>
                    </main>

                    {/* Footer */}
                    <footer className="bg-indigo-700 text-gray-200 text-center py-4">
                      © {new Date().getFullYear()} IELTS Coach. All rights reserved.
                    </footer>
                  </div>
                } />

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
                    <DashboardPage />
                  </ProtectedRoute>
                } />
                
                <Route path="/practice" element={
                  <ProtectedRoute requireAuth={true}>
                    <PracticePage />
                  </ProtectedRoute>
                } />
                
                <Route path="/tests" element={
                  <ProtectedRoute requireAuth={true}>
                    <TestsPage />
                  </ProtectedRoute>
                } />

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
