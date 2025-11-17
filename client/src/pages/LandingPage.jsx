import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, ArrowRight, Mic, BookOpen, BarChart3, ListChecks } from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();
  const getStartedTo = user ? '/dashboard' : '/register';
  const [isVisible, setIsVisible] = useState({});
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const cardsRef = useRef(null);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(prev => ({ ...prev, [entry.target.id]: true }));
        }
      });
    }, observerOptions);

    const elements = [
      { ref: heroRef, id: 'hero' },
      { ref: featuresRef, id: 'features' },
      { ref: cardsRef, id: 'cards' }
    ];

    elements.forEach(({ ref, id }) => {
      if (ref.current) {
        ref.current.id = id;
        observer.observe(ref.current);
      }
    });

    // Trigger initial animations
    setTimeout(() => {
      setIsVisible({ hero: true, features: false, cards: false });
    }, 100);

    return () => {
      elements.forEach(({ ref }) => {
        if (ref.current) {
          observer.unobserve(ref.current);
        }
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-slate-200/30 animate-fade-in">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center px-4 sm:px-6 md:px-10 py-4">
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="/IeltsCoach logo.jpeg" 
              alt="IELTS Coach Logo" 
              className="h-12 w-auto transition-transform duration-300 group-hover:scale-110"
            />
            <span className="text-2xl font-extrabold text-purple-700 leading-tight transition-colors duration-300 group-hover:text-purple-800">IELTSCoach</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-slate-700 text-base font-normal">
            <a href="#home" className="hover:text-purple-700 transition-all duration-300 hover:scale-105">Home</a>
            <a href="#features" className="hover:text-purple-700 transition-all duration-300 hover:scale-105">Features</a>
            <a href="/about" className="hover:text-purple-700 transition-all duration-300 hover:scale-105">About US</a>
            <a href="#services" className="hover:text-purple-700 transition-all duration-300 hover:scale-105">Our Services</a>
            <a href="#contact" className="hover:text-purple-700 transition-all duration-300 hover:scale-105">Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            {!user ? (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-md border border-purple-600 text-purple-600 font-semibold text-sm hover:bg-purple-50 transition-all"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 rounded-md text-white font-semibold text-sm bg-purple-600 hover:bg-purple-700 transition-all"
                >
                  Register
                </Link>
              </>
            ) : (
                <Link
                  to="/dashboard"
                  className="px-5 py-2.5 rounded-lg text-white font-semibold text-sm bg-purple-600 hover:bg-purple-700 transition-all"
                >
                  Go to Dashboard
                </Link>
            )}
          </div>
        </div>
      </header>

      {/* First Hero Section - Landing Page */}
      <section id="home" ref={heroRef} className="relative min-h-[90vh] flex items-center bg-white py-12 md:py-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 grid md:grid-cols-2 items-center gap-12 w-full">
          <div className={`space-y-6 ${isVisible.hero ? 'animate-slide-in-left' : 'opacity-0'}`}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight text-purple-700">
              YOUR SMART PATH TO A HIGHER BAND
            </h1>
            <p className="text-base md:text-lg text-slate-700 max-w-2xl leading-relaxed">
              Stop guessing and start mastering the IELTS with IELTS Coach. Our AI-powered platform provides smart analytics, targeted feedback, and real exam simulations for all four modules, putting your top score within reach.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                to={getStartedTo}
                className="inline-flex items-center justify-center rounded-lg px-8 py-3 text-base font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-all duration-300 hover:scale-105 hover:shadow-lg group"
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-lg px-8 py-3 text-base font-semibold bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 transition-all duration-300 hover:scale-105 hover:shadow-md"
              >
                Learn More
              </a>
            </div>

            <ul className="space-y-3 pt-6">
              {['Personalized AI Coaching', 'Smart Progress Dashboard', 'Full Test Simulations', 'MCQ Practice Bank'].map((t, index) => (
                <li 
                  key={t} 
                  className={`flex items-center gap-3 ${isVisible.hero ? 'animate-fade-up' : 'opacity-0'}`}
                  style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                >
                  <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 transition-transform duration-300 hover:scale-125" />
                  <span className="text-base text-slate-700">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`relative ${isVisible.hero ? 'animate-slide-in-right' : 'opacity-0'}`}>
            <div className="rounded-2xl overflow-hidden shadow-lg bg-slate-50 animate-float">
              <img
                src="/Homepage image.png"
                alt="IELTS Coach - Student studying"
                className="w-full h-auto object-cover transition-transform duration-700 hover:scale-105"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Second Section - Features Page */}
      <section id="features" ref={featuresRef} className="relative py-16 md:py-20 bg-gradient-to-b from-blue-50 via-purple-50 to-purple-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10">
          <div className={`text-center mb-12 md:mb-16 ${isVisible.features ? 'animate-fade-up' : 'opacity-0'}`}>
            {/* Toggle Buttons */}
            <div className="inline-flex items-center gap-2 mb-8">
              <button className="px-4 py-1.5 rounded-full border-2 border-purple-600 text-purple-700 text-sm font-semibold bg-white shadow-sm transition-all duration-300 hover:scale-110">
                DISCOVER
              </button>
              <button className="px-4 py-1.5 rounded-full border-2 border-transparent text-slate-600 text-sm font-semibold hover:text-purple-700 transition-all duration-300 hover:scale-110">
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
          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <FeatureCard
              icon={<Mic className="w-8 h-8 text-blue-500" />}
              title="AI Speaking Assistant"
              desc="Real-time feedback on fluency, coherence, and pronunciation."
              href="/speaking"
              cta="Go to Speaking →"
              buttonColor="bg-blue-500 hover:bg-blue-600"
              index={0}
            />
            <FeatureCard
              icon={<BarChart3 className="w-8 h-8 text-orange-500" />}
              title="Performance Dashboard"
              desc="Track your band score, speed, and progress visually."
              href="/dashboard"
              cta="Open Dashboard →"
              buttonColor="bg-orange-500 hover:bg-orange-600"
              index={1}
            />
            <FeatureCard
              icon={<BookOpen className="w-8 h-8 text-green-500" />}
              title="Mock IELTS Tests"
              desc="Practice full IELTS simulations across all modules."
              href="/tests"
              cta="Start Tests →"
              buttonColor="bg-green-500 hover:bg-green-600"
              index={2}
            />
            <FeatureCard
              icon={<ListChecks className="w-8 h-8 text-purple-500" />}
              title="MCQ Practice Bank"
              desc="Access timed practice with instant explanations."
              href="/mcq"
              cta="Practice MCQs →"
              buttonColor="bg-purple-500 hover:bg-purple-600"
              index={3}
            />
          </div>

          {/* Bottom CTA Buttons */}
          <div className={`flex items-center justify-center gap-4 flex-wrap ${isVisible.features ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
            <a
              href="#about"
              className="px-6 py-3 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-base hover:bg-slate-50 shadow-md transition-all duration-300 hover:scale-105"
            >
              Why choose IELTS Coach
            </a>
            <Link
              to={getStartedTo}
              className="px-6 py-3 rounded-lg bg-purple-600 text-white font-semibold text-base hover:bg-purple-700 shadow-md transition-all duration-300 hover:scale-105 inline-flex items-center gap-2 group"
            >
              Get Started
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 text-center py-8 text-lg">
        © {new Date().getFullYear()} IELTS Coach | Developed by <span className="text-purple-400 font-semibold">Software Engineering Students</span>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, href, cta, buttonColor, index }) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={cardRef}
      className={`bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col hover:-translate-y-2 ${isVisible ? 'animate-scale-in' : 'opacity-0'}`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="mb-4 transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-purple-700 mb-3 leading-tight transition-colors duration-300 hover:text-purple-800">{title}</h3>
      <p className="text-slate-600 text-sm mb-5 leading-relaxed flex-grow">{desc}</p>
      <Link
        to={href}
        className={`inline-block px-4 py-2.5 rounded-lg text-white text-sm font-semibold ${buttonColor} transition-all duration-300 w-full text-center hover:scale-105 hover:shadow-lg`}
      >
        {cta}
      </Link>
    </div>
  );
}
