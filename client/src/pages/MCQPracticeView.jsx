import React, { useState, useEffect } from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";

export function MCQPracticeView() {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState('');
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
    const [answers, setAnswers] = useState({});

    const questions = [
        {
            id: 1,
            question: "Which of the following best describes the main idea of the passage?",
            options: [
                "The importance of renewable energy sources",
                "The challenges of urban development",
                "The benefits of sustainable living practices",
                "The impact of climate change on agriculture"
            ],
            correct: "C"
        },
        {
            id: 2,
            question: "According to the passage, what is the primary concern mentioned?",
            options: [
                "Economic growth",
                "Environmental sustainability",
                "Social inequality",
                "Technological advancement"
            ],
            correct: "B"
        },
        {
            id: 3,
            question: "The author suggests that the solution lies in:",
            options: [
                "Government intervention",
                "Individual responsibility",
                "International cooperation",
                "Technological innovation"
            ],
            correct: "B"
        }
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAnswerSelect = (option) => {
        setSelectedAnswer(option);
        setAnswers(prev => ({
            ...prev,
            [currentQuestion]: option
        }));
    };

    const nextQuestion = () => {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
            setSelectedAnswer(answers[currentQuestion + 1] || '');
        }
    };

    const prevQuestion = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
            setSelectedAnswer(answers[currentQuestion - 1] || '');
        }
    };

    const submitTest = () => {
        const score = Object.keys(answers).reduce((acc, key) => {
            const questionIndex = parseInt(key);
            return answers[key] === questions[questionIndex].correct ? acc + 1 : acc;
        }, 0);
        alert(`Test completed! Your score: ${score}/${questions.length}`);
    };

    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Header with Timer and Progress */}
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-semibold text-slate-900">MCQ Practice Test</h1>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className={`text-lg font-mono font-bold ${timeLeft < 60 ? 'text-red-600' : 'text-slate-700'}`}>
                                    {formatTime(timeLeft)}
                                </div>
                                <div className="text-xs text-slate-500">Time Remaining</div>
                            </div>
                        </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{width: `${progress}%`}}
                        ></div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm text-slate-600">
                        <span>Question {currentQuestion + 1} of {questions.length}</span>
                        <span>{Math.round(progress)}% Complete</span>
                    </div>
                </div>

                {/* Question Panel */}
                <Panel title={`Question ${currentQuestion + 1}`}>
                    <div className="space-y-6">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-slate-700 text-lg leading-relaxed">
                                {questions[currentQuestion].question}
                            </p>
                        </div>

                        <div className="space-y-3">
                            {questions[currentQuestion].options.map((option, index) => {
                                const optionLetter = String.fromCharCode(65 + index);
                                const isSelected = selectedAnswer === optionLetter;
                                const isAnswered = answers[currentQuestion] === optionLetter;
                                
                                return (
                                    <label 
                                        key={optionLetter}
                                        className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                                            isSelected 
                                                ? 'border-blue-500 bg-blue-50' 
                                                : isAnswered 
                                                    ? 'border-green-500 bg-green-50'
                                                    : 'border-slate-200 bg-white hover:bg-slate-50'
                                        }`}
                                    >
                                        <input 
                                            type="radio" 
                                            name={`question-${currentQuestion}`}
                                            value={optionLetter}
                                            checked={isSelected}
                                            onChange={() => handleAnswerSelect(optionLetter)}
                                            className="w-4 h-4 text-blue-600"
                                        />
                                        <span className="font-medium text-slate-700 w-6">{optionLetter}.</span>
                                        <span className="text-slate-700 flex-1">{option}</span>
                                        {isAnswered && (
                                            <span className="text-green-600 text-sm">✓</span>
                                        )}
                                    </label>
                                );
                            })}
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                            <button 
                                onClick={prevQuestion}
                                disabled={currentQuestion === 0}
                                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                ← Previous
                            </button>
                            
                            <div className="flex gap-2">
                                {currentQuestion === questions.length - 1 ? (
                                    <button 
                                        onClick={submitTest}
                                        className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                                    >
                                        Submit Test
                                    </button>
                                ) : (
                                    <button 
                                        onClick={nextQuestion}
                                        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                    >
                                        Next →
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </Panel>

                {/* Answer Summary */}
                <Panel title="Answer Summary">
                    <div className="grid grid-cols-5 gap-2">
                        {questions.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    setCurrentQuestion(index);
                                    setSelectedAnswer(answers[index] || '');
                                }}
                                className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                                    index === currentQuestion
                                        ? 'bg-blue-600 text-white'
                                        : answers[index]
                                            ? 'bg-green-100 text-green-700 border border-green-300'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                {index + 1}
                            </button>
                        ))}
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                        <span className="inline-block w-3 h-3 bg-green-100 border border-green-300 rounded mr-2"></span>
                        Answered
                        <span className="inline-block w-3 h-3 bg-slate-100 rounded mr-2 ml-4"></span>
                        Not Answered
                    </div>
                </Panel>
            </div>
        </AppLayout>
    );
}