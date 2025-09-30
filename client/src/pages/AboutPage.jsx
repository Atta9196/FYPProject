import React from 'react';
import Navbar from '../components/Navbar';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">About IELTS Coach</h1>
                    
                    <div className="prose prose-lg max-w-none">
                        <div className="grid md:grid-cols-2 gap-8 mb-12">
                            <div>
                                <h2 className="text-2xl font-semibold text-blue-600 mb-4">Our Mission</h2>
                                <p className="text-gray-700 leading-relaxed">
                                    IELTS Coach is dedicated to helping students achieve their IELTS goals through comprehensive 
                                    preparation, personalized practice, and expert guidance. We believe that with the right 
                                    tools and support, every student can succeed in their IELTS journey.
                                </p>
                            </div>
                            <div>
                                <h2 className="text-2xl font-semibold text-blue-600 mb-4">Why Choose Us?</h2>
                                <ul className="text-gray-700 space-y-2">
                                    <li className="flex items-center">
                                        <span className="text-green-500 mr-2">✓</span>
                                        Expert-designed practice tests
                                    </li>
                                    <li className="flex items-center">
                                        <span className="text-green-500 mr-2">✓</span>
                                        Personalized study plans
                                    </li>
                                    <li className="flex items-center">
                                        <span className="text-green-500 mr-2">✓</span>
                                        Real-time progress tracking
                                    </li>
                                    <li className="flex items-center">
                                        <span className="text-green-500 mr-2">✓</span>
                                        Comprehensive feedback
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="mb-12">
                            <h2 className="text-2xl font-semibold text-blue-600 mb-6">IELTS Test Overview</h2>
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-blue-50 p-6 rounded-lg">
                                    <h3 className="font-semibold text-blue-800 mb-2">Listening</h3>
                                    <p className="text-sm text-gray-700">40 questions, 30 minutes + 10 minutes transfer time</p>
                                </div>
                                <div className="bg-green-50 p-6 rounded-lg">
                                    <h3 className="font-semibold text-green-800 mb-2">Reading</h3>
                                    <p className="text-sm text-gray-700">40 questions, 60 minutes</p>
                                </div>
                                <div className="bg-yellow-50 p-6 rounded-lg">
                                    <h3 className="font-semibold text-yellow-800 mb-2">Writing</h3>
                                    <p className="text-sm text-gray-700">2 tasks, 60 minutes</p>
                                </div>
                                <div className="bg-purple-50 p-6 rounded-lg">
                                    <h3 className="font-semibold text-purple-800 mb-2">Speaking</h3>
                                    <p className="text-sm text-gray-700">3 parts, 11-14 minutes</p>
                                </div>
                            </div>
                        </div>

                        <div className="mb-12">
                            <h2 className="text-2xl font-semibold text-blue-600 mb-6">Scoring System</h2>
                            <div className="bg-gray-50 p-6 rounded-lg">
                                <p className="text-gray-700 mb-4">
                                    IELTS uses a 9-band scoring system. Each section (Listening, Reading, Writing, Speaking) 
                                    is scored from 1 to 9, and your overall band score is the average of these four scores.
                                </p>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-blue-600">9</div>
                                        <div className="text-sm text-gray-600">Expert User</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-green-600">7-8</div>
                                        <div className="text-sm text-gray-600">Good User</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-yellow-600">5-6</div>
                                        <div className="text-sm text-gray-600">Modest User</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-center">
                            <h2 className="text-2xl font-semibold text-blue-600 mb-4">Ready to Start Your Journey?</h2>
                            <p className="text-gray-700 mb-6">
                                Join thousands of successful students who have achieved their IELTS goals with our platform.
                            </p>
                            <button
                                onClick={() => window.location.href = '/dashboard'}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                            >
                                Get Started Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
