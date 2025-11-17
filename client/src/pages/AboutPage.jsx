import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Target, Users, Award, BookOpen, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';

export default function AboutPage() {
    const { user } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const sectionRef = useRef(null);

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

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => {
            if (sectionRef.current) {
                observer.unobserve(sectionRef.current);
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-200/30">
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
                        <Link to="/" className="hover:text-purple-700 transition-all duration-300 hover:scale-105">Home</Link>
                        <Link to="#features" className="hover:text-purple-700 transition-all duration-300 hover:scale-105">Features</Link>
                        <Link to="/about" className="text-purple-700 font-semibold">About US</Link>
                        <Link to="/services" className="hover:text-purple-700 transition-all duration-300 hover:scale-105">Our Services</Link>
                        <Link to="/contact" className="hover:text-purple-700 transition-all duration-300 hover:scale-105">Contact</Link>
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

            {/* Hero Section */}
            <section className="relative py-20 md:py-28 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 relative z-10">
                    <div className={`text-center ${isVisible ? 'animate-fade-up' : 'opacity-0'}`}>
                        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold mb-6 leading-tight">
                            About IELTS Coach
                        </h1>
                        <p className="text-xl md:text-2xl text-purple-100 max-w-3xl mx-auto leading-relaxed">
                            Empowering students worldwide to achieve their IELTS goals through innovative AI-powered learning
                        </p>
                    </div>
                </div>
            </section>

            {/* Mission & Vision */}
            <section ref={sectionRef} className="py-16 md:py-20">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10">
                    <div className="grid md:grid-cols-2 gap-8 mb-16">
                        <div className={`bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 ${isVisible ? 'animate-slide-in-left' : 'opacity-0'}`}>
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6">
                                <Target className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-extrabold text-purple-700 mb-4">Our Mission</h2>
                            <p className="text-slate-700 leading-relaxed text-lg">
                                IELTS Coach is dedicated to helping students achieve their IELTS goals through comprehensive 
                                preparation, personalized practice, and expert guidance. We believe that with the right 
                                tools and support, every student can succeed in their IELTS journey.
                            </p>
                        </div>

                        <div className={`bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 ${isVisible ? 'animate-slide-in-right' : 'opacity-0'}`}>
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                                <Users className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-extrabold text-purple-700 mb-4">Our Vision</h2>
                            <p className="text-slate-700 leading-relaxed text-lg">
                                To become the world's leading IELTS preparation platform, making high-quality test preparation 
                                accessible to students everywhere through cutting-edge technology and personalized learning experiences.
                            </p>
                        </div>
                    </div>

                    {/* Why Choose Us */}
                    <div className={`mb-16 ${isVisible ? 'animate-fade-up' : 'opacity-0'}`}>
                        <h2 className="text-4xl font-extrabold text-purple-700 text-center mb-12">Why Choose Us?</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { icon: Award, title: 'Expert-Designed Tests', desc: 'Practice tests created by IELTS experts' },
                                { icon: BookOpen, title: 'Personalized Plans', desc: 'AI-powered study plans tailored to you' },
                                { icon: TrendingUp, title: 'Progress Tracking', desc: 'Real-time analytics and insights' },
                                { icon: CheckCircle2, title: 'Comprehensive Feedback', desc: 'Detailed feedback on all modules' }
                            ].map((item, index) => (
                                <div 
                                    key={item.title}
                                    className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
                                    style={{ animationDelay: `${index * 0.1}s` }}
                                >
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center mb-4">
                                        <item.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-purple-700 mb-2">{item.title}</h3>
                                    <p className="text-slate-600">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* IELTS Test Overview */}
                    <div className={`mb-16 ${isVisible ? 'animate-fade-up' : 'opacity-0'}`}>
                        <h2 className="text-4xl font-extrabold text-purple-700 text-center mb-12">IELTS Test Overview</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { name: 'Listening', time: '30 min + 10 min transfer', questions: '40 questions', color: 'from-blue-500 to-blue-600' },
                                { name: 'Reading', time: '60 minutes', questions: '40 questions', color: 'from-green-500 to-green-600' },
                                { name: 'Writing', time: '60 minutes', questions: '2 tasks', color: 'from-yellow-500 to-yellow-600' },
                                { name: 'Speaking', time: '11-14 minutes', questions: '3 parts', color: 'from-purple-500 to-purple-600' }
                            ].map((module, index) => (
                                <div 
                                    key={module.name}
                                    className={`bg-gradient-to-br ${module.color} rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
                                    style={{ animationDelay: `${index * 0.1}s` }}
                                >
                                    <h3 className="text-2xl font-bold mb-3">{module.name}</h3>
                                    <p className="text-white/90 mb-2">{module.time}</p>
                                    <p className="text-white/80">{module.questions}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Scoring System */}
                    <div className={`bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-8 md:p-12 mb-16 ${isVisible ? 'animate-fade-up' : 'opacity-0'}`}>
                        <h2 className="text-4xl font-extrabold text-purple-700 text-center mb-8">Scoring System</h2>
                        <p className="text-slate-700 text-center mb-8 text-lg max-w-3xl mx-auto">
                            IELTS uses a 9-band scoring system. Each section (Listening, Reading, Writing, Speaking) 
                            is scored from 1 to 9, and your overall band score is the average of these four scores.
                        </p>
                        <div className="grid md:grid-cols-3 gap-6">
                            {[
                                { score: '9', label: 'Expert User', color: 'from-purple-600 to-indigo-600' },
                                { score: '7-8', label: 'Good User', color: 'from-blue-500 to-purple-500' },
                                { score: '5-6', label: 'Modest User', color: 'from-green-500 to-blue-500' }
                            ].map((band, index) => (
                                <div 
                                    key={band.score}
                                    className={`bg-gradient-to-br ${band.color} rounded-xl p-8 text-white text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
                                >
                                    <div className="text-5xl font-extrabold mb-2">{band.score}</div>
                                    <div className="text-lg font-semibold">{band.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className={`text-center bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-12 text-white ${isVisible ? 'animate-fade-up' : 'opacity-0'}`}>
                        <h2 className="text-4xl font-extrabold mb-4">Ready to Start Your Journey?</h2>
                        <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
                            Join thousands of successful students who have achieved their IELTS goals with our platform.
                        </p>
                        <Link
                            to={user ? '/dashboard' : '/register'}
                            className="inline-flex items-center gap-2 bg-white text-purple-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-purple-50 transition-all duration-300 hover:scale-105 shadow-lg"
                        >
                            Get Started Now
                            <ArrowRight className="w-5 h-5" />
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
