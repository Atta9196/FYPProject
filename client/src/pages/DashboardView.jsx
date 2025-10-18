import React from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import SectionCard from "../components/SectionCard";

export function DashboardView() {
    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Welcome Section */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
                    <h1 className="text-3xl font-bold mb-2">Welcome to Your Dashboard</h1>
                    <p className="text-blue-100">Track your progress and continue your IELTS preparation journey</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        title="Overall Band Score" 
                        value="7.5" 
                        change="+0.5" 
                        icon="📊"
                        color="blue"
                    />
                    <StatCard 
                        title="Tests Completed" 
                        value="12" 
                        change="+3" 
                        icon="✅"
                        color="green"
                    />
                    <StatCard 
                        title="Study Hours" 
                        value="45" 
                        change="+8" 
                        icon="⏰"
                        color="purple"
                    />
                    <StatCard 
                        title="Streak Days" 
                        value="7" 
                        change="+1" 
                        icon="🔥"
                        color="orange"
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Practice Sections */}
                    <div className="lg:col-span-2 space-y-6">
                        <SectionCard 
                            title="Quick Practice"
                            description="Start a quick practice session"
                            icon="⚡"
                            link="/speaking"
                            buttonText="Start Speaking Practice"
                        />
                        <SectionCard 
                            title="Full Test Simulation"
                            description="Take a complete IELTS test"
                            icon="📝"
                            link="/tests"
                            buttonText="Start Full Test"
                        />
                        <SectionCard 
                            title="MCQ Practice"
                            description="Practice multiple choice questions"
                            icon="❓"
                            link="/mcq"
                            buttonText="Practice MCQs"
                        />
                    </div>

                    {/* Side Panel */}
                    <div className="space-y-6">
                        <Panel title="Recent Activity">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <div>
                                        <p className="text-sm font-medium">Speaking Practice</p>
                                        <p className="text-xs text-gray-500">2 hours ago</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <div>
                                        <p className="text-sm font-medium">Reading Test</p>
                                        <p className="text-xs text-gray-500">1 day ago</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    <div>
                                        <p className="text-sm font-medium">Writing Task 1</p>
                                        <p className="text-xs text-gray-500">2 days ago</p>
                                    </div>
                                </div>
                            </div>
                        </Panel>

                        <Panel title="Upcoming Goals">
                            <div className="space-y-3">
                                <div className="p-3 border border-blue-200 rounded-lg">
                                    <p className="text-sm font-medium text-blue-800">Target Band Score: 8.0</p>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                        <div className="bg-blue-600 h-2 rounded-full" style={{width: '75%'}}></div>
                                    </div>
                                </div>
                                <div className="p-3 border border-green-200 rounded-lg">
                                    <p className="text-sm font-medium text-green-800">Daily Practice: 30 min</p>
                                    <p className="text-xs text-green-600">✓ Completed today</p>
                                </div>
                            </div>
                        </Panel>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}