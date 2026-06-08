import React, { useState, useEffect, useRef } from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";
import { useAuth } from "../contexts/AuthContext";
import { getStorageKeyForModule } from "../services/progressService";
import {
    clearCachedGeneration,
    getCachedGeneration,
    saveCachedGeneration,
} from "../services/api/generationCacheApi";
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

export function SpeakingPracticeView({ embedded = false, onReady }) {
    const { user } = useAuth();
    const voiceConversationRef = useRef(null);
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
    
    // Real-time text mode state
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
    // Track recording duration so the server can enforce the
    // < 20s → max band 3 anti-cheating rule on the speaking evaluator.
    const recordingStartedAtRef = useRef(null);
    const recordingDurationRef = useRef(null);

    // When embedded (e.g. Full Test Simulator), signal ready so the parent can start the timer
    useEffect(() => {
        if (embedded && typeof onReady === "function") onReady();
    }, [embedded, onReady]);

    // Auto-scroll to bottom of conversation
    useEffect(() => {
        if (conversationEndRef.current) {
            conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [conversationHistory]);

    // Stop voice session when leaving voice mode or unmounting the page section.
    useEffect(() => {
        if (selectedMode !== 'voice') {
            voiceConversationRef.current?.stopSession?.();
        }
    }, [selectedMode]);

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

    /**
     * Speaking question loader with cache-first behaviour.
     *   force=false → return the cached question if one exists (default for
     *                 auto-loads), otherwise fetch a new one and cache it.
     *   force=true  → ignore cache, ask the API for a fresh question, and
     *                 overwrite the cache (used by the "New Question"
     *                 button = regenerate).
     */
    const loadRandomQuestion = async ({ force = false } = {}) => {
        try {
            setIsLoadingQuestion(true);

            if (!force) {
                const cached = await getCachedGeneration("speaking");
                if (cached?.question) {
                    setCurrentQuestion(cached.question);
                    return;
                }
            } else {
                await clearCachedGeneration("speaking");
            }

            const response = await fetch('https://ielts-coach-backend.onrender.com/api/speaking/question');
            const data = await response.json();

            const question = (data.success && data.question)
                ? data.question
                : "Describe a memorable journey you have taken. You should say where you went, how you traveled, what you saw and did, and explain why it was memorable.";

            setCurrentQuestion(question);
            // Cache only when we have a real API question (don't persist the
            // hard-coded fallback so we keep retrying real generation later).
            if (data.success && data.question) {
                saveCachedGeneration("speaking", { question });
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
                // Capture duration the moment the recorder stops; this is
                // sent with the audio so the server can apply the official
                // IELTS short-speech caps (< 20s → max band 3, etc.).
                if (recordingStartedAtRef.current) {
                    recordingDurationRef.current = Math.max(
                        0,
                        (Date.now() - recordingStartedAtRef.current) / 1000
                    );
                }
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                sendAudioForEvaluation(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorderRef.current = recorder;
            recordingStartedAtRef.current = Date.now();
            recordingDurationRef.current = null;
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
            if (recordingDurationRef.current != null) {
                // Server uses this to enforce the < 20s → max band 3 rule.
                formData.append('audioDurationSec', String(recordingDurationRef.current));
            }

            const response = await fetch('https://ielts-coach-backend.onrender.com/api/speaking/evaluate', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                setTranscript(data.transcript || '');
                if (data.noSpeech) {
                    setEvaluation({ _noSpeech: true, message: data.message || 'No speech detected. Please record your response and try again.' });
                } else {
                    setEvaluation(data.feedback);
                    // Save to localStorage only when we have AI evaluation (no static band)
                    const bandScore = typeof data.bandScore === 'number' && !Number.isNaN(data.bandScore)
                        ? data.bandScore
                        : parseFloat(String(data.feedback?.bandScore || '0').replace(/[^0-9.]/g, ''), 10) || 0;
                    const historyEntry = {
                        id: Date.now(),
                        question: currentQuestion,
                        transcript: data.transcript,
                        feedback: data.feedback,
                        bandScore,
                        submittedAt: new Date().toISOString(),
                        type: 'recorded_practice'
                    };
                    const userId = user?.email || user?.id || null;
                    const existingHistory = loadHistory(userId);
                    const updatedHistory = [historyEntry, ...existingHistory].slice(0, 20);
                    saveHistory(updatedHistory, userId);
                    window.dispatchEvent(new Event('progressUpdated'));
                }
            } else {
                console.error('Evaluation failed:', data.error);
                alert(data.error || 'Failed to evaluate your response. Please try again.');
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
            const response = await fetch('https://ielts-coach-backend.onrender.com/api/speaking/realtime/start', {
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
            
            const response = await fetch('https://ielts-coach-backend.onrender.com/api/speaking/realtime/continue', {
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

    // End real-time text session (chat mode)
    const endRealtimeSession = async () => {
        try {
            setIsTyping(true);
            const response = await fetch('https://ielts-coach-backend.onrender.com/api/speaking/realtime/end', {
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

                // Prefer numeric bandScore from API; fall back to parsing feedback if needed
                let bandScore = 0;
                if (typeof data.bandScore === "number" && !Number.isNaN(data.bandScore)) {
                    bandScore = data.bandScore;
                } else {
                    const bandScoreMatch = data.feedback?.match(/band\s*score[:\s]*([0-9.]+)/i);
                    bandScore = bandScoreMatch ? parseFloat(bandScoreMatch[1]) : 0;
                }

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
        // "New Question" button = regenerate: force a fresh question and
        // overwrite the cache. Pre-cached question is intentionally
        // discarded here.
        loadRandomQuestion({ force: true });
        setTimeLeft(120);
        setIsRecording(false);
        setEvaluation(null);
        setTranscript("");
    };

    // Auto-restore the user's saved question when they enter Record mode.
    // Cache-first; only calls OpenAI if no question is cached yet.
    useEffect(() => {
        if (selectedMode !== "record") return;
        if (currentQuestion || isLoadingQuestion) return;
        loadRandomQuestion();
        // loadRandomQuestion is stable enough for this flow; intentionally
        // not in the dep array to avoid an extra load.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMode]);

    const resetToModeSelection = () => {
        voiceConversationRef.current?.stopSession?.();
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
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="max-w-4xl w-full">
                        {/* Title */}
                        <div className="text-center mb-6 sm:mb-10 md:mb-12">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-blue-700 mb-2 sm:mb-4 break-words">
                                IELTS Speaking Practice
                            </h1>
                            <p className="text-base sm:text-lg md:text-xl text-slate-600">
                                Choose your practice mode to improve your speaking skills
                            </p>
                        </div>

                        {/* Mode Selection Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {/* Record & Submit Mode */}
                            <div 
                                className="bg-white rounded-2xl p-5 sm:p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-200"
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
                                className="bg-white rounded-2xl p-5 sm:p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-green-200"
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
                                className="bg-white rounded-2xl p-5 sm:p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-purple-200"
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
                                        Live voice IELTS Speaking test with Alex, your examiner. Official 3-part structure (Parts 1, 2, and 3) — practice only, no post-session feedback.
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
            <div className="space-y-6 sm:space-y-8 p-3 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen">
                    {/* Header */}
                    {!embedded && (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-blue-700 break-words">Record & Submit Practice</h1>
                                <p className="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-base">Record your response and get detailed AI feedback</p>
                            </div>
                            <button
                                onClick={resetToModeSelection}
                                className="self-start sm:self-auto px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 whitespace-nowrap"
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
                                        
                                        {/* No speech: message only (no band, no static evaluation) */}
                                        {evaluation._noSpeech ? (
                                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-2xl">🎤</span>
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-amber-800 mb-1">No speech detected</h4>
                                                        <p className="text-sm text-amber-700">{evaluation.message}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* AI Evaluation (only when we have real AI feedback) */
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
                                        )}
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
            <div className="space-y-6 sm:space-y-8 p-3 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-br from-green-50 via-white to-emerald-50 min-h-screen">
                    {/* Header */}
                    {!embedded && (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-green-700 break-words">Real-time Speaking Practice</h1>
                                <p className="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-base">Have a natural conversation with an AI IELTS examiner</p>
                            </div>
                            <button
                                onClick={resetToModeSelection}
                                className="self-start sm:self-auto px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                            >
                                ← Back to Modes
                            </button>
                        </div>
                    )}

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
        );
        return embedded ? realtimeModeContent : <AppLayout>{realtimeModeContent}</AppLayout>;
    }

    // Voice Conversation Mode
    if (selectedMode === 'voice') {
        const voiceModeContent = (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-3 sm:p-4 md:p-6 lg:p-8">
                {!embedded && (
                    <div className="max-w-3xl mx-auto mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-purple-800">IELTS Speaking — Live Voice</h1>
                            <p className="text-slate-600 mt-1 text-sm sm:text-base">
                                Official 3-part test with your AI examiner. No scores — just practice.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={resetToModeSelection}
                            className="self-start sm:self-auto px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-white whitespace-nowrap"
                        >
                            ← Back to Modes
                        </button>
                    </div>
                )}

                <div className="max-w-3xl mx-auto">
                    <VoiceConversation ref={voiceConversationRef} />
                </div>
            </div>
        );
        return embedded ? voiceModeContent : <AppLayout>{voiceModeContent}</AppLayout>;
    }

    return null;
}