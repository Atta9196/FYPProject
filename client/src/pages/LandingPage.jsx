import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mic, BookOpen, BarChart3, ListChecks, CheckCircle2, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();
  const getStartedTo = user ? '/dashboard' : '/register';

    return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-100 text-slate-900 scroll-smooth snap-y snap-mandatory font-sans">
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-gradient-to-br from-blue-400/40 to-indigo-300/40 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-gradient-to-tr from-sky-300/40 to-blue-200/40 blur-3xl animate-[pulse_7s_ease-in-out_infinite]" />
            </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 shadow-sm border-b border-slate-200/30">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center px-4 sm:px-6 md:px-10 py-4">
          <Link to="/" className="text-3xl font-extrabold tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">IELTSCoach</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-slate-700 text-lg">
            <a href="#home" className="hover:text-blue-700 transition-colors">Home</a>
            <a href="#features" className="hover:text-blue-700 transition-colors">Features</a>
            <a href="#about" className="hover:text-blue-700 transition-colors">About</a>
            <a href="#contact" className="hover:text-blue-700 transition-colors">Contact</a>
                </nav>

          <div className="flex items-center gap-3">
            {!user && (
              <Link
                to="/login"
                className="px-4 py-2 rounded-md border-2 border-blue-600 text-blue-600 font-semibold hover:bg-blue-50 transition-all"
              >
                Login
              </Link>
            )}
            <Link
              to={getStartedTo}
              className="group px-5 py-2.5 rounded-md text-white font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-md"
            >
              <span className="inline-block group-hover:translate-x-1 transition-transform">Register</span>
            </Link>
          </div>
        </div>
            </header>

      {/* Hero Section */}
      <section id="home" className="relative snap-start min-h-[100dvh] flex items-center">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 py-16 grid md:grid-cols-2 items-center gap-10 w-full">
          <div className="animate-fade-up [animation-delay:150ms]">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-tight text-slate-900">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-700">
                Your Smart Path to IELTS Success
              </span>
                        </h1>
            <p className="mt-6 text-lg sm:text-xl md:text-2xl text-slate-700 max-w-3xl leading-relaxed">
              IELTS Coach is an AI-powered platform that helps you master all four IELTS modules — with smart analytics, AI feedback, and real exam simulations.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-5">
              <Link
                to={getStartedTo}
                className="inline-flex items-center justify-center rounded-full px-8 py-3 text-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25"
              >
                                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
                            </Link>
              <a
                href="#about"
                className="inline-flex items-center justify-center rounded-full px-8 py-3 text-lg font-semibold bg-white/90 border border-slate-300 text-slate-800 hover:bg-white shadow-md"
              >
                Learn More
              </a>
                        </div>

            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-lg text-slate-700">
              {['Personalized AI Coaching', 'Full Test Simulations', 'Smart Progress Dashboard', 'MCQ Practice Bank'].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600" />
                  <span className="hover:text-blue-700 transition-colors">{t}</span>
                </li>
                            ))}
                        </ul>
                    </div>

          <div className="relative animate-pop [animation-delay:300ms]">
            <div className="aspect-video rounded-3xl bg-gradient-to-br from-blue-100 to-white border border-slate-200 shadow-2xl overflow-hidden flex items-center justify-center">
              <img
                src="/IELTS%20Coach.png"
                alt="IELTS Coach"
                className="w-full h-full object-cover"
              />
            </div>
                    </div>
                </div>
            </section>

   

      {/* Features Section */}
      <section id="features" className="snap-start min-h-[100dvh] relative flex items-center overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white via-sky-50 to-indigo-50" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(2,6,23,0.05)_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />
        </div>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 py-20 w-full">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider shadow-sm animate-fade-in">
              <span>Discover</span>
              <span className="text-indigo-700">Core Features</span>
            </div>
            <h2 className="mt-4 text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Everything you need to excel
            </h2>
            <p className="mt-3 text-slate-600 max-w-3xl mx-auto">
              Practice smarter with guided coaching, immersive simulations, and beautiful, distraction‑free design.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="animate-fade-up" style={{animationDelay:'80ms'}}>
              <FeatureCard
                icon={<Mic className="w-8 h-8 text-blue-600" />}
                title="AI Speaking Assistant"
                desc="Real-time feedback on fluency, coherence, and pronunciation."
                href="/speaking"
                cta="Go to Speaking"
                gradient="from-blue-600 to-indigo-600"
              />
            </div>
            <div className="animate-fade-up" style={{animationDelay:'160ms'}}>
              <FeatureCard
                icon={<BarChart3 className="w-8 h-8 text-amber-600" />}
                title="Performance Dashboard"
                desc="Track your band score, speed, and progress visually."
                href="/dashboard"
                cta="Open Dashboard"
                gradient="from-amber-500 to-orange-600"
              />
            </div>
            <div className="animate-fade-up" style={{animationDelay:'240ms'}}>
              <FeatureCard
                icon={<BookOpen className="w-8 h-8 text-emerald-600" />}
                title="Mock IELTS Tests"
                desc="Practice full IELTS simulations across all modules."
                href="/tests"
                cta="Start Tests"
                gradient="from-emerald-600 to-teal-600"
              />
            </div>
            <div className="animate-fade-up" style={{animationDelay:'320ms'}}>
              <FeatureCard
                icon={<ListChecks className="w-8 h-8 text-purple-600" />}
                title="MCQ Practice Bank"
                desc="Access timed practice with instant explanations."
                href="/mcq"
                cta="Practice MCQs"
                gradient="from-purple-600 to-fuchsia-600"
              />
                                </div>
                            </div>

          <div className="mt-12 flex items-center justify-center gap-3">
            <a href="#about" className="inline-flex items-center justify-center rounded-full px-7 py-3 text-base font-semibold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 shadow-md">
              Why choose IELTS Coach
            </a>
            <Link to={getStartedTo} className="inline-flex items-center justify-center rounded-full px-7 py-3 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/20">
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
                </div>
            </section>

            {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 text-center py-8 text-lg">
        © {new Date().getFullYear()} IELTS Coach | Developed by <span className="text-blue-400 font-semibold">Software Engineering Students</span>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, desc, href, cta = 'Open', gradient = 'from-blue-600 to-indigo-600' }) {
    return (
    <a href={href || '#'} className="group block">
      <div className="rounded-2xl bg-white/80 backdrop-blur border border-slate-200 p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-blue-100 to-slate-50 flex items-center justify-center mb-5">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
        <p className="text-slate-600 mt-2 text-base leading-relaxed">{desc}</p>
        <div className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r ${gradient} shadow hover:brightness-105 transition`}> 
          <span>{cta}</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </a>
    );
}
