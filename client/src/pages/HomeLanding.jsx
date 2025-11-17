import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Mic, BookOpen, BarChart3, ListChecks, ArrowRight } from "lucide-react";

function HomeLanding() {
  const { user } = useAuth();
  const getStartedTo = user ? '/dashboard' : '/register';

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-purple-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-slate-200/30">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center px-4 sm:px-6 md:px-10 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/IeltsCoach logo.jpeg" 
              alt="IELTS Coach Logo" 
              className="h-12 w-auto"
            />
            <span className="text-2xl font-extrabold text-purple-700">IELTSCoach</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-slate-800 text-base">
            <a href="#home" className="hover:text-purple-700 transition-colors">Home</a>
            <a href="#features" className="hover:text-purple-700 transition-colors">Features</a>
            <a href="/about" className="hover:text-purple-700 transition-colors">About US</a>
            <a href="#services" className="hover:text-purple-700 transition-colors">Our Services</a>
            <a href="#contact" className="hover:text-purple-700 transition-colors">Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            {!user ? (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-md border-2 border-purple-600 text-purple-600 font-semibold hover:bg-purple-50 transition-all"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 rounded-md text-white font-semibold bg-purple-600 hover:bg-purple-700 transition-all shadow-md"
                >
                  Register
                </Link>
              </>
            ) : (
              <Link
                to="/dashboard"
                className="px-5 py-2.5 rounded-md text-white font-semibold bg-purple-600 hover:bg-purple-700 transition-all shadow-md"
              >
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative py-12 md:py-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10">
          <div className="text-center mb-10 md:mb-12">
            {/* Toggle Buttons */}
            <div className="inline-flex items-center gap-2 mb-6">
              <button className="px-4 py-1.5 rounded-full border-2 border-purple-600 text-purple-700 text-sm font-semibold bg-white shadow-sm">
                DISCOVER
              </button>
              <button className="px-4 py-1.5 rounded-full border-2 border-transparent text-slate-600 text-sm font-semibold hover:text-purple-700">
                CORE FEATURES
              </button>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-purple-700 mb-4 leading-tight">
              EVERYTHING YOU NEED TO EXCEL
            </h1>
            <p className="text-base md:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Practice smarter with guided coaching, immersive simulations, and beautiful, distraction-free design.
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 md:mb-12">
            <FeatureCard
              icon={<Mic className="w-8 h-8 text-blue-500" />}
              title="AI Speaking Assistant"
              desc="Real-time feedback on fluency, coherence, and pronunciation."
              href="/speaking"
              cta="Go to Speaking →"
              buttonColor="bg-blue-500 hover:bg-blue-600"
            />
            <FeatureCard
              icon={<BarChart3 className="w-8 h-8 text-orange-500" />}
              title="Performance Dashboard"
              desc="Track your band score, speed, and progress visually."
              href="/dashboard"
              cta="Open Dashboard →"
              buttonColor="bg-orange-500 hover:bg-orange-600"
            />
            <FeatureCard
              icon={<BookOpen className="w-8 h-8 text-green-500" />}
              title="Mock IELTS Tests"
              desc="Practice full IELTS simulations across all modules."
              href="/tests"
              cta="Start Tests →"
              buttonColor="bg-green-500 hover:bg-green-600"
            />
            <FeatureCard
              icon={<ListChecks className="w-8 h-8 text-purple-500" />}
              title="MCQ Practice Bank"
              desc="Access timed practice with instant explanations."
              href="/mcq"
              cta="Practice MCQs →"
              buttonColor="bg-purple-500 hover:bg-purple-600"
            />
          </div>

          {/* Bottom CTA Buttons */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a
              href="#about"
              className="px-6 py-3 rounded-lg border border-slate-300 bg-white text-slate-800 font-semibold hover:bg-slate-50 shadow-md transition-all"
            >
              Why choose IELTS Coach
            </a>
            <Link
              to={getStartedTo}
              className="px-6 py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 shadow-md transition-all inline-flex items-center gap-2"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 text-center py-8 text-lg mt-20">
        © {new Date().getFullYear()} IELTS Coach | Developed by <span className="text-purple-400 font-semibold">Software Engineering Students</span>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, href, cta, buttonColor }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col">
      <div className="mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-purple-700 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm mb-4 leading-relaxed flex-grow">{desc}</p>
      <Link
        to={href}
        className={`inline-block px-4 py-2 rounded-lg text-white text-sm font-semibold ${buttonColor} transition-all w-full text-center`}
      >
        {cta}
      </Link>
    </div>
  );
}

export default HomeLanding;
