import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, ArrowRight, Mic, BookOpen, BarChart3, ListChecks, Headphones, PenTool, Mail } from 'lucide-react';
import FloatingChatButton from '../components/FloatingChatButton';
import PublicSiteNav from '../components/PublicSiteNav';
import PublicSiteFooter from '../components/PublicSiteFooter';
import useScrollToHash from '../hooks/useScrollToHash';

export default function LandingPage() {
  const { user } = useAuth();
  const getStartedTo = user ? '/dashboard' : '/register';
  const featureHref = (path) => (user ? path : '/register');
  const [isVisible, setIsVisible] = useState({});
  const heroRef = useRef(null);
  useScrollToHash();
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
      <PublicSiteNav />

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
              href={featureHref("/speaking")}
              cta="Go to Speaking →"
              buttonColor="bg-blue-500 hover:bg-blue-600"
              index={0}
            />
            <FeatureCard
              icon={<BarChart3 className="w-8 h-8 text-orange-500" />}
              title="Performance Dashboard"
              desc="Track your band score, speed, and progress visually."
              href={featureHref("/dashboard")}
              cta="Open Dashboard →"
              buttonColor="bg-orange-500 hover:bg-orange-600"
              index={1}
            />
            <FeatureCard
              icon={<BookOpen className="w-8 h-8 text-green-500" />}
              title="Mock IELTS Tests"
              desc="Practice full IELTS simulations across all modules."
              href={featureHref("/tests")}
              cta="Start Tests →"
              buttonColor="bg-green-500 hover:bg-green-600"
              index={2}
            />
            <FeatureCard
              icon={<ListChecks className="w-8 h-8 text-purple-500" />}
              title="MCQ Practice Bank"
              desc="Access timed practice with instant explanations."
              href={featureHref("/mcq")}
              cta="Practice MCQs →"
              buttonColor="bg-purple-500 hover:bg-purple-600"
              index={3}
            />
          </div>

          {/* Bottom CTA Buttons */}
          <div className={`flex items-center justify-center gap-4 flex-wrap ${isVisible.features ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
            <Link
              to="/about"
              className="px-6 py-3 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-base hover:bg-slate-50 shadow-md transition-all duration-300 hover:scale-105"
            >
              Why choose IELTS Coach
            </Link>
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

      {/* Services Preview */}
      <section id="services" className="relative py-16 md:py-20 bg-white border-t border-slate-100">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-purple-700 mb-4">Our Services</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Complete IELTS preparation across all four modules — speaking, listening, reading, and writing.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {[
              { icon: Mic, title: "Speaking", desc: "AI examiner with voice and text modes", to: "/speaking" },
              { icon: Headphones, title: "Listening", desc: "Timed tests with transcripts", to: "/listening" },
              { icon: BookOpen, title: "Reading", desc: "Authentic passages and scoring", to: "/reading" },
              { icon: PenTool, title: "Writing", desc: "Task 1 & 2 with AI feedback", to: "/writing" },
            ].map(({ icon: Icon, title, desc, to }) => (
              <div key={title} className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100 shadow-sm hover:shadow-md transition-all">
                <Icon className="w-8 h-8 text-purple-600 mb-4" />
                <h3 className="text-lg font-semibold text-purple-700 mb-2">{title}</h3>
                <p className="text-sm text-slate-600 mb-4">{desc}</p>
                <Link to={featureHref(to)} className="text-sm font-semibold text-purple-600 hover:text-purple-800">
                  Explore {title} →
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link
              to="/services"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-all"
            >
              View All Services
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Preview */}
      <section id="contact" className="relative py-16 md:py-20 bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-100 text-purple-600 mb-6">
            <Mail className="w-7 h-7" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-purple-700 mb-4">Get In Touch</h2>
          <p className="text-slate-600 max-w-2xl mx-auto mb-8">
            Questions about IELTS Coach, your account, or how to get started? Our team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/contact"
              className="px-6 py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-all"
            >
              Contact Us
            </Link>
            <Link
              to={user ? "/support" : "/register"}
              className="px-6 py-3 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-all"
            >
              {user ? "Help Center" : "Create Free Account"}
            </Link>
          </div>
        </div>
      </section>

      <PublicSiteFooter />

      <FloatingChatButton to={user ? "/chatbot" : "/login"} />
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
