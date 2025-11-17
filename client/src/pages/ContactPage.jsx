import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock } from 'lucide-react';

export default function ContactPage() {
    const { user } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
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

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        // Simulate form submission
        setTimeout(() => {
            setSubmitting(false);
            setSubmitted(true);
            setFormData({ name: '', email: '', subject: '', message: '' });
            setTimeout(() => setSubmitted(false), 5000);
        }, 1500);
    };

    const contactInfo = [
        {
            icon: Mail,
            title: 'Email Us',
            detail: 'support@ieltscoach.com',
            color: 'from-blue-500 to-blue-600'
        },
        {
            icon: Phone,
            title: 'Call Us',
            detail: '+1 (555) 123-4567',
            color: 'from-green-500 to-green-600'
        },
        {
            icon: MapPin,
            title: 'Visit Us',
            detail: '123 Education Street, Learning City',
            color: 'from-purple-500 to-purple-600'
        },
        {
            icon: Clock,
            title: 'Office Hours',
            detail: 'Mon - Fri: 9:00 AM - 6:00 PM',
            color: 'from-indigo-500 to-indigo-600'
        }
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
                        <Link to="/services" className="hover:text-purple-700 transition-all duration-300 hover:scale-105">Our Services</Link>
                        <Link to="/contact" className="text-purple-700 font-semibold">Contact</Link>
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
            <section className="relative py-20 md:py-28 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 relative z-10">
                    <div className={`text-center ${isVisible ? 'animate-fade-up' : 'opacity-0'}`}>
                        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold mb-6 leading-tight">
                            Get In Touch
                        </h1>
                        <p className="text-xl md:text-2xl text-purple-100 max-w-3xl mx-auto leading-relaxed">
                            We're here to help! Reach out to us with any questions or feedback
                        </p>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section ref={sectionRef} className="py-16 md:py-20">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10">
                    {/* Contact Info Cards */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                        {contactInfo.map((info, index) => (
                            <div
                                key={info.title}
                                className={`bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 text-center ${isVisible ? 'animate-scale-in' : 'opacity-0'}`}
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className={`w-14 h-14 bg-gradient-to-br ${info.color} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                                    <info.icon className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-purple-700 mb-2">{info.title}</h3>
                                <p className="text-slate-600">{info.detail}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12">
                        {/* Contact Form */}
                        <div className={`bg-white rounded-2xl p-8 shadow-xl ${isVisible ? 'animate-slide-in-left' : 'opacity-0'}`}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                    <MessageSquare className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-3xl font-extrabold text-purple-700">Send us a Message</h2>
                            </div>

                            {submitted && (
                                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-green-700 font-semibold">Thank you! Your message has been sent successfully.</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Your Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        className="w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 hover:border-purple-400"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Your Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 hover:border-purple-400"
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
                                    <input
                                        type="text"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        required
                                        className="w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 hover:border-purple-400"
                                        placeholder="How can we help?"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                        rows="6"
                                        className="w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 hover:border-purple-400 resize-none"
                                        placeholder="Your message here..."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:scale-[1.02] transform disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>Sending...</>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Send Message
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Additional Info */}
                        <div className={`space-y-6 ${isVisible ? 'animate-slide-in-right' : 'opacity-0'}`}>
                            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-8">
                                <h3 className="text-2xl font-extrabold text-purple-700 mb-4">We'd Love to Hear From You</h3>
                                <p className="text-slate-700 leading-relaxed mb-6">
                                    Whether you have a question about our services, need technical support, or want to provide feedback, 
                                    we're here to help. Our team typically responds within 24 hours.
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                                            <span className="text-white font-bold">1</span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-purple-700 mb-1">Quick Response</h4>
                                            <p className="text-slate-600 text-sm">We aim to respond to all inquiries within 24 hours.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                                            <span className="text-white font-bold">2</span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-purple-700 mb-1">Expert Support</h4>
                                            <p className="text-slate-600 text-sm">Get help from our team of IELTS experts.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                                            <span className="text-white font-bold">3</span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-purple-700 mb-1">24/7 Platform</h4>
                                            <p className="text-slate-600 text-sm">Access our platform anytime, anywhere.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-8 shadow-xl">
                                <h3 className="text-2xl font-extrabold text-purple-700 mb-4">Frequently Asked Questions</h3>
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-slate-800 mb-1">How do I get started?</h4>
                                        <p className="text-slate-600 text-sm">Simply create an account and start practicing with our free resources.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800 mb-1">Is there a free trial?</h4>
                                        <p className="text-slate-600 text-sm">Yes! You can access many features with our free account.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800 mb-1">Can I cancel anytime?</h4>
                                        <p className="text-slate-600 text-sm">Absolutely. No long-term commitments required.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
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

