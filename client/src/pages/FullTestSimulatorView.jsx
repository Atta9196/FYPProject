import React, { useState } from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";
import Tabs from "../components/ui/Tabs";

export function FullTestSimulatorView() {
    const [activeTab, setActiveTab] = useState(0);
    const [testStarted, setTestStarted] = useState(false);

    const ListeningContent = () => (
        <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Listening Test Instructions</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• You will hear 4 recordings</li>
                    <li>• Each recording will be played only once</li>
                    <li>• You have 10 minutes to transfer your answers</li>
                    <li>• Total time: 40 minutes</li>
                </ul>
            </div>
            <div className="text-center py-12">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎧</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Ready to Start Listening Test?</h3>
                <p className="text-slate-500 mb-4">Click the button below to begin the listening section</p>
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Start Listening Test
                </button>
            </div>
        </div>
    );

    const ReadingContent = () => (
        <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">Reading Test Instructions</h3>
                <ul className="text-sm text-green-800 space-y-1">
                    <li>• 3 reading passages with 40 questions total</li>
                    <li>• 60 minutes to complete all questions</li>
                    <li>• No extra time for transferring answers</li>
                    <li>• Answer directly on the answer sheet</li>
                </ul>
            </div>
            <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📖</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Ready to Start Reading Test?</h3>
                <p className="text-slate-500 mb-4">Click the button below to begin the reading section</p>
                <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    Start Reading Test
                </button>
            </div>
        </div>
    );

    const WritingContent = () => (
        <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">Writing Test Instructions</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Task 1: Write at least 150 words (20 minutes)</li>
                    <li>• Task 2: Write at least 250 words (40 minutes)</li>
                    <li>• Total time: 60 minutes</li>
                    <li>• Use formal academic style</li>
                </ul>
            </div>
            <div className="text-center py-12">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">✍️</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Ready to Start Writing Test?</h3>
                <p className="text-slate-500 mb-4">Click the button below to begin the writing section</p>
                <button className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                    Start Writing Test
                </button>
            </div>
        </div>
    );

    const SpeakingContent = () => (
        <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-2">Speaking Test Instructions</h3>
                <ul className="text-sm text-purple-800 space-y-1">
                    <li>• Part 1: Introduction and interview (4-5 minutes)</li>
                    <li>• Part 2: Individual long turn (3-4 minutes)</li>
                    <li>• Part 3: Two-way discussion (4-5 minutes)</li>
                    <li>• Total time: 11-14 minutes</li>
                </ul>
            </div>
            <div className="text-center py-12">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎤</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Ready to Start Speaking Test?</h3>
                <p className="text-slate-500 mb-4">Click the button below to begin the speaking section</p>
                <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    Start Speaking Test
                </button>
            </div>
        </div>
    );

    const tabs = [
        { 
            label: 'Listening', 
            content: <ListeningContent />,
            icon: '🎧',
            time: '40 min',
            color: 'blue'
        },
        { 
            label: 'Reading', 
            content: <ReadingContent />,
            icon: '📖',
            time: '60 min',
            color: 'green'
        },
        { 
            label: 'Writing', 
            content: <WritingContent />,
            icon: '✍️',
            time: '60 min',
            color: 'yellow'
        },
        { 
            label: 'Speaking', 
            content: <SpeakingContent />,
            icon: '🎤',
            time: '14 min',
            color: 'purple'
        }
    ];

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Test Overview */}
                <Panel title="IELTS Full Test Simulator">
                    <div className="space-y-4">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-slate-900 mb-2">Complete IELTS Test Experience</h2>
                            <p className="text-slate-600 mb-4">
                                Practice all four IELTS modules in one comprehensive test session. This simulator provides 
                                realistic test conditions to help you prepare for the actual exam.
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {tabs.map((tab, index) => (
                                    <div key={index} className="text-center">
                                        <div className="text-2xl mb-2">{tab.icon}</div>
                                        <div className="text-sm font-medium text-slate-700">{tab.label}</div>
                                        <div className="text-xs text-slate-500">{tab.time}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-slate-600">
                                Total Test Duration: <span className="font-semibold">2 hours 54 minutes</span>
                            </div>
                            <button 
                                onClick={() => setTestStarted(!testStarted)}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                {testStarted ? 'End Test' : 'Start Full Test'}
                            </button>
                        </div>
                    </div>
                </Panel>

                {/* Test Sections */}
                <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
                    <Tabs
                        tabs={tabs}
                        initial={activeTab}
                        onChange={setActiveTab}
                    />
                </div>

                {/* Progress Tracker */}
                <Panel title="Test Progress">
                    <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-4">
                            {tabs.map((tab, index) => (
                                <div 
                                    key={index}
                                    className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${
                                        activeTab === index 
                                            ? 'border-blue-500 bg-blue-50' 
                                            : 'border-slate-200 bg-white hover:bg-slate-50'
                                    }`}
                                    onClick={() => setActiveTab(index)}
                                >
                                    <div className="text-lg mb-1">{tab.icon}</div>
                                    <div className="text-sm font-medium text-slate-700">{tab.label}</div>
                                    <div className="text-xs text-slate-500">{tab.time}</div>
                                    <div className={`w-2 h-2 rounded-full mx-auto mt-2 ${
                                        index < activeTab ? 'bg-green-500' : 
                                        index === activeTab ? 'bg-blue-500' : 'bg-slate-300'
                                    }`}></div>
                                </div>
                            ))}
                        </div>
                        <div className="text-center text-sm text-slate-600">
                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            Completed
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2 ml-4"></span>
                            Current
                            <span className="inline-block w-2 h-2 bg-slate-300 rounded-full mr-2 ml-4"></span>
                            Pending
                        </div>
                    </div>
                </Panel>
            </div>
        </AppLayout>
    );
}
