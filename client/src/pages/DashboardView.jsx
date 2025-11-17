import React, { useState, useEffect } from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import SectionCard from "../components/SectionCard";
import ProgressRing from "../components/ui/ProgressRing";
import AchievementBadge from "../components/ui/AchievementBadge";
import WeeklyStudyGraph from "../components/ui/WeeklyStudyGraph";
import { Link } from "react-router-dom";
import { 
    getOverallStats, 
    getStatsSummary, 
    getRecentActivity 
} from "../services/progressService";
import { useAuth } from "../contexts/AuthContext";

export function DashboardView() {
    const { user } = useAuth();
    const userName = user?.name || user?.email?.split('@')[0] || "Student";
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    
    // Real-time progress data
    const [progressData, setProgressData] = useState({
        bands: {
            overall: 0,
            speaking: 0,
            reading: 0,
            writing: 0,
            listening: 0
        },
        trends: {
            reading: 0,
            writing: 0,
            listening: 0,
            speaking: 0
        },
        stats: {
            testsCompleted: 0,
            weeklyChange: 0,
            studyHours: 0,
            weeklyHours: 0,
            streakDays: 0,
            streakChange: 0
        },
        recentActivity: [],
        goals: {
            targetBand: 8.0,
            progress: 0,
            nextPractice: "Start practicing to see recommendations",
            studyPlanProgress: 0
        }
    });

    // Load progress data
    const loadProgressData = () => {
        try {
            const userId = user?.email || user?.id || null;
            const stats = getOverallStats(userId);
            const summary = getStatsSummary(userId);
            const activities = getRecentActivity(4, userId);

            // Calculate progress percentage (based on target band of 8.0)
            const targetBand = 8.0;
            const currentBand = stats.bands.overall || 0;
            const progress = currentBand > 0 ? Math.min((currentBand / targetBand) * 100, 100) : 0;

            // Calculate study plan progress (based on tests completed, assuming 30 tests = 100%)
            const studyPlanProgress = Math.min((summary.testsCompleted / 30) * 100, 100);

            setProgressData({
                bands: stats.bands,
                trends: stats.trends,
                stats: summary,
                recentActivity: activities,
                goals: {
                    targetBand,
                    progress: Math.round(progress),
                    nextPractice: getNextPracticeRecommendation(stats.bands),
                    studyPlanProgress: Math.round(studyPlanProgress)
                }
            });
        } catch (error) {
            console.error("Error loading progress data:", error);
        }
    };

    // Get next practice recommendation based on lowest band
    const getNextPracticeRecommendation = (bands) => {
        const moduleBands = [
            { module: 'speaking', band: bands.speaking },
            { module: 'reading', band: bands.reading },
            { module: 'writing', band: bands.writing },
            { module: 'listening', band: bands.listening }
        ].filter(m => m.band > 0);

        if (moduleBands.length === 0) {
            return "Start with any practice module";
        }

        const lowest = moduleBands.reduce((min, m) => m.band < min.band ? m : min, moduleBands[0]);
        
        const recommendations = {
            speaking: "Speaking Part 2",
            reading: "Reading Practice",
            writing: "Writing Task 1",
            listening: "Listening Practice"
        };

        return recommendations[lowest.module] || "Continue practicing";
    };

    // Update time every minute
    useEffect(() => {
        const timeInterval = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        }, 60000);

        return () => clearInterval(timeInterval);
    }, []);

    // Load progress data on mount and set up real-time updates
    useEffect(() => {
        loadProgressData();

        // Set up real-time updates every 5 seconds
        const progressInterval = setInterval(() => {
            loadProgressData();
        }, 5000);

        // Listen for storage changes (when new results are saved)
        const handleStorageChange = (e) => {
            const userId = user?.email || user?.id || null;
            if (!userId) return;
            
            // Check if the changed key belongs to the current user
            const userIdentifier = userId.replace(/[^a-zA-Z0-9]/g, '_');
            if (e.key && (
                e.key.includes('ielts-reading-history') || 
                e.key.includes('ielts-writing-history') || 
                e.key.includes('ielts-listening-history') ||
                e.key.includes('ielts-speaking-history')
            ) && e.key.includes(userIdentifier)) {
                loadProgressData();
            }
        };

        window.addEventListener('storage', handleStorageChange);

        // Also listen for custom events (for same-tab updates)
        const handleProgressUpdate = () => {
            loadProgressData();
        };

        window.addEventListener('progressUpdated', handleProgressUpdate);

        return () => {
            clearInterval(progressInterval);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('progressUpdated', handleProgressUpdate);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

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


    return (
        <AppLayout>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
                <div className="space-y-8 p-4 md:p-6 lg:p-8">
                    {/* Welcome Header */}
                    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-extrabold mb-3">
                                    Welcome back, {userName}! 👋
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
                        <div className={`bg-gradient-to-br ${getBandColor(progressData.bands.overall)} rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-all duration-300`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold opacity-90">Overall Band</h3>
                                <span className="text-2xl">📊</span>
                            </div>
                            <div className="text-3xl font-extrabold mb-2">
                                {progressData.bands.overall > 0 ? progressData.bands.overall.toFixed(1) : '--'}
                            </div>
                            <div className="flex items-center text-sm opacity-90">
                                {progressData.bands.overall > 0 ? (
                                    <>
                                        <span className="mr-1">📈</span>
                                        <span>Based on your practice</span>
                                    </>
                                ) : (
                                    <span>Start practicing to see your band</span>
                                )}
                            </div>
                        </div>

                        {Object.entries(progressData.bands).filter(([key]) => key !== 'overall').map(([module, score]) => {
                            const trend = progressData.trends[module] || 0;
                            return (
                            <div key={module} className={`bg-gradient-to-br ${getBandColor(score)} rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-all duration-300`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold opacity-90 capitalize">{module}</h3>
                                    <span className="text-2xl">
                                        {module === 'speaking' ? '🎙️' : 
                                         module === 'reading' ? '📖' : 
                                         module === 'writing' ? '✍️' : '👂'}
                                    </span>
                                </div>
                                    <div className="text-3xl font-extrabold mb-2">
                                        {score > 0 ? score.toFixed(1) : '--'}
                                    </div>
                                <div className="flex items-center text-sm opacity-90">
                                        {score > 0 ? (
                                            <>
                                                <span className="mr-1">{trend >= 0 ? '↗' : '↘'}</span>
                                                <span>{trend >= 0 ? '+' : ''}{trend.toFixed(1)}</span>
                                            </>
                                        ) : (
                                            <span>No data yet</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Study Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard 
                            title="Tests Completed" 
                            value={progressData.stats.testsCompleted} 
                            change={progressData.stats.weeklyChange > 0 ? `+${progressData.stats.weeklyChange} this week` : "No tests this week"} 
                            icon="✅"
                            color="green"
                            progress={Math.min((progressData.stats.testsCompleted / 30) * 100, 100)}
                            showProgress={true}
                        />
                        <StatCard 
                            title="Study Hours" 
                            value={`${progressData.stats.studyHours}h`} 
                            change={progressData.stats.weeklyHours > 0 ? `+${progressData.stats.weeklyHours}h this week` : "No study this week"} 
                            icon="⏰"
                            color="purple"
                            progress={Math.min((progressData.stats.studyHours / 100) * 100, 100)}
                            showProgress={true}
                        />
                        <StatCard 
                            title="Streak Days" 
                            value={progressData.stats.streakDays} 
                            change={progressData.stats.streakDays > 0 ? "Keep it up!" : "Start your streak today"} 
                            icon="🔥"
                            color="orange"
                            progress={Math.min((progressData.stats.streakDays / 7) * 100, 100)}
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
                                    {progressData.recentActivity.length > 0 ? (
                                        progressData.recentActivity.map((activity, index) => (
                                        <div key={index} className="flex items-center gap-4 p-3 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-100 hover:shadow-md transition-all duration-200">
                                                <div className={`w-3 h-3 rounded-full ${
                                                    activity.color === 'green' ? 'bg-green-500' :
                                                    activity.color === 'blue' ? 'bg-blue-500' :
                                                    activity.color === 'purple' ? 'bg-purple-500' :
                                                    'bg-orange-500'
                                                }`}></div>
                                            <div className="text-2xl">{activity.icon}</div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-slate-800">{activity.type}</p>
                                                <p className="text-xs text-slate-500">{activity.time}</p>
                                            </div>
                                            <div className="text-right">
                                                    <p className="text-sm font-bold text-slate-700">{activity.score > 0 ? activity.score.toFixed(1) : '--'}</p>
                                                <p className="text-xs text-slate-500">Band</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-slate-500">
                                            <p className="text-sm">No recent activity</p>
                                            <p className="text-xs mt-2">Complete a practice test to see your progress here</p>
                                        </div>
                                    )}
                                </div>
                            </Panel>

                            {/* Upcoming Goals */}
                            <Panel title="Upcoming Goals" className="bg-white/80 backdrop-blur rounded-2xl shadow-lg">
                                <div className="space-y-4">
                                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-semibold text-blue-800">Target Band Score</p>
                                            <span className="text-lg font-bold text-blue-700">{progressData.goals.targetBand}</span>
                                        </div>
                                        <div className="w-full bg-blue-200 rounded-full h-3">
                                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500" style={{width: `${progressData.goals.progress}%`}}></div>
                                        </div>
                                        <p className="text-xs text-blue-600 mt-2">
                                            {progressData.goals.progress}% complete 
                                            {progressData.bands.overall > 0 && ` (Current: ${progressData.bands.overall.toFixed(1)})`}
                                        </p>
                                    </div>

                                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                                        <p className="text-sm font-semibold text-green-800 mb-2">Next Practice</p>
                                        <p className="text-sm text-green-700">{progressData.goals.nextPractice}</p>
                                        <p className="text-xs text-green-600 mt-1">Recommended for improvement</p>
                                    </div>

                                    <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-semibold text-purple-800">Study Plan</p>
                                            <span className="text-sm font-bold text-purple-700">{progressData.goals.studyPlanProgress}%</span>
                                        </div>
                                        <div className="w-full bg-purple-200 rounded-full h-2">
                                            <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500" style={{width: `${progressData.goals.studyPlanProgress}%`}}></div>
                                        </div>
                                    </div>
                                </div>
                            </Panel>

                            {/* Achievement Badges */}
                            <Panel title="Achievements" className="bg-white/80 backdrop-blur rounded-2xl shadow-lg">
                                <div className="space-y-3">
                                    <AchievementBadge
                                        name="Consistent Learner"
                                        description={`${progressData.stats.streakDays} day streak`}
                                        icon="🔥"
                                        earned={progressData.stats.streakDays >= 7}
                                        progress={Math.min((progressData.stats.streakDays / 7) * 100, 100)}
                                    />
                                    <AchievementBadge
                                        name="Test Master"
                                        description={`${progressData.stats.testsCompleted} tests completed`}
                                        icon="✅"
                                        earned={progressData.stats.testsCompleted >= 10}
                                        progress={Math.min((progressData.stats.testsCompleted / 10) * 100, 100)}
                                    />
                                        <AchievementBadge
                                        name="Band Achiever"
                                        description={`Overall band: ${progressData.bands.overall > 0 ? progressData.bands.overall.toFixed(1) : '--'}`}
                                        icon="📊"
                                        earned={progressData.bands.overall >= 7.0}
                                        progress={progressData.bands.overall > 0 ? Math.min((progressData.bands.overall / 9.0) * 100, 100) : 0}
                                    />
                                </div>
                            </Panel>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}