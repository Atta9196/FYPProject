import React, { useState, useEffect, useRef } from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";
import MicButton from "../features/speaking/components/MicButton";
import { VoiceConversation } from "../features/speaking/components/VoiceConversation";

export function SpeakingPracticeView() {
    // Mode selection state
    const [selectedMode, setSelectedMode] = useState(null); // 'record', 'realtime', or 'voice'
    
    // Record & Submit mode state
    const [isRecording, setIsRecording] = useState(false);
    const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
    const [currentQuestion, setCurrentQuestion] = useState("");
    const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluation, setEvaluation] = useState(null);
    const [transcript, setTranscript] = useState("");
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioChunks, setAudioChunks] = useState([]);
    
    // Real-time mode state
    const [isRealtimeActive, setIsRealtimeActive] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [conversationHistory, setConversationHistory] = useState([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState("");
    const [sessionFeedback, setSessionFeedback] = useState(null);
    
    // Refs
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const conversationEndRef = useRef(null);

    // Auto-scroll to bottom of conversation
    useEffect(() => {
        if (conversationEndRef.current) {
            conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [conversationHistory]);

    // Timer effect for recording
    useEffect(() => {
        let interval = null;
        if (isRecording && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            stopRecording();
        }
        return () => clearInterval(interval);
    }, [isRecording, timeLeft]);

    // Load a random IELTS question for record mode
    const loadRandomQuestion = async () => {
        try {
            setIsLoadingQuestion(true);
            const response = await fetch('http://localhost:5000/api/speaking/question');
            const data = await response.json();
            
            if (data.success) {
                setCurrentQuestion(data.question);
            } else {
                console.error('Failed to load question:', data.error);
                setCurrentQuestion("Describe a memorable journey you have taken. You should say where you went, how you traveled, what you saw and did, and explain why it was memorable.");
            }
        } catch (error) {
            console.error('Error loading question:', error);
            setCurrentQuestion("Describe a memorable journey you have taken. You should say where you went, how you traveled, what you saw and did, and explain why it was memorable.");
        } finally {
            setIsLoadingQuestion(false);
        }
    };

    // Start recording audio
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            
            audioChunksRef.current = [];
            
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            
            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                sendAudioForEvaluation(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
            setTimeLeft(120);
            setEvaluation(null);
            setTranscript("");
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Error accessing microphone. Please check your permissions.');
        }
    };

    // Stop recording audio
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    // Send audio to backend for evaluation
    const sendAudioForEvaluation = async (audioBlob) => {
        try {
            setIsEvaluating(true);
            
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');
            formData.append('question', currentQuestion);
            formData.append('userId', 'current-user'); // Replace with actual user ID
            
            const response = await fetch('http://localhost:5000/api/speaking/evaluate', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                setTranscript(data.transcript);
                setEvaluation(data.feedback);
            } else {
                console.error('Evaluation failed:', data.error);
                alert('Failed to evaluate your response. Please try again.');
            }
        } catch (error) {
            console.error('Error evaluating audio:', error);
            alert('Error evaluating your response. Please try again.');
        } finally {
            setIsEvaluating(false);
        }
    };

    // Start real-time conversation
    const startRealtimeSession = async () => {
        try {
            setIsTyping(true);
            const response = await fetch('http://localhost:5000/api/speaking/realtime/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
            });
            
            const data = await response.json();
            
            if (data.success) {
                setSessionId(data.sessionId);
                setIsRealtimeActive(true);
                setConversationHistory([{
                    role: 'examiner',
                    content: data.message,
                    timestamp: new Date()
                }]);
            } else {
                console.error('Failed to start session:', data.error);
                alert('Failed to start real-time session. Please try again.');
            }
        } catch (error) {
            console.error('Error starting session:', error);
            alert('Error starting real-time session. Please try again.');
        } finally {
            setIsTyping(false);
        }
    };

    // Continue real-time conversation with streaming support
    const continueConversation = async (userMessage) => {
        if (!userMessage.trim()) return;
        
        try {
            setIsTyping(true);
            
            // Add user message to history
            const newHistory = [...conversationHistory, {
                role: 'user',
                content: userMessage,
                timestamp: new Date()
            }];
            setConversationHistory(newHistory);
            setCurrentMessage("");
            
            let accumulatedMessage = '';
            setStreamingMessage(""); // Reset streaming message
            
            const response = await fetch('http://localhost:5000/api/speaking/realtime/continue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: sessionId,
                    userMessage: userMessage,
                    conversationHistory: newHistory.slice(0, -1) // Exclude the user message we just added
                })
            });
            
            // Check if response is streaming (SSE)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/event-stream')) {
                // Handle Server-Sent Events streaming
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                
                                if (data.chunk) {
                                    // Accumulate streaming chunks and display in realtime
                                    accumulatedMessage += data.chunk;
                                    setStreamingMessage(accumulatedMessage);
                                }
                                
                                if (data.isComplete && data.message) {
                                    // Final complete message
                                    accumulatedMessage = data.message;
                                    setStreamingMessage(""); // Clear streaming message
                                    setConversationHistory([...newHistory, {
                                        role: 'examiner',
                                        content: accumulatedMessage,
                                        timestamp: new Date()
                                    }]);
                                }
                            } catch (e) {
                                console.error('Error parsing SSE data:', e);
                            }
                        }
                    }
                }
            } else {
                // Fallback to JSON response (non-streaming)
                const data = await response.json();
                
                if (data.success) {
                    setConversationHistory([...newHistory, {
                        role: 'examiner',
                        content: data.message,
                        timestamp: new Date()
                    }]);
                } else {
                    console.error('Failed to continue conversation:', data.error);
                }
            }
        } catch (error) {
            console.error('Error continuing conversation:', error);
            setStreamingMessage(""); // Clear streaming message on error
        } finally {
            setIsTyping(false);
            setStreamingMessage(""); // Clear streaming message when done
        }
    };

    // End real-time session
    const endRealtimeSession = async () => {
        try {
            setIsTyping(true);
            const response = await fetch('http://localhost:5000/api/speaking/realtime/end', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: sessionId,
                    conversationHistory: conversationHistory,
                    userId: 'current-user' // Replace with actual user ID
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setSessionFeedback(data.feedback);
                setIsRealtimeActive(false);
            } else {
                console.error('Failed to end session:', data.error);
            }
        } catch (error) {
            console.error('Error ending session:', error);
        } finally {
            setIsTyping(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const handleMicClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const loadNewQuestion = () => {
        loadRandomQuestion();
            setTimeLeft(120);
            setIsRecording(false);
        setEvaluation(null);
        setTranscript("");
    };

    const resetToModeSelection = () => {
        setSelectedMode(null);
        setEvaluation(null);
        setTranscript("");
        setSessionFeedback(null);
        setConversationHistory([]);
        setIsRealtimeActive(false);
        setSessionId(null);
    };

    // Mode Selection Screen
    if (!selectedMode) {
        return (
            <AppLayout>
                <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
                    <div className="max-w-4xl w-full">
                        {/* Title */}
                        <div className="text-center mb-12">
                            <h1 className="text-4xl md:text-5xl font-extrabold text-blue-700 mb-4">
                                IELTS Speaking Practice
                            </h1>
                            <p className="text-xl text-slate-600">
                                Choose your practice mode to improve your speaking skills
                            </p>
                        </div>

                        {/* Mode Selection Cards */}
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Record & Submit Mode */}
                            <div 
                                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-200"
                                onClick={() => setSelectedMode('record')}
                            >
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <span className="text-4xl">🎙️</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800 mb-4">
                                        Record & Submit Practice
                                    </h3>
                                    <p className="text-slate-600 mb-6 leading-relaxed">
                                        Get AI-generated IELTS questions, record your response, and receive detailed feedback on fluency, grammar, pronunciation, and coherence.
                                    </p>
                                    <div className="space-y-2 text-sm text-slate-500">
                                        <div className="flex items-center justify-center">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                            AI-generated questions
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                            2-minute recording timer
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                            Detailed IELTS feedback
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Real-time Text Mode */}
                            <div 
                                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-green-200"
                                onClick={() => setSelectedMode('realtime')}
                            >
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <span className="text-4xl">💬</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800 mb-4">
                                        Text Conversation
                                    </h3>
                                    <p className="text-slate-600 mb-6 leading-relaxed">
                                        Have a text-based conversation with an AI IELTS examiner. Practice Part 1 and Part 3 style questions with immediate feedback.
                                    </p>
                                    <div className="space-y-2 text-sm text-slate-500">
                                        <div className="flex items-center justify-center">
                                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                            Text-based chat
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                            AI examiner responses
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                            Session summary feedback
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Voice Conversation Mode */}
                            <div 
                                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-purple-200"
                                onClick={() => setSelectedMode('voice')}
                            >
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <span className="text-4xl">🎙️</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800 mb-4">
                                        Voice Conversation
                                    </h3>
                                    <p className="text-slate-600 mb-6 leading-relaxed">
                                        Have a real-time voice conversation with an AI IELTS examiner. Practice speaking naturally with voice-to-voice interaction.
                                    </p>
                                    <div className="space-y-2 text-sm text-slate-500">
                                        <div className="flex items-center justify-center">
                                            <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                                            Real-time voice chat
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                                            Natural conversation flow
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                                            Voice-to-voice interaction
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    // Record & Submit Mode
    if (selectedMode === 'record') {
    return (
        <AppLayout>
            <div className="space-y-8 p-4 md:p-6 lg:p-8 bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-blue-700">Record & Submit Practice</h1>
                            <p className="text-slate-600 mt-2">Record your response and get detailed AI feedback</p>
                        </div>
                        <button
                            onClick={resetToModeSelection}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                        >
                            ← Back to Modes
                        </button>
                </div>

                    {/* Status Bar */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-700">
                                AI-Powered Speaking Practice
                            </span>
                            <span className="text-sm text-slate-500">
                                {isLoadingQuestion ? "Loading question..." : 
                                 isEvaluating ? "Analyzing your response..." : 
                                 "Ready to practice"}
                        </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                    isRecording ? "bg-gradient-to-r from-red-500 to-pink-500" :
                                    isEvaluating ? "bg-gradient-to-r from-yellow-500 to-orange-500" :
                                    "bg-gradient-to-r from-blue-600 to-indigo-600"
                                }`}
                                style={{ width: isRecording ? "100%" : isEvaluating ? "100%" : "0%" }}
                        ></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {/* Question Section */}
                        <Panel title="AI-Generated Question" className="lg:col-span-1 bg-white/80 backdrop-blur rounded-2xl shadow-md">
                        <div className="space-y-4">
                                {isLoadingQuestion ? (
                                    <div className="p-5 bg-gradient-to-br from-blue-100 to-white rounded-xl border border-blue-200 shadow-sm">
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                            <p className="text-slate-600">Loading AI question...</p>
                                        </div>
                                    </div>
                                ) : (
                            <div className="p-5 bg-gradient-to-br from-blue-100 to-white rounded-xl border border-blue-200 shadow-sm">
                                        <p className="text-slate-800 leading-relaxed">{currentQuestion}</p>
                            </div>
                                )}
                                <div className="flex justify-center">
                                <button
                                        onClick={loadNewQuestion}
                                        disabled={isLoadingQuestion || isRecording || isEvaluating}
                                        className="px-6 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        🔄 New Question
                                </button>
                            </div>
                        </div>
                    </Panel>

                    {/* Recording & Feedback Section */}
                    <Panel title="Recording Studio" className="lg:col-span-2 bg-white/80 backdrop-blur rounded-2xl shadow-md">
                        <div className="space-y-8">
                            {/* Timer and Controls */}
                            <div className="flex flex-col items-center gap-4">
                                <div className={`text-4xl font-mono font-extrabold ${timeLeft < 30 ? "text-red-600" : "text-blue-700"}`}>
                                    {formatTime(timeLeft)}
                                </div>
                                <div className="flex items-center gap-6">
                                    <MicButton state={isRecording ? "recording" : "idle"} onClick={handleMicClick} />
                                    <div className="text-center">
                                        <p className="text-lg font-semibold text-slate-800">
                                            {isRecording ? "Recording..." : "Ready to Record"}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            Click the microphone to {isRecording ? "stop" : "start"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Audio Visualization */}
                            <div className="h-16 rounded-xl bg-gradient-to-r from-blue-100 via-sky-50 to-white relative overflow-hidden border border-slate-200 shadow-inner">
                                <div
                                    className={`absolute inset-0 opacity-50 ${
                                        isRecording ? "animate-[pulse_2s_ease-in-out_infinite]" : ""
                                    } bg-[repeating-linear-gradient(90deg,transparent,transparent_12px,rgba(37,99,235,0.25)_12px,rgba(37,99,235,0.25)_24px)]`}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-slate-600 font-medium">
                                        {isRecording ? "🎙️ Recording in progress..." : "🎙️ Click the microphone to begin speaking"}
                                    </span>
                                </div>
                            </div>

                            {/* AI Feedback */}
                                {isEvaluating ? (
                                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-slate-200 p-5 shadow-sm">
                                        <div className="flex items-center justify-center space-x-3">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                                            <p className="text-slate-700 font-medium">Analyzing your response...</p>
                                        </div>
                                    </div>
                                ) : evaluation ? (
                                    <div className="space-y-4">
                                        {/* Transcript */}
                                        {transcript && (
                                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-slate-200 p-4 shadow-sm">
                                                <h4 className="text-sm font-semibold text-slate-800 mb-2">📝 Your Response:</h4>
                                                <p className="text-sm text-slate-700 leading-relaxed italic">"{transcript}"</p>
                                            </div>
                                        )}
                                        
                                        {/* AI Evaluation */}
                            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-slate-200 p-5 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                        <span className="text-blue-600 text-lg">🤖</span>
                                    </div>
                                    <div className="flex-1">
                                                    <h4 className="text-sm font-semibold text-slate-800 mb-3">AI Evaluation:</h4>
                                                    <div className="space-y-3">
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-xs font-semibold text-slate-600 w-20">Fluency:</span>
                                                            <span className="text-xs text-slate-700">{evaluation.fluency}</span>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-xs font-semibold text-slate-600 w-20">Lexical:</span>
                                                            <span className="text-xs text-slate-700">{evaluation.lexical}</span>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-xs font-semibold text-slate-600 w-20">Grammar:</span>
                                                            <span className="text-xs text-slate-700">{evaluation.grammar}</span>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-xs font-semibold text-slate-600 w-20">Pronunciation:</span>
                                                            <span className="text-xs text-slate-700">{evaluation.pronunciation}</span>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-xs font-semibold text-slate-600 w-20">Band Score:</span>
                                                            <span className="text-xs font-semibold text-blue-700">{evaluation.bandScore}</span>
                                                        </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                                ) : (
                                    <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border border-slate-200 p-5 shadow-sm">
                                        <div className="text-center">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                                <span className="text-slate-500 text-lg">🎤</span>
                                            </div>
                                            <p className="text-slate-600 text-sm">
                                                Record your response to see AI-powered feedback
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Panel>
                    </div>
                </div>
            </AppLayout>
        );
    }

    // Real-time Mode
    if (selectedMode === 'realtime') {
        return (
            <AppLayout>
                <div className="space-y-8 p-4 md:p-6 lg:p-8 bg-gradient-to-br from-green-50 via-white to-emerald-50 min-h-screen">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-green-700">Real-time Speaking Practice</h1>
                            <p className="text-slate-600 mt-2">Have a natural conversation with an AI IELTS examiner</p>
                        </div>
                        <button
                            onClick={resetToModeSelection}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                        >
                            ← Back to Modes
                        </button>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        {!isRealtimeActive ? (
                            // Start Session Screen
                            <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span className="text-4xl">💬</span>
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-4">
                                    Ready to Start Your Practice Session?
                                </h3>
                                <p className="text-slate-600 mb-8">
                                    The AI examiner will ask you questions and provide feedback throughout the conversation.
                                </p>
                                <button
                                    onClick={startRealtimeSession}
                                    disabled={isTyping}
                                    className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isTyping ? "Starting..." : "Start Conversation"}
                                </button>
                            </div>
                        ) : (
                            // Active Conversation
                            <div className="space-y-6">
                                {/* Conversation History */}
                                <div className="bg-white rounded-2xl p-6 shadow-lg max-h-96 overflow-y-auto">
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Conversation</h3>
                                    <div className="space-y-4">
                                        {conversationHistory.map((message, index) => (
                                            <div
                                                key={index}
                                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                                        message.role === 'user'
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-slate-100 text-slate-800'
                                                    }`}
                                                >
                                                    <p className="text-sm">{message.content}</p>
                                                    <p className="text-xs opacity-70 mt-1">
                                                        {message.role === 'user' ? 'You' : 'AI Examiner'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {isTyping && (
                                            <div className="flex justify-start">
                                                <div className="bg-slate-100 text-slate-800 px-4 py-2 rounded-lg">
                                                    {streamingMessage ? (
                                                        <div className="text-sm">
                                                            {streamingMessage}
                                                            <span className="inline-block w-2 h-4 bg-slate-600 ml-1 animate-pulse">|</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex space-x-1">
                                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        <div ref={conversationEndRef} />
                                    </div>
                                </div>

                                {/* Message Input */}
                                {!sessionFeedback && (
                                    <div className="bg-white rounded-2xl p-6 shadow-lg">
                                        <div className="flex gap-4">
                                            <input
                                                type="text"
                                                value={currentMessage}
                                                onChange={(e) => setCurrentMessage(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && !isTyping && continueConversation(currentMessage)}
                                                placeholder="Type your response here..."
                                                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                                disabled={isTyping}
                                            />
                                            <button
                                                onClick={() => continueConversation(currentMessage)}
                                                disabled={!currentMessage.trim() || isTyping}
                                                className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Send
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Session Controls */}
                                <div className="flex justify-center gap-4">
                                    {!sessionFeedback && (
                                        <button
                                            onClick={endRealtimeSession}
                                            disabled={isTyping}
                                            className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            End Session
                                        </button>
                                    )}
                                </div>

                                {/* Session Feedback */}
                                {sessionFeedback && (
                                    <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-slate-200 p-6 shadow-sm">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                                <span className="text-green-600 text-lg">📊</span>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-lg font-semibold text-slate-800 mb-3">Session Summary</h4>
                                                <p className="text-slate-700 leading-relaxed">{sessionFeedback}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </AppLayout>
        );
    }

    // Voice Conversation Mode
    if (selectedMode === 'voice') {
        return (
            <AppLayout>
                <div className="space-y-8 p-4 md:p-6 lg:p-8 bg-gradient-to-br from-purple-50 via-white to-pink-50 min-h-screen">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-purple-700">Voice Conversation</h1>
                            <p className="text-slate-600 mt-2">Have a real-time voice conversation with an AI IELTS examiner</p>
                        </div>
                        <button
                            onClick={resetToModeSelection}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                        >
                            ← Back to Modes
                        </button>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <Panel title="Real-time Voice Conversation" className="bg-white/80 backdrop-blur rounded-2xl shadow-md">
                            <VoiceConversation onEndSession={resetToModeSelection} />
                    </Panel>
                </div>
            </div>
        </AppLayout>
    );
}

    return null;
}