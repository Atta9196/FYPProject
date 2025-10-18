import React, { useState, useEffect } from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";
import MicButton from "../features/speaking/components/MicButton";

export function SpeakingPracticeView() {
    const [isRecording, setIsRecording] = useState(false);
    const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds
    const [currentQuestion, setCurrentQuestion] = useState(0);
    
    const questions = [
        "Describe a memorable journey you have taken. You should say where you went, how you traveled, what you saw and did, and explain why it was memorable.",
        "Talk about a person who has influenced you. You should say who this person is, how you know them, what they have done, and explain why they have influenced you.",
        "Describe a book you have read recently. You should say what the book is about, when you read it, and explain why you liked or disliked it."
    ];

    const feedback = [
        "Fluency: Good pace and natural flow. Pronunciation: Clear articulation, minor vowel adjustments needed. Coherence: Well-structured response with clear connections.",
        "Fluency: Slight hesitation but good recovery. Pronunciation: Excellent clarity. Coherence: Strong logical progression of ideas.",
        "Fluency: Very natural delivery. Pronunciation: Perfect clarity. Coherence: Excellent organization with smooth transitions."
    ];

    useEffect(() => {
        let interval = null;
        if (isRecording && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(timeLeft => timeLeft - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsRecording(false);
        }
        return () => clearInterval(interval);
    }, [isRecording, timeLeft]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleMicClick = () => {
        if (isRecording) {
            setIsRecording(false);
        } else {
            setIsRecording(true);
            setTimeLeft(120);
        }
    };

    const nextQuestion = () => {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
            setTimeLeft(120);
            setIsRecording(false);
        }
    };

    const prevQuestion = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
            setTimeLeft(120);
            setIsRecording(false);
        }
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Progress Bar */}
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Question {currentQuestion + 1} of {questions.length}</span>
                        <span className="text-sm text-slate-500">Speaking Practice</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{width: `${((currentQuestion + 1) / questions.length) * 100}%`}}
                        ></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Question Panel */}
                    <Panel title="Speaking Question">
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-slate-700 leading-relaxed">{questions[currentQuestion]}</p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={prevQuestion}
                                    disabled={currentQuestion === 0}
                                    className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button 
                                    onClick={nextQuestion}
                                    disabled={currentQuestion === questions.length - 1}
                                    className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </Panel>

                    {/* Recording Panel */}
                    <Panel title="Recording Studio" className="lg:col-span-2">
                        <div className="space-y-6">
                            {/* Timer and Controls */}
                            <div className="flex items-center justify-center gap-6">
                                <div className="text-center">
                                    <div className={`text-3xl font-mono font-bold ${timeLeft < 30 ? 'text-red-600' : 'text-slate-700'}`}>
                                        {formatTime(timeLeft)}
                                    </div>
                                    <div className="text-sm text-slate-500">Time Remaining</div>
                                </div>
                                <MicButton 
                                    state={isRecording ? 'recording' : 'idle'} 
                                    onClick={handleMicClick}
                                />
                                <div className="text-center">
                                    <div className="text-lg font-semibold text-slate-700">
                                        {isRecording ? 'Recording...' : 'Ready to Record'}
                                    </div>
                                    <div className="text-sm text-slate-500">Click to {isRecording ? 'Stop' : 'Start'}</div>
                                </div>
                            </div>

                            {/* Audio Visualization */}
                            <div className="h-16 rounded-lg bg-gradient-to-r from-blue-100 via-sky-100 to-white relative overflow-hidden border border-slate-200">
                                <div className={`absolute inset-0 opacity-50 ${isRecording ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''} bg-[repeating-linear-gradient(90deg,transparent,transparent_10px,rgba(37,99,235,0.2)_10px,rgba(37,99,235,0.2)_20px)]`} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-slate-600 font-medium">
                                        {isRecording ? '🎤 Recording in progress...' : '🎤 Click the microphone to start'}
                                    </span>
                                </div>
                            </div>

                            {/* AI Feedback */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">AI Feedback</h4>
                                <div className="rounded-lg border border-slate-200 p-4 bg-gradient-to-r from-green-50 to-blue-50">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                            <span className="text-blue-600 text-sm">🤖</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm text-slate-700 leading-relaxed">
                                                {feedback[currentQuestion]}
                                            </p>
                                            <div className="mt-2 flex gap-2">
                                                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Fluency: Good</span>
                                                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">Pronunciation: Clear</span>
                                                <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">Coherence: Strong</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Panel>
                </div>
            </div>
        </AppLayout>
    );
}