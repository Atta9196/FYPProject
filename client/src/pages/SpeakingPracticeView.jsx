import React, { useState, useEffect, useRef } from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";
import { useAuth } from "../contexts/AuthContext";
import { getStorageKeyForModule } from "../services/progressService";
import MicButton from "../features/speaking/components/MicButton";
import { VoiceConversation } from "../features/speaking/components/VoiceConversation";

function getStorageKey(userId) {
    return getStorageKeyForModule('speaking', userId) || "ielts-speaking-history";
}

function loadHistory(userId) {
    if (typeof window === "undefined") return [];
    try {
        const key = getStorageKey(userId);
        const raw = window.localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn("Failed to parse speaking history", error);
        return [];
    }
}

function saveHistory(entries, userId) {
    if (typeof window === "undefined") return;
    const key = getStorageKey(userId);
    window.localStorage.setItem(key, JSON.stringify(entries));
}

export function SpeakingPracticeView({ embedded = false }) {
    const { user } = useAuth();
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

                // Save to localStorage for progress tracking
                const historyEntry = {
                    id: Date.now(),
                    question: currentQuestion,
                    transcript: data.transcript,
                    feedback: data.feedback,
                    bandScore: parseFloat(data.feedback?.bandScore?.replace(/[^0-9.]/g, '') || 0),
                    submittedAt: new Date().toISOString(),
                    type: 'recorded_practice'
                };

                const userId = user?.email || user?.id || null;
                const existingHistory = loadHistory(userId);
                const updatedHistory = [historyEntry, ...existingHistory].slice(0, 20);
                saveHistory(updatedHistory, userId);

                // Dispatch event to update dashboards in real-time
                window.dispatchEvent(new Event('progressUpdated'));
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

                // Extract band score from feedback if available
                const bandScoreMatch = data.feedback?.match(/band\s*score[:\s]*([0-9.]+)/i);
                const bandScore = bandScoreMatch ? parseFloat(bandScoreMatch[1]) : 0;

                // Save to localStorage for progress tracking
                const historyEntry = {
                    id: Date.now(),
                    sessionId: sessionId,
                    conversationHistory: conversationHistory,
                    feedback: data.feedback,
                    bandScore: bandScore,
                    submittedAt: new Date().toISOString(),
                    type: 'realtime_practice'
                };

                const userId = user?.email || user?.id || null;
                const existingHistory = loadHistory(userId);
                const updatedHistory = [historyEntry, ...existingHistory].slice(0, 20);
                saveHistory(updatedHistory, userId);

                // Dispatch event to update dashboards in real-time
                window.dispatchEvent(new Event('progressUpdated'));

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
        const modeSelectionContent = (
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
        );
        return embedded ? modeSelectionContent : <AppLayout>{modeSelectionContent}</AppLayout>;
    }

    // Record & Submit Mode
    if (selectedMode === 'record') {
        const recordModeContent = (
            <div className="space-y-8 p-4 md:p-6 lg:p-8 bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen">
                    {/* Header */}
                    {!embedded && (
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
                    )}

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
        );
        return embedded ? recordModeContent : <AppLayout>{recordModeContent}</AppLayout>;
    }

    // Real-time Mode
    if (selectedMode === 'realtime') {
        const realtimeModeContent = (
            <div className="space-y-4 md:space-y-6 lg:space-y-8 p-3 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-br from-green-50 via-white to-emerald-50 min-h-screen">
                    {/* Header - Enhanced */}
                    {!embedded && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                                        <span className="text-xl md:text-2xl">💬</span>
                                    </div>
                                    <div>
                                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                            Real-time Speaking Practice
                                        </h1>
                                        <p className="text-sm md:text-base text-slate-600 mt-1">Have a natural conversation with an AI IELTS examiner</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={resetToModeSelection}
                                className="px-4 py-2.5 text-sm font-medium rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span className="hidden sm:inline">Back to Modes</span>
                                <span className="sm:hidden">Back</span>
                            </button>
                        </div>
                    )}

                    <div className="max-w-5xl mx-auto">
                        {!isRealtimeActive ? (
                            // Start Session Screen - Enhanced
                            <div className="bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl p-6 md:p-10 lg:p-12 shadow-xl border border-slate-200/50 text-center">
                                <div className="w-24 h-24 md:w-28 md:h-28 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-float">
                                    <span className="text-5xl md:text-6xl">💬</span>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">
                                    Ready to Start Your Practice Session?
                                </h3>
                                <p className="text-base md:text-lg text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                                    Have a natural conversation with an AI IELTS examiner. Practice Part 1 and Part 3 style questions with immediate feedback and guidance.
                                </p>
                                
                                {/* Features List */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200/50">
                                        <div className="text-2xl mb-2">🎯</div>
                                        <h4 className="font-semibold text-slate-800 text-sm mb-1">IELTS Focused</h4>
                                        <p className="text-xs text-slate-600">Part 1 & 3 questions</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200/50">
                                        <div className="text-2xl mb-2">⚡</div>
                                        <h4 className="font-semibold text-slate-800 text-sm mb-1">Real-time</h4>
                                        <p className="text-xs text-slate-600">Instant feedback</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200/50">
                                        <div className="text-2xl mb-2">📊</div>
                                        <h4 className="font-semibold text-slate-800 text-sm mb-1">Detailed Summary</h4>
                                        <p className="text-xs text-slate-600">Session feedback</p>
                                    </div>
                                </div>
                                
                                <button
                                    onClick={startRealtimeSession}
                                    disabled={isTyping}
                                    className="px-8 md:px-10 py-4 md:py-5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl md:rounded-2xl font-bold text-base md:text-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 mx-auto"
                                >
                                    {isTyping ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Starting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            <span>Start Conversation</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            // Active Conversation - Beautiful & Responsive Design
                            <div className="space-y-4 md:space-y-6">
                                {/* Conversation History - Enhanced Design */}
                                <div className="bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden">
                                    {/* Chat Header */}
                                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 md:px-6 py-4 border-b border-green-600/20">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                                                    <span className="text-xl md:text-2xl">🤖</span>
                                                </div>
                                                <div>
                                                    <h3 className="text-base md:text-lg font-bold text-white">AI IELTS Examiner</h3>
                                                    <p className="text-xs md:text-sm text-green-100">Real-time conversation practice</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-green-200 rounded-full animate-pulse"></div>
                                                <span className="text-xs text-green-100 hidden sm:inline">Active</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Messages Container */}
                                    <div className="h-[400px] md:h-[500px] lg:h-[600px] overflow-y-auto p-4 md:p-6 space-y-4 bg-gradient-to-b from-slate-50/50 to-white chat-container">
                                        {conversationHistory.length === 0 && (
                                            <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                                <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                                    <span className="text-3xl md:text-4xl">💬</span>
                                                </div>
                                                <p className="text-slate-500 text-sm md:text-base">Start the conversation by typing your response below</p>
                                            </div>
                                        )}
                                        
                                        {conversationHistory.map((message, index) => (
                                            <div
                                                key={index}
                                                className={`flex items-start gap-3 message-enter ${
                                                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                                }`}
                                                style={{ animationDelay: `${index * 0.1}s` }}
                                            >
                                                {/* Avatar */}
                                                <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-base font-semibold ${
                                                    message.role === 'user'
                                                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                                                        : 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
                                                }`}>
                                                    {message.role === 'user' ? '👤' : '🤖'}
                                                </div>

                                                {/* Message Bubble */}
                                                <div className={`flex flex-col max-w-[75%] sm:max-w-[70%] md:max-w-[65%] lg:max-w-[60%] ${
                                                    message.role === 'user' ? 'items-end' : 'items-start'
                                                }`}>
                                                    <div
                                                        className={`relative px-4 py-3 md:px-5 md:py-4 rounded-2xl shadow-md transition-all duration-200 ${
                                                            message.role === 'user'
                                                                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm'
                                                                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
                                                        }`}
                                                    >
                                                        <p className={`text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words ${
                                                            message.role === 'user' ? 'text-white' : 'text-slate-800'
                                                        }`}>
                                                            {message.content}
                                                        </p>
                                                        
                                                        {/* Message Tail */}
                                                        <div className={`absolute top-0 ${
                                                            message.role === 'user' 
                                                                ? 'right-0 translate-x-1' 
                                                                : 'left-0 -translate-x-1'
                                                        }`}>
                                                            <div className={`w-3 h-3 transform rotate-45 ${
                                                                message.role === 'user'
                                                                    ? 'bg-blue-600'
                                                                    : 'bg-white border-l border-t border-slate-200'
                                                            }`}></div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Timestamp */}
                                                    <span className={`text-xs text-slate-500 mt-1 px-2 ${
                                                        message.role === 'user' ? 'text-right' : 'text-left'
                                                    }`}>
                                                        {message.timestamp 
                                                            ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                            : message.role === 'user' ? 'You' : 'AI Examiner'
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {/* Typing Indicator */}
                                        {isTyping && (
                                            <div className="flex items-start gap-3 animate-fade-in">
                                                <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                                                    <span className="text-sm md:text-base">🤖</span>
                                                </div>
                                                <div className="flex flex-col items-start max-w-[75%] sm:max-w-[70%] md:max-w-[65%]">
                                                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 md:px-5 md:py-4 shadow-md">
                                                        {streamingMessage ? (
                                                            <div className="text-sm md:text-base text-slate-800">
                                                                {streamingMessage}
                                                                <span className="inline-block w-0.5 h-4 md:h-5 bg-green-500 ml-1 animate-pulse">|</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                                                                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                                                                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                                                                <span className="text-xs text-slate-500 ml-2">AI is typing...</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div ref={conversationEndRef} />
                                    </div>
                                </div>

                                {/* Message Input - Enhanced Design */}
                                {!sessionFeedback && (
                                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl shadow-xl border border-slate-200/50 p-4 md:p-6">
                                        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                                            <div className="flex-1 relative">
                                                <input
                                                    type="text"
                                                    value={currentMessage}
                                                    onChange={(e) => setCurrentMessage(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && !isTyping && currentMessage.trim() && continueConversation(currentMessage)}
                                                    placeholder="Type your response here... (Press Enter to send)"
                                                    className="w-full px-4 md:px-5 py-3 md:py-4 text-sm md:text-base border-2 border-slate-200 rounded-xl md:rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 disabled:bg-slate-50 disabled:cursor-not-allowed"
                                                    disabled={isTyping}
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hidden sm:block">
                                                    Enter to send
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => continueConversation(currentMessage)}
                                                disabled={!currentMessage.trim() || isTyping}
                                                className="px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl md:rounded-2xl font-semibold hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 min-w-[100px] sm:min-w-[120px]"
                                            >
                                                {isTyping ? (
                                                    <>
                                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        <span className="hidden sm:inline">Sending...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                        </svg>
                                                        <span>Send</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2 text-center sm:text-left">
                                            💡 Tip: Be natural and detailed in your responses for better practice
                                        </p>
                                    </div>
                                )}

                                {/* Session Controls - Enhanced */}
                                {!sessionFeedback && (
                                    <div className="flex flex-col sm:flex-row justify-center items-center gap-3 md:gap-4">
                                        <button
                                            onClick={endRealtimeSession}
                                            disabled={isTyping}
                                            className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl md:rounded-2xl font-semibold hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            <span>End Session</span>
                                        </button>
                                        
                                        {/* Session Stats */}
                                        <div className="flex items-center gap-4 text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200">
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-500">●</span>
                                                <span>{conversationHistory.filter(m => m.role === 'user').length} messages</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Session Feedback - Enhanced */}
                                {sessionFeedback && (
                                    <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 rounded-2xl md:rounded-3xl border-2 border-green-200/50 p-6 md:p-8 shadow-xl">
                                        <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6">
                                            <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                                                <span className="text-3xl md:text-4xl">📊</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <h4 className="text-xl md:text-2xl font-bold text-slate-800">Session Summary</h4>
                                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Complete</span>
                                                </div>
                                                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-green-200/50">
                                                    <p className="text-slate-700 leading-relaxed text-sm md:text-base whitespace-pre-wrap">{sessionFeedback}</p>
                                                </div>
                                                <button
                                                    onClick={resetToModeSelection}
                                                    className="mt-4 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                                                >
                                                    Start New Session
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
        );
        return embedded ? realtimeModeContent : <AppLayout>{realtimeModeContent}</AppLayout>;
    }

    // Voice Conversation Mode
    if (selectedMode === 'voice') {
        const voiceModeContent = (
            <div className="space-y-8 p-4 md:p-6 lg:p-8 bg-gradient-to-br from-purple-50 via-white to-pink-50 min-h-screen">
                    {/* Header */}
                    {!embedded && (
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
                    )}

                    <div className="max-w-4xl mx-auto">
                        <Panel title="Real-time Voice Conversation" className="bg-white/80 backdrop-blur rounded-2xl shadow-md">
                            <VoiceConversation onEndSession={resetToModeSelection} />
                    </Panel>
                </div>
            </div>
        );
        return embedded ? voiceModeContent : <AppLayout>{voiceModeContent}</AppLayout>;
    }

    return null;
}