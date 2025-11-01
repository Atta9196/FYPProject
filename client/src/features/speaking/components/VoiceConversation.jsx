import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { createRealtimeAgent } from '../realtime/useRealtimeOpenAI';

export function VoiceConversation({ onEndSession }) {
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [currentMessage, setCurrentMessage] = useState('');
    const [conversationHistory, setConversationHistory] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [userTranscript, setUserTranscript] = useState('');
    const [isStreamingMode, setIsStreamingMode] = useState(false);
    const [voiceActivity, setVoiceActivity] = useState(false);
    
    const socketRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);
    const audioRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const voiceDetectionRef = useRef(null);
    const streamingIntervalRef = useRef(null);
    const realtimeRef = useRef(null);
    const realtimeAudioRef = useRef(null);
    const useRealtime = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_USE_OPENAI_REALTIME === 'true');

    useEffect(() => {
        // Initialize socket connection using env-configured URL (for chained mode)
        if (!useRealtime) {
            const SERVER_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SERVER_URL) || (typeof window !== 'undefined' && window.__SERVER_URL__) || 'http://localhost:5000';
            socketRef.current = io(SERVER_URL);
        }
        
        if (!useRealtime && socketRef.current) {
            socketRef.current.on('connect', () => {
                console.log('🔌 Connected to voice server');
                setIsConnected(true);
            });
        } else if (useRealtime) {
            setIsConnected(true);
        }
        
        if (!useRealtime && socketRef.current) {
            socketRef.current.on('voice-response', (data) => {
                console.log('🎙️ Voice response received:', data);
                handleVoiceResponse(data);
            });
        }
        
        if (!useRealtime && socketRef.current) {
            socketRef.current.on('voice-error', (error) => {
                console.error('❌ Voice error:', error);
                setIsProcessing(false);
            });
        }
        
        if (!useRealtime && socketRef.current) {
            socketRef.current.on('disconnect', () => {
                console.log('🔌 Disconnected from voice server');
                setIsConnected(false);
            });
        }
        
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const handleVoiceResponse = (data) => {
        if (data.type === 'session-started') {
            setSessionId(data.sessionId);
            setCurrentMessage(data.message);
            setConversationHistory([{
                role: 'examiner',
                content: data.message,
                timestamp: new Date()
            }]);
            
            // Play AI greeting if audio is available
            if (data.audioData) {
                playAudioResponse(data.audioData);
            } else {
                speakWithSpeechSynthesis(data.message);
            }
        } else if (data.type === 'ai-response') {
            setCurrentMessage(data.message);
            setUserTranscript(data.userTranscript || '');
            setConversationHistory(prev => [
                ...prev, 
                {
                    role: 'user',
                    content: data.userTranscript || '[Voice message]',
                    timestamp: new Date()
                },
                {
                    role: 'examiner',
                    content: data.message,
                    timestamp: new Date()
                }
            ]);
            setIsProcessing(false);
            
            // Play AI response if audio is available
            if (data.audioData) {
                playAudioResponse(data.audioData);
            } else {
                speakWithSpeechSynthesis(data.message);
            }
        } else if (data.type === 'streaming-response') {
            setCurrentMessage(data.message);
            setUserTranscript(data.userTranscript || '');
            setConversationHistory(prev => [
                ...prev, 
                {
                    role: 'user',
                    content: data.userTranscript || '[Voice message]',
                    timestamp: new Date()
                },
                {
                    role: 'examiner',
                    content: data.message,
                    timestamp: new Date()
                }
            ]);
            setIsProcessing(false);
            
            // Play AI response if audio is available
            if (data.audioData) {
                playAudioResponse(data.audioData);
            } else {
                speakWithSpeechSynthesis(data.message);
            }
        } else if (data.type === 'session-ended') {
            setConversationHistory(prev => [...prev, {
                role: 'examiner',
                content: data.feedback,
                timestamp: new Date()
            }]);
            setIsProcessing(false);
            
            // Play session summary if audio is available
            if (data.audioData) {
                playAudioResponse(data.audioData);
            } else {
                speakWithSpeechSynthesis(data.feedback);
            }
        }
    };

    const speakWithSpeechSynthesis = (text) => {
        try {
            if (!('speechSynthesis' in window)) return;
            if (!text) return;
            // Stop any ongoing speech first
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = 'en-US';
            utter.rate = 1.0;
            utter.pitch = 1.0;
            setIsPlaying(true);
            utter.onend = () => setIsPlaying(false);
            utter.onerror = () => setIsPlaying(false);
            window.speechSynthesis.speak(utter);
        } catch (e) {
            console.warn('⚠️ SpeechSynthesis fallback failed:', e);
            setIsPlaying(false);
        }
    };

    const playAudioResponse = (audioBase64) => {
        try {
            setIsPlaying(true);
            console.log('🔊 Playing AI audio response...');
            
            // Convert base64 to audio blob
            const audioData = atob(audioBase64);
            const audioArray = new Uint8Array(audioData.length);
            for (let i = 0; i < audioData.length; i++) {
                audioArray[i] = audioData.charCodeAt(i);
            }
            
            // Try different audio formats
            const audioFormats = [
                { type: 'audio/mp3', blob: new Blob([audioArray], { type: 'audio/mp3' }) },
                { type: 'audio/mpeg', blob: new Blob([audioArray], { type: 'audio/mpeg' }) },
                { type: 'audio/wav', blob: new Blob([audioArray], { type: 'audio/wav' }) }
            ];
            
            const tryPlayAudio = (formatIndex = 0) => {
                if (formatIndex >= audioFormats.length) {
                    console.error('❌ All audio formats failed');
                    setIsPlaying(false);
                    return;
                }
                
                const format = audioFormats[formatIndex];
                const audioUrl = URL.createObjectURL(format.blob);
                const audio = new Audio(audioUrl);
                
                audio.onloadstart = () => {
                    console.log(`🎵 Audio loading started (${format.type})`);
                };
                
                audio.oncanplay = () => {
                    console.log(`🎵 Audio can play (${format.type})`);
                };
                
                audio.onplay = () => {
                    console.log(`🎵 Audio started playing (${format.type})`);
                };
                
                audio.onended = () => {
                    console.log(`🎵 Audio finished playing (${format.type})`);
                    setIsPlaying(false);
                    URL.revokeObjectURL(audioUrl);
                };
                
                audio.onerror = (e) => {
                    console.error(`❌ Error playing audio (${format.type}):`, e);
                    URL.revokeObjectURL(audioUrl);
                    // Try next format
                    tryPlayAudio(formatIndex + 1);
                };
                
                // Add error handling for play promise
                audio.play().catch(error => {
                    console.error(`❌ Error starting audio playback (${format.type}):`, error);
                    URL.revokeObjectURL(audioUrl);
                    // Try next format
                    tryPlayAudio(formatIndex + 1);
                });
            };
            
            tryPlayAudio();
            
        } catch (error) {
            console.error('❌ Error playing audio:', error);
            setIsPlaying(false);
        }
    };

    const startVoiceSession = async () => {
        try {
            if (useRealtime) {
                // Realtime OpenAI: start WebRTC session
                if (!realtimeRef.current) realtimeRef.current = createRealtimeAgent();
                if (!realtimeAudioRef.current) realtimeAudioRef.current = new Audio();
                await realtimeRef.current.start({
                    audioEl: realtimeAudioRef.current,
                    onConnected: () => setIsConnected(true),
                    onError: (e) => {
                        console.error('❌ Realtime start failed:', e);
                        setIsConnected(false);
                    },
                    maxDurationMs: 2 * 60 * 1000
                });
                setSessionId('realtime');
                setCurrentMessage('🎧 Realtime voice connected. You can start speaking.');
                setIsStreamingMode(true);
                return;
            }
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            streamRef.current = stream;
            
            // Setup audio context for voice activity detection
            setupVoiceActivityDetection(stream);
            // Ensure AudioContext is resumed on user gesture for autoplay policies
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                try {
                    await audioContextRef.current.resume();
                } catch (e) {
                    console.warn('⚠️ Could not resume AudioContext:', e);
                }
            }
            // Create a short silent buffer to unlock audio on some browsers
            try {
                const ctx = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
                const buffer = ctx.createBuffer(1, 1, 22050);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                source.start(0);
            } catch (e) {
                console.warn('⚠️ Silent unlock playback failed:', e);
            }
            
            // Start WebSocket conversation
            socketRef.current.emit('voice-conversation', { type: 'start' });
            
        } catch (error) {
            console.error('❌ Error accessing microphone:', error);
            alert('Error accessing microphone. Please check your permissions.');
        }
    };

    const setupVoiceActivityDetection = (stream) => {
        try {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            
            analyserRef.current.fftSize = 256;
            analyserRef.current.smoothingTimeConstant = 0.8;
            source.connect(analyserRef.current);
            
            // Start voice activity detection
            detectVoiceActivity();
        } catch (error) {
            console.error('❌ Error setting up voice detection:', error);
        }
    };

    const detectVoiceActivity = () => {
        if (!analyserRef.current) return;
        
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const checkVoiceActivity = () => {
            analyserRef.current.getByteFrequencyData(dataArray);
            
            // Calculate average volume
            const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
            const threshold = 30; // Adjust this value based on testing
            
            const isVoiceActive = average > threshold;
            setVoiceActivity(isVoiceActive);
            
            // If voice detected and not already recording, start streaming
            if (isVoiceActive && !isRecording && !isPlaying) {
                startStreamingRecording();
            }
            
            voiceDetectionRef.current = requestAnimationFrame(checkVoiceActivity);
        };
        
        checkVoiceActivity();
    };

    const startStreamingRecording = () => {
        if (!streamRef.current || isRecording) return;
        
        try {
            const mediaRecorder = new MediaRecorder(streamRef.current, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    // Send audio chunks immediately for streaming
                    sendStreamingAudio(event.data);
                }
            };
            
            mediaRecorder.onstop = () => {
                // Final audio processing
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                sendAudioToServer(audioBlob);
            };
            
            mediaRecorder.start(500); // Collect data every 500ms for faster streaming
            setIsRecording(true);
            setIsListening(true);
            
        } catch (error) {
            console.error('❌ Error starting streaming recording:', error);
        }
    };

    const sendStreamingAudio = (audioData) => {
        if (!sessionId) return;
        
        const reader = new FileReader();
        reader.onload = () => {
            const base64Audio = reader.result.split(',')[1];
            
            // Send streaming audio chunk
            socketRef.current.emit('voice-conversation', {
                type: 'streaming-audio',
                audioData: base64Audio,
                sessionId: sessionId
            });
        };
        reader.readAsDataURL(audioData);
    };

    const startRecording = () => {
        if (!streamRef.current) return;
        
        try {
            const mediaRecorder = new MediaRecorder(streamRef.current, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                sendAudioToServer(audioBlob);
            };
            
            mediaRecorder.start(1000); // Collect data every second
            setIsRecording(true);
            setIsListening(true);
            
        } catch (error) {
            console.error('❌ Error starting recording:', error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsListening(false);
        }
    };

    const stopStreamingRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsListening(false);
        }
    };

    const sendAudioToServer = (audioBlob) => {
        // Convert blob to base64 for transmission
        const reader = new FileReader();
        reader.onload = () => {
            const base64Audio = reader.result.split(',')[1];
            
            setIsProcessing(true);
            
            // Send audio to server
            socketRef.current.emit('voice-conversation', {
                type: 'audio-chunk',
                audioData: base64Audio,
                sessionId: sessionId
            });
        };
        reader.readAsDataURL(audioBlob);
    };

    const endVoiceSession = () => {
        if (useRealtime && realtimeRef.current) {
            realtimeRef.current.stop().catch(() => {});
        }
        // Stop voice activity detection
        if (voiceDetectionRef.current) {
            cancelAnimationFrame(voiceDetectionRef.current);
        }
        
        // Stop streaming interval
        if (streamingIntervalRef.current) {
            clearInterval(streamingIntervalRef.current);
        }
        
        // Close audio context
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        if (socketRef.current) {
            socketRef.current.emit('voice-conversation', { 
                type: 'end',
                sessionId: sessionId 
            });
        }
        
        setIsRecording(false);
        setIsListening(false);
        setIsProcessing(false);
        setIsStreamingMode(false);
        setVoiceActivity(false);
    };

    return (
        <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-slate-600">
                    {isConnected ? 'Connected to voice server' : 'Connecting...'}
                </span>
            </div>

            {/* Streaming Mode Toggle */}
            <div className="flex items-center justify-center space-x-3">
                <span className="text-sm text-slate-600">Mode:</span>
                <button
                    onClick={() => setIsStreamingMode(!isStreamingMode)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        isStreamingMode 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                >
                    {isStreamingMode ? '🎙️ Live Streaming' : '⏸️ Manual'}
                </button>
                <span className="text-xs text-slate-500">
                    {isStreamingMode ? 'Speak naturally - AI detects your voice' : 'Click to speak'}
                </span>
            </div>

            {/* Current Message Display */}
            {currentMessage && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 text-lg">🎙️</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-slate-800 mb-2">AI Examiner:</h4>
                            <p className="text-slate-700 leading-relaxed">{currentMessage}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* User Transcript Display */}
            {userTranscript && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-green-600 text-sm">👤</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-xs font-semibold text-slate-800 mb-1">You said:</h4>
                            <p className="text-slate-700 text-sm leading-relaxed italic">"{userTranscript}"</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Voice Activity Indicator */}
            <div className="flex items-center justify-center space-x-4">
                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`}></div>
                    <span className="text-sm text-slate-600">
                        {isListening ? 'Listening...' : 'Not listening'}
                    </span>
                </div>

                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`}></div>
                    <span className="text-sm text-slate-600">
                        {isProcessing ? 'Processing...' : 'Ready'}
                    </span>
                </div>

                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${voiceActivity ? 'bg-purple-500 animate-pulse' : 'bg-gray-300'}`}></div>
                    <span className="text-sm text-slate-600">
                        {voiceActivity ? 'Voice Detected' : 'No Voice'}
                    </span>
                </div>

                <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm font-medium ${isPlaying ? 'text-green-600' : 'text-slate-600'}`}>
                        {isPlaying ? '🎵 AI Speaking...' : '🔇 Silent'}
                    </span>
                    {isPlaying && (
                        <div className="flex space-x-1">
                            <div className="w-1 h-3 bg-green-500 animate-pulse"></div>
                            <div className="w-1 h-4 bg-green-500 animate-pulse" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-1 h-2 bg-green-500 animate-pulse" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-1 h-3 bg-green-500 animate-pulse" style={{animationDelay: '0.3s'}}></div>
                        </div>
                    )}
                </div>
            </div>

            {/* Voice Controls */}
            <div className="flex flex-col items-center space-y-4">
                {!sessionId ? (
                    <button
                        onClick={startVoiceSession}
                        disabled={!isConnected}
                        className="px-8 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        <span className="text-2xl">🎙️</span>
                        <span>Start Voice Conversation</span>
                    </button>
                ) : (
                    <div className="flex flex-col items-center space-y-4">
                        {isStreamingMode ? (
                            <div className="text-center">
                                <div className="text-lg font-semibold text-slate-700 mb-2">
                                    🎙️ Live Streaming Mode Active
                                </div>
                                <div className="text-sm text-slate-600 mb-4">
                                    Just speak naturally - the AI will detect your voice and respond automatically
                                </div>
                                <div className={`px-4 py-2 rounded-lg ${voiceActivity ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {voiceActivity ? '🎤 Voice Detected - Recording...' : '🔇 Waiting for voice...'}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-4">
                                {!isRecording ? (
                                    <button
                                        onClick={startRecording}
                                        disabled={isProcessing || isPlaying}
                                        className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                                    >
                                        <span className="text-xl">🎤</span>
                                        <span>Start Speaking</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={stopRecording}
                                        className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 flex items-center space-x-2"
                                    >
                                        <span className="text-xl">⏹️</span>
                                        <span>Stop Speaking</span>
                                    </button>
                                )}
                            </div>
                        )}
                        
                        <button
                            onClick={endVoiceSession}
                            className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 flex items-center space-x-2"
                        >
                            <span className="text-xl">🏁</span>
                            <span>End Session</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Status Indicators */}
            <div className="flex justify-center space-x-6">
                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
                    <span className="text-sm text-slate-600">
                        {isRecording ? 'Recording...' : 'Not Recording'}
                    </span>
                </div>
                
                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`}></div>
                    <span className="text-sm text-slate-600">
                        {isProcessing ? 'Processing...' : 'Ready'}
                    </span>
                </div>

                <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm font-medium ${isPlaying ? 'text-green-600' : 'text-slate-600'}`}>
                        {isPlaying ? '🎵 AI Speaking...' : '🔇 Silent'}
                    </span>
                    {isPlaying && (
                        <div className="flex space-x-1">
                            <div className="w-1 h-3 bg-green-500 animate-pulse"></div>
                            <div className="w-1 h-4 bg-green-500 animate-pulse" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-1 h-2 bg-green-500 animate-pulse" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-1 h-3 bg-green-500 animate-pulse" style={{animationDelay: '0.3s'}}></div>
                        </div>
                    )}
                </div>
            </div>

            {/* Enhanced Conversation History */}
            {conversationHistory.length > 0 && (
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 p-4 max-h-64 overflow-y-auto shadow-sm">
                    <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Live Conversation
                    </h4>
                    <div className="space-y-3">
                        {conversationHistory.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-xs px-4 py-3 rounded-xl text-sm shadow-sm ${
                                        message.role === 'user'
                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                                            : 'bg-gradient-to-r from-slate-50 to-white text-slate-800 border border-slate-200'
                                    }`}
                                >
                                    <div className="flex items-start gap-2">
                                        {message.role === 'examiner' && (
                                            <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                                                AI
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <p className="leading-relaxed">{message.content}</p>
                                            <p className={`text-xs mt-2 ${
                                                message.role === 'user' ? 'text-blue-100' : 'text-slate-500'
                                            }`}>
                                                {message.role === 'user' ? 'You' : 'AI Examiner'} • {message.timestamp?.toLocaleTimeString()}
                                            </p>
                                        </div>
                                        {message.role === 'user' && (
                                            <div className="w-5 h-5 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                                                You
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
