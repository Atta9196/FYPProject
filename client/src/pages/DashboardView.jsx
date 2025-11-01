import React, { useState, useEffect } from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import SectionCard from "../components/SectionCard";
import ProgressRing from "../components/ui/ProgressRing";
import AchievementBadge from "../components/ui/AchievementBadge";
import WeeklyStudyGraph from "../components/ui/WeeklyStudyGraph";
import { Link } from "react-router-dom";

export function DashboardView() {
    const [userName] = useState("Atta"); // This would come from auth context
    const [currentTime] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    
    // Mock data - in real app, this would come from API
    const mockData = {
        user: {
            name: userName,
            targetBand: 8.0,
            testDate: "2024-12-15"
        },
        bands: {
            overall: 7.5,
            speaking: 7.0,
            reading: 7.5,
            writing: 7.0,
            listening: 8.0
        },
        stats: {
            testsCompleted: 12,
            weeklyChange: 3,
            studyHours: 45,
            weeklyHours: 8,
            streakDays: 7,
            streakChange: 1
        },
        recentActivity: [
            { type: "Speaking Practice", score: 7.0, time: "2 hours ago", icon: "🎙️", color: "green" },
            { type: "Reading Test", score: 7.5, time: "1 day ago", icon: "📖", color: "blue" },
            { type: "Writing Task 1", score: 7.0, time: "2 days ago", icon: "✍️", color: "purple" },
            { type: "Listening Test", score: 8.0, time: "3 days ago", icon: "👂", color: "orange" }
        ],
        achievements: [
            { name: "Consistent Learner", description: "7 day streak", icon: "🔥", earned: true },
            { name: "Fluency Booster", description: "Speaking improvement", icon: "💬", earned: true },
            { name: "Reading Master", description: "Perfect reading score", icon: "📚", earned: false }
        ],
        goals: {
            targetBand: 8.0,
            progress: 75,
            nextPractice: "Speaking Part 2",
            studyPlanProgress: 60
        }
    };

    const motivationalQuotes = [
        "Keep practicing — consistency builds fluency!",
        "Every expert was once a beginner. Keep going!",
        "Progress, not perfection. You're doing great!",
        "The only way to improve is to keep practicing!",
        "Your dedication will pay off. Stay focused!"
    ];

    const [currentQuote] = useState(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);

    const getBandColor = (band) => {
        if (band >= 8.0) return "from-emerald-500 to-green-600";
        if (band >= 7.0) return "from-blue-500 to-blue-600";
        if (band >= 6.0) return "from-yellow-500 to-orange-500";
        return "from-red-500 to-red-600";
    };

    const getBandTextColor = (band) => {
        if (band >= 8.0) return "text-emerald-700";
        if (band >= 7.0) return "text-blue-700";
        if (band >= 6.0) return "text-orange-700";
        return "text-red-700";
    };

    return (
        <AppLayout>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
                <div className="space-y-8 p-4 md:p-6 lg:p-8">
                    {/* Welcome Header */}
                    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-extrabold mb-3">
                                    Welcome back, {mockData.user.name}! 👋
                                </h1>
                                <p className="text-xl text-blue-100 mb-2">{currentQuote}</p>
                                <p className="text-blue-200">Ready to continue your IELTS journey?</p>
                            </div>
                            <div className="hidden md:block">
                                <div className="text-right">
                                    <p className="text-blue-200 text-sm">Current Time</p>
                                    <p className="text-2xl font-bold">{currentTime}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Band Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        <div className={`bg-gradient-to-br ${getBandColor(mockData.bands.overall)} rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-all duration-300`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold opacity-90">Overall Band</h3>
                                <span className="text-2xl">📊</span>
                            </div>
                            <div className="text-3xl font-extrabold mb-2">{mockData.bands.overall}</div>
                            <div className="flex items-center text-sm opacity-90">
                                <span className="mr-1">↗</span>
                                <span>+0.5 from last week</span>
                            </div>
                        </div>

                        {Object.entries(mockData.bands).filter(([key]) => key !== 'overall').map(([module, score]) => (
                            <div key={module} className={`bg-gradient-to-br ${getBandColor(score)} rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-all duration-300`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold opacity-90 capitalize">{module}</h3>
                                    <span className="text-2xl">
                                        {module === 'speaking' ? '🎙️' : 
                                         module === 'reading' ? '📖' : 
                                         module === 'writing' ? '✍️' : '👂'}
                                    </span>
                                </div>
                                <div className="text-3xl font-extrabold mb-2">{score}</div>
                                <div className="flex items-center text-sm opacity-90">
                                    <span className="mr-1">↗</span>
                                    <span>+0.5</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Study Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard 
                            title="Tests Completed" 
                            value={mockData.stats.testsCompleted} 
                            change={`+${mockData.stats.weeklyChange} this week`} 
                            icon="✅"
                            color="green"
                            progress={75}
                            showProgress={true}
                        />
                        <StatCard 
                            title="Study Hours" 
                            value={`${mockData.stats.studyHours}h`} 
                            change={`+${mockData.stats.weeklyHours}h this week`} 
                            icon="⏰"
                            color="purple"
                            progress={60}
                            showProgress={true}
                        />
                        <StatCard 
                            title="Streak Days" 
                            value={mockData.stats.streakDays} 
                            change={`+${mockData.stats.streakChange} day`} 
                            icon="🔥"
                            color="orange"
                            progress={100}
                            showProgress={true}
                        />
                    </div>

                    {/* Weekly Study Graph */}
                    <WeeklyStudyGraph />

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Quick Actions */}
                        <div className="lg:col-span-2 space-y-6">
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Quick Actions</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Link to="/speaking" className="group">
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                                        <div className="text-center">
                                            <div className="text-4xl mb-4">🎙️</div>
                                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Speaking Practice</h3>
                                            <p className="text-sm text-slate-600 mb-4">Practice with AI examiner</p>
                                            <div className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium group-hover:bg-green-700 transition-colors">
                                                Start Practice
                                            </div>
                                        </div>
                                    </div>
                                </Link>

                                <Link to="/tests" className="group">
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                                        <div className="text-center">
                                            <div className="text-4xl mb-4">📝</div>
                                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Full Test Simulation</h3>
                                            <p className="text-sm text-slate-600 mb-4">Complete IELTS test</p>
                                            <div className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium group-hover:bg-blue-700 transition-colors">
                                                Start Test
                                            </div>
                                        </div>
                                    </div>
                                </Link>

                                <Link to="/mcq" className="group">
                                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-200 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                                        <div className="text-center">
                                            <div className="text-4xl mb-4">❓</div>
                                            <h3 className="text-lg font-semibold text-slate-800 mb-2">MCQ Practice</h3>
                                            <p className="text-sm text-slate-600 mb-4">Multiple choice questions</p>
                                            <div className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium group-hover:bg-purple-700 transition-colors">
                                                Practice MCQs
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        </div>

                        {/* Side Panel */}
                        <div className="space-y-6">
                            {/* Recent Activity */}
                            <Panel title="Recent Activity" className="bg-white/80 backdrop-blur rounded-2xl shadow-lg">
                                <div className="space-y-4">
                                    {mockData.recentActivity.map((activity, index) => (
                                        <div key={index} className="flex items-center gap-4 p-3 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-100 hover:shadow-md transition-all duration-200">
                                            <div className={`w-3 h-3 rounded-full bg-${activity.color}-500`}></div>
                                            <div className="text-2xl">{activity.icon}</div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-slate-800">{activity.type}</p>
                                                <p className="text-xs text-slate-500">{activity.time}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-slate-700">{activity.score}</p>
                                                <p className="text-xs text-slate-500">Band</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Panel>

                            {/* Upcoming Goals */}
                            <Panel title="Upcoming Goals" className="bg-white/80 backdrop-blur rounded-2xl shadow-lg">
                                <div className="space-y-4">
                                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-semibold text-blue-800">Target Band Score</p>
                                            <span className="text-lg font-bold text-blue-700">{mockData.goals.targetBand}</span>
                                        </div>
                                        <div className="w-full bg-blue-200 rounded-full h-3">
                                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500" style={{width: `${mockData.goals.progress}%`}}></div>
                                        </div>
                                        <p className="text-xs text-blue-600 mt-2">{mockData.goals.progress}% complete</p>
                                    </div>

                                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                                        <p className="text-sm font-semibold text-green-800 mb-2">Next Practice</p>
                                        <p className="text-sm text-green-700">{mockData.goals.nextPractice}</p>
                                        <p className="text-xs text-green-600 mt-1">Scheduled for today</p>
                                    </div>

                                    <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-semibold text-purple-800">Study Plan</p>
                                            <span className="text-sm font-bold text-purple-700">{mockData.goals.studyPlanProgress}%</span>
                                        </div>
                                        <div className="w-full bg-purple-200 rounded-full h-2">
                                            <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500" style={{width: `${mockData.goals.studyPlanProgress}%`}}></div>
                                        </div>
                                    </div>
                                </div>
                            </Panel>

                            {/* Achievement Badges */}
                            <Panel title="Achievements" className="bg-white/80 backdrop-blur rounded-2xl shadow-lg">
                                <div className="space-y-3">
                                    {mockData.achievements.map((achievement, index) => (
                                        <AchievementBadge
                                            key={index}
                                            name={achievement.name}
                                            description={achievement.description}
                                            icon={achievement.icon}
                                            earned={achievement.earned}
                                            progress={achievement.earned ? 100 : Math.random() * 80}
                                        />
                                    ))}
                                </div>
                            </Panel>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}