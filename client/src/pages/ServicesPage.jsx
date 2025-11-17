import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mic, Headphones, BookOpen, PenTool, ListChecks, BarChart3, Clock, Users, Award, Zap } from 'lucide-react';

export default function ServicesPage() {
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

    const services = [
        {
            icon: Mic,
            title: 'AI Speaking Assistant',
            description: 'Practice speaking with our AI-powered examiner. Get real-time feedback on fluency, pronunciation, and coherence.',
            features: ['Real-time conversation', 'Instant feedback', 'Pronunciation analysis', 'Band score prediction'],
            color: 'from-blue-500 to-blue-600',
            href: '/speaking'
        },
        {
            icon: Headphones,
            title: 'Listening Practice',
            description: 'Comprehensive listening tests with audio playback, transcripts, and detailed explanations.',
            features: ['Multiple test formats', 'Audio transcripts', 'Detailed explanations', 'Progress tracking'],
            color: 'from-green-500 to-green-600',
            href: '/listening'
        },
        {
            icon: BookOpen,
            title: 'Reading Practice',
            description: 'Practice reading comprehension with authentic IELTS-style passages and questions.',
            features: ['Authentic passages', 'Multiple question types', 'Time management', 'Answer explanations'],
            color: 'from-yellow-500 to-yellow-600',
            href: '/reading'
        },
        {
            icon: PenTool,
            title: 'Writing Practice',
            description: 'Improve your writing skills with AI-powered evaluation and personalized feedback.',
            features: ['Task 1 & Task 2', 'AI evaluation', 'Band score feedback', 'Improvement suggestions'],
            color: 'from-purple-500 to-purple-600',
            href: '/writing'
        },
        {
            icon: ListChecks,
            title: 'MCQ Practice Bank',
            description: 'Access hundreds of multiple-choice questions with instant feedback and explanations.',
            features: ['Hundreds of questions', 'Instant feedback', 'Topic-wise practice', 'Performance analytics'],
            color: 'from-indigo-500 to-indigo-600',
            href: '/mcq'
        },
        {
            icon: BarChart3,
            title: 'Full Test Simulator',
            description: 'Complete IELTS test simulations across all four modules with realistic timing and conditions.',
            features: ['Full test experience', 'Realistic timing', 'All modules included', 'Comprehensive results'],
            color: 'from-pink-500 to-pink-600',
            href: '/tests'
        }
    ];

    const features = [
        { icon: Clock, title: '24/7 Access', desc: 'Practice anytime, anywhere' },
        { icon: Users, title: 'Expert Support', desc: 'Guidance from IELTS professionals' },
        { icon: Award, title: 'Proven Results', desc: 'Thousands of successful students' },
        { icon: Zap, title: 'AI-Powered', desc: 'Cutting-edge technology' }
    ];

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
                        <Link to="/about" className="hover:text-purple-700 transition-all duration-300 hover:scale-105">About US</Link>
                        <Link to="/services" className="text-purple-700 font-semibold">Our Services</Link>
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
            <section className="relative py-20 md:py-28 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 relative z-10">
                    <div className={`text-center ${isVisible ? 'animate-fade-up' : 'opacity-0'}`}>
                        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold mb-6 leading-tight">
                            Our Services
                        </h1>
                        <p className="text-xl md:text-2xl text-purple-100 max-w-3xl mx-auto leading-relaxed">
                            Comprehensive IELTS preparation tools designed to help you achieve your target band score
                        </p>
                    </div>
                </div>
            </section>

            {/* Services Grid */}
            <section ref={sectionRef} className="py-16 md:py-20">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                        {services.map((service, index) => (
                            <div
                                key={service.title}
                                className={`bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ${isVisible ? 'animate-scale-in' : 'opacity-0'}`}
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className={`w-16 h-16 bg-gradient-to-br ${service.color} rounded-xl flex items-center justify-center mb-6`}>
                                    <service.icon className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-2xl font-extrabold text-purple-700 mb-3">{service.title}</h3>
                                <p className="text-slate-600 mb-6 leading-relaxed">{service.description}</p>
                                <ul className="space-y-2 mb-6">
                                    {service.features.map((feature) => (
                                        <li key={feature} className="flex items-center text-slate-700">
                                            <span className="text-purple-600 mr-2">✓</span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    to={service.href}
                                    className={`inline-flex items-center justify-center w-full bg-gradient-to-r ${service.color} text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105`}
                                >
                                    Try Now
                                </Link>
                            </div>
                        ))}
                    </div>

                    {/* Key Features */}
                    <div className={`mb-16 ${isVisible ? 'animate-fade-up' : 'opacity-0'}`}>
                        <h2 className="text-4xl font-extrabold text-purple-700 text-center mb-12">Why Choose Our Services?</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {features.map((feature, index) => (
                                <div
                                    key={feature.title}
                                    className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 text-center"
                                >
                                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                                        <feature.icon className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-purple-700 mb-2">{feature.title}</h3>
                                    <p className="text-slate-600">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className={`text-center bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-12 text-white ${isVisible ? 'animate-fade-up' : 'opacity-0'}`}>
                        <h2 className="text-4xl font-extrabold mb-4">Ready to Get Started?</h2>
                        <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
                            Join thousands of students who are already improving their IELTS scores with our platform.
                        </p>
                        <Link
                            to={user ? '/dashboard' : '/register'}
                            className="inline-flex items-center gap-2 bg-white text-purple-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-purple-50 transition-all duration-300 hover:scale-105 shadow-lg"
                        >
                            Start Your Journey
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

