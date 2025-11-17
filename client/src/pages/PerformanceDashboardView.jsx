import React, { useState, useEffect } from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import { useAuth } from "../contexts/AuthContext";
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    getBandProgress,
    getWeeklyTests,
    getModuleBreakdown,
    getPracticeHistory,
    getAllProgressData
} from "../services/progressService";

export function PerformanceDashboardView() {
    const { user } = useAuth();
    const [selectedTimeframe, setSelectedTimeframe] = useState('3months');
    const [performanceData, setPerformanceData] = useState({
        bandProgress: [
            { month: 'Jan', overall: 5.5, speaking: 5.0, reading: 6.0, writing: 5.5, listening: 6.0 },
            { month: 'Feb', overall: 6.0, speaking: 5.5, reading: 6.5, writing: 6.0, listening: 6.5 },
            { month: 'Mar', overall: 6.5, speaking: 6.0, reading: 7.0, writing: 6.5, listening: 7.0 },
            { month: 'Apr', overall: 7.0, speaking: 6.5, reading: 7.5, writing: 7.0, listening: 7.5 },
            { month: 'May', overall: 7.5, speaking: 7.0, reading: 7.5, writing: 7.0, listening: 8.0 },
            { month: 'Jun', overall: 7.5, speaking: 7.0, reading: 7.5, writing: 7.0, listening: 8.0 }
        ],
        weeklyTests: [
            { week: 'Week 1', tests: 3 },
            { week: 'Week 2', tests: 5 },
            { week: 'Week 3', tests: 4 },
            { week: 'Week 4', tests: 6 },
            { week: 'Week 5', tests: 7 },
            { week: 'Week 6', tests: 5 }
        ],
        moduleBreakdown: {
            speaking: { averageBand: 7.0, attempts: 15, improvement: '+0.5', weakAreas: ['Pronunciation', 'Fluency'] },
            listening: { averageAccuracy: 85, attempts: 12, improvement: '+5%', weakAreas: ['Map completion', 'Multiple choice'] },
            reading: { speed: 180, accuracy: 78, attempts: 10, improvement: '+10 wpm', weakAreas: ['True/False/Not Given', 'Matching headings'] },
            writing: { task1: 6.5, task2: 7.0, attempts: 8, improvement: '+0.5', weakAreas: ['Task 1 structure', 'Task 2 arguments'] }
        },
        practiceHistory: [
            { date: '2024-06-15', type: 'Speaking Practice', band: 7.0, duration: '15 min', feedback: 'Good fluency, work on pronunciation' },
            { date: '2024-06-14', type: 'Reading Test', band: 7.5, duration: '60 min', feedback: 'Excellent comprehension, improve speed' },
            { date: '2024-06-13', type: 'Writing Task 1', band: 7.0, duration: '20 min', feedback: 'Clear structure, add more detail' },
            { date: '2024-06-12', type: 'Listening Test', band: 8.0, duration: '40 min', feedback: 'Perfect score! Great focus' },
            { date: '2024-06-11', type: 'Speaking Part 2', band: 6.5, duration: '12 min', feedback: 'Good ideas, develop more detail' },
            { date: '2024-06-10', type: 'Full Test Simulation', band: 7.5, duration: '170 min', feedback: 'Strong overall performance' }
        ],
        aiInsights: {
            strengths: [
                'Excellent listening comprehension skills',
                'Strong vocabulary range in writing',
                'Good coherence in speaking responses',
                'Consistent practice habits'
            ],
            improvements: [
                'Focus on pronunciation clarity in speaking',
                'Increase reading speed while maintaining accuracy',
                'Develop more complex sentence structures in writing',
                'Practice map completion tasks in listening'
            ],
            recommendations: [
                'Practice speaking Part 2 monologues daily',
                'Read academic articles for 30 minutes daily',
                'Complete one writing task per day',
                'Focus on listening map completion exercises'
            ]
        },
        goals: {
            monthlyGoal: 60,
            achieved: 0,
            testDate: '2024-12-15',
            daysRemaining: 172
        }
    });

    // Load performance data
    const loadPerformanceData = () => {
        try {
            const userId = user?.email || user?.id || null;
            const bandProgress = getBandProgress(selectedTimeframe, userId);
            const weeklyTests = getWeeklyTests(userId);
            const moduleBreakdown = getModuleBreakdown(userId);
            const practiceHistory = getPracticeHistory(20, userId);

            // Calculate monthly goal progress
            const allProgress = getAllProgressData(userId);
            const totalTests = allProgress.reading.length + allProgress.writing.length + allProgress.listening.length;
            const monthlyGoal = 60;
            const achieved = totalTests;

            // Calculate days remaining (assuming test date is 6 months from now if not set)
            const testDate = new Date();
            testDate.setMonth(testDate.getMonth() + 6);
            const daysRemaining = Math.ceil((testDate - new Date()) / (1000 * 60 * 60 * 24));

            setPerformanceData({
                bandProgress: bandProgress.length > 0 ? bandProgress : [
                    { month: 'Jan', overall: 0, speaking: 0, reading: 0, writing: 0, listening: 0 }
                ],
                weeklyTests,
                moduleBreakdown,
                practiceHistory,
                aiInsights: {
                    strengths: generateInsights(moduleBreakdown, 'strengths'),
                    improvements: generateInsights(moduleBreakdown, 'improvements'),
                    recommendations: generateInsights(moduleBreakdown, 'recommendations')
                },
                goals: {
                    monthlyGoal,
                    achieved,
                    testDate: testDate.toISOString().split('T')[0],
                    daysRemaining: Math.max(0, daysRemaining)
                }
            });
        } catch (error) {
            console.error("Error loading performance data:", error);
        }
    };

    // Generate AI insights based on module breakdown
    const generateInsights = (breakdown, type) => {
        const insights = {
            strengths: [],
            improvements: [],
            recommendations: []
        };

        // Analyze each module
        Object.entries(breakdown).forEach(([module, data]) => {
            if (data.attempts === 0) return;

            const avgBand = data.averageBand || (data.averageAccuracy / 10) || 0;
            
            if (type === 'strengths') {
                if (avgBand >= 7.0) {
                    insights.strengths.push(`Strong performance in ${module} (Band ${avgBand.toFixed(1)})`);
                }
                if (data.attempts >= 10) {
                    insights.strengths.push(`Consistent practice in ${module} (${data.attempts} attempts)`);
                }
            } else if (type === 'improvements') {
                if (avgBand < 7.0 && avgBand > 0) {
                    insights.improvements.push(`Focus on improving ${module} skills (Current: Band ${avgBand.toFixed(1)})`);
                }
                if (data.weakAreas && data.weakAreas.length > 0) {
                    insights.improvements.push(`Work on ${data.weakAreas[0]} in ${module}`);
                }
            } else if (type === 'recommendations') {
                if (avgBand < 7.0 && avgBand > 0) {
                    insights.recommendations.push(`Practice ${module} more frequently to improve`);
                }
                if (data.attempts < 5) {
                    insights.recommendations.push(`Complete more ${module} practice tests`);
                }
            }
        });

        // Default insights if no data
        if (insights[type].length === 0) {
            if (type === 'strengths') {
                insights.strengths.push('Keep practicing to build your strengths');
            } else if (type === 'improvements') {
                insights.improvements.push('Start practicing to identify areas for improvement');
            } else {
                insights.recommendations.push('Complete practice tests to get personalized recommendations');
            }
        }

        return insights[type].slice(0, 4); // Limit to 4 items
    };

    // Load data on mount and when timeframe changes
    useEffect(() => {
        loadPerformanceData();

        // Set up real-time updates
        const interval = setInterval(() => {
            loadPerformanceData();
        }, 5000);

        // Listen for progress updates
        const handleProgressUpdate = () => {
            loadPerformanceData();
        };
        window.addEventListener('progressUpdated', handleProgressUpdate);

        return () => {
            clearInterval(interval);
            window.removeEventListener('progressUpdated', handleProgressUpdate);
        };
    }, [selectedTimeframe]);

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

    const getBandColor = (band) => {
        if (band >= 8.0) return '#10B981';
        if (band >= 7.0) return '#3B82F6';
        if (band >= 6.0) return '#F59E0B';
        return '#EF4444';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    };

    return (
        <AppLayout>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
                <div className="space-y-8 p-4 md:p-6 lg:p-8">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 rounded-2xl p-8 text-white shadow-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-extrabold mb-3">
                                    Performance Analytics 📊
                                </h1>
                                    <p className="text-xl text-blue-100">Detailed insights into your IELTS progress</p>
                            </div>
                            <div className="hidden md:block">
                                <div className="text-right">
                                    <p className="text-blue-200 text-sm">Days to Test</p>
                                    <p className="text-3xl font-bold">{performanceData.goals.daysRemaining}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeframe Selector */}
                    <div className="flex justify-center">
                        <div className="bg-white rounded-xl p-2 shadow-lg border border-slate-200">
                            <div className="flex space-x-2">
                                {['1month', '3months', '6months', '1year'].map((timeframe) => (
                                    <button
                                        key={timeframe}
                                        onClick={() => setSelectedTimeframe(timeframe)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                            selectedTimeframe === timeframe
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        {timeframe === '1month' ? '1 Month' :
                                         timeframe === '3months' ? '3 Months' :
                                         timeframe === '6months' ? '6 Months' : '1 Year'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Overall Progress Graphs */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Panel title="Band Score Growth" className="bg-white/90 backdrop-blur rounded-2xl shadow-lg">
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={performanceData.bandProgress}>
                                        <defs>
                                            <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                        <XAxis dataKey="month" stroke="#64748B" />
                                        <YAxis domain={[4, 9]} stroke="#64748B" />
                                        <Tooltip 
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                            }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="overall" 
                                            stroke="#3B82F6" 
                                            fillOpacity={1} 
                                            fill="url(#colorOverall)"
                                            strokeWidth={3}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Panel>

                        <Panel title="Tests Completed Weekly" className="bg-white/90 backdrop-blur rounded-2xl shadow-lg">
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={performanceData.weeklyTests}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                        <XAxis dataKey="week" stroke="#64748B" />
                                        <YAxis stroke="#64748B" />
                                        <Tooltip 
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                            }}
                                        />
                                        <Bar dataKey="tests" fill="#10B981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Panel>
                    </div>

                    {/* Module Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Panel title="Module Performance" className="bg-white/90 backdrop-blur rounded-2xl shadow-lg">
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={[
                                        { subject: 'Speaking', A: performanceData.moduleBreakdown.speaking.averageBand, fullMark: 9 },
                                        { subject: 'Reading', A: performanceData.moduleBreakdown.reading.averageBand || (performanceData.moduleBreakdown.reading.accuracy / 10), fullMark: 9 },
                                        { subject: 'Writing', A: (performanceData.moduleBreakdown.writing.task1 + performanceData.moduleBreakdown.writing.task2) / 2, fullMark: 9 },
                                        { subject: 'Listening', A: performanceData.moduleBreakdown.listening.averageBand || (performanceData.moduleBreakdown.listening.averageAccuracy / 10), fullMark: 9 }
                                    ]}>
                                        <PolarGrid stroke="#E2E8F0" />
                                        <PolarAngleAxis dataKey="subject" stroke="#64748B" />
                                        <PolarRadiusAxis domain={[0, 9]} stroke="#64748B" />
                                        <Radar 
                                            name="Performance" 
                                            dataKey="A" 
                                            stroke="#3B82F6" 
                                            fill="#3B82F6" 
                                            fillOpacity={0.3}
                                            strokeWidth={2}
                                        />
                                        <Tooltip 
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                            }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </Panel>

                        <Panel title="Module Statistics" className="bg-white/90 backdrop-blur rounded-2xl shadow-lg">
                            <div className="space-y-6">
                                {Object.entries(performanceData.moduleBreakdown).map(([module, data]) => (
                                    <div key={module} className="p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-lg font-semibold text-slate-800 capitalize">{module}</h4>
                                            <span className="text-2xl">
                                                {module === 'speaking' ? '🎙️' : 
                                                 module === 'reading' ? '📖' : 
                                                 module === 'writing' ? '✍️' : '👂'}
                                            </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div>
                                                <p className="text-sm text-slate-600">Average Band</p>
                                                <p className="text-xl font-bold" style={{ color: getBandColor(data.averageBand || data.averageAccuracy / 10) }}>
                                                    {module === 'listening' ? `${data.averageAccuracy}%` :
                                                     module === 'reading' ? `${data.accuracy}%` :
                                                     module === 'writing' ? `${((data.task1 + data.task2) / 2).toFixed(1)}` :
                                                     data.averageBand}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-600">Attempts</p>
                                                <p className="text-xl font-bold text-slate-800">{data.attempts}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="mb-3">
                                            <p className="text-sm text-slate-600">Improvement</p>
                                            <p className="text-sm font-semibold text-green-600">{data.improvement}</p>
                                        </div>
                                        
                                        <div>
                                            <p className="text-sm text-slate-600 mb-2">Focus Areas</p>
                                            <div className="flex flex-wrap gap-1">
                                                {data.weakAreas.map((area, index) => (
                                                    <span key={index} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                                                        {area}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Panel>
                    </div>

                    {/* Practice History Table */}
                    <Panel title="Practice History" className="bg-white/90 backdrop-blur rounded-2xl shadow-lg">
                        <div className="overflow-x-auto">
                            {performanceData.practiceHistory.length > 0 ? (
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
                                            <th className="text-left py-3 px-4 font-semibold text-slate-700">Test Type</th>
                                            <th className="text-left py-3 px-4 font-semibold text-slate-700">Band Score</th>
                                            <th className="text-left py-3 px-4 font-semibold text-slate-700">Duration</th>
                                            <th className="text-left py-3 px-4 font-semibold text-slate-700">Feedback</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {performanceData.practiceHistory.map((practice, index) => (
                                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-4 text-sm text-slate-600">{formatDate(practice.date)}</td>
                                            <td className="py-3 px-4 text-sm font-medium text-slate-800">{practice.type}</td>
                                            <td className="py-3 px-4">
                                                <span 
                                                    className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                                                    style={{ backgroundColor: getBandColor(practice.band) }}
                                                >
                                                    {practice.band}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-slate-600">{practice.duration}</td>
                                            <td className="py-3 px-4 text-sm text-slate-600 max-w-xs truncate">{practice.feedback}</td>
                                        </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-12 text-slate-500">
                                    <p className="text-sm">No practice history yet</p>
                                    <p className="text-xs mt-2">Complete practice tests to see your history here</p>
                                </div>
                            )}
                        </div>
                    </Panel>

                    {/* AI Insights and Goal Tracking */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Panel title="AI Insights" className="bg-white/90 backdrop-blur rounded-2xl shadow-lg">
                            <div className="space-y-6">
                                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                                    <h4 className="text-lg font-semibold text-green-800 mb-3">💪 Your Strengths</h4>
                                    <ul className="space-y-2">
                                        {performanceData.aiInsights.strengths.map((strength, index) => (
                                            <li key={index} className="flex items-start gap-2 text-sm text-green-700">
                                                <span className="text-green-500 mt-1">✓</span>
                                                <span>{strength}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border border-orange-200">
                                    <h4 className="text-lg font-semibold text-orange-800 mb-3">🎯 Areas to Improve</h4>
                                    <ul className="space-y-2">
                                        {performanceData.aiInsights.improvements.map((improvement, index) => (
                                            <li key={index} className="flex items-start gap-2 text-sm text-orange-700">
                                                <span className="text-orange-500 mt-1">⚡</span>
                                                <span>{improvement}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                    <h4 className="text-lg font-semibold text-blue-800 mb-3">📚 Recommendations</h4>
                                    <ul className="space-y-2">
                                        {performanceData.aiInsights.recommendations.map((recommendation, index) => (
                                            <li key={index} className="flex items-start gap-2 text-sm text-blue-700">
                                                <span className="text-blue-500 mt-1">📖</span>
                                                <span>{recommendation}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </Panel>

                        <Panel title="Goal Tracking" className="bg-white/90 backdrop-blur rounded-2xl shadow-lg">
                            <div className="space-y-6">
                                <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-lg font-semibold text-purple-800">Monthly Goal Progress</h4>
                                        <span className="text-2xl">🎯</span>
                                    </div>
                                    <div className="mb-3">
                                        <div className="flex justify-between text-sm text-purple-700 mb-1">
                                            <span>{performanceData.goals.achieved} tests completed</span>
                                            <span>{performanceData.goals.monthlyGoal} target</span>
                                        </div>
                                        <div className="w-full bg-purple-200 rounded-full h-3">
                                            <div 
                                                className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min((performanceData.goals.achieved / performanceData.goals.monthlyGoal) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-sm text-purple-600 mt-2">
                                            {Math.round((performanceData.goals.achieved / performanceData.goals.monthlyGoal) * 100)}% complete
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-lg font-semibold text-red-800">Test Countdown</h4>
                                        <span className="text-2xl">⏰</span>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-red-700 mb-2">{performanceData.goals.daysRemaining}</p>
                                        <p className="text-sm text-red-600">days until your IELTS test</p>
                                        <p className="text-xs text-red-500 mt-1">Test Date: {formatDate(performanceData.goals.testDate)}</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200">
                                    <h4 className="text-lg font-semibold text-indigo-800 mb-3">📈 Study Momentum</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-indigo-700">7</p>
                                            <p className="text-xs text-indigo-600">Day Streak</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-indigo-700">45h</p>
                                            <p className="text-xs text-indigo-600">Total Study Time</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Panel>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}