import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function VoiceConversation({ onEndSession }) {
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [currentMessage, setCurrentMessage] = useState('');
    const [conversationHistory, setConversationHistory] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const socketRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        // Initialize socket connection
        socketRef.current = io('http://localhost:5000');
        
        socketRef.current.on('connect', () => {
            console.log('🔌 Connected to voice server');
            setIsConnected(true);
        });
        
        socketRef.current.on('voice-response', (data) => {
            console.log('🎙️ Voice response received:', data);
            handleVoiceResponse(data);
        });
        
        socketRef.current.on('voice-error', (error) => {
            console.error('❌ Voice error:', error);
            setIsProcessing(false);
        });
        
        socketRef.current.on('disconnect', () => {
            console.log('🔌 Disconnected from voice server');
            setIsConnected(false);
        });
        
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
        } else if (data.type === 'ai-response') {
            setCurrentMessage(data.message);
            setConversationHistory(prev => [...prev, {
                role: 'examiner',
                content: data.message,
                timestamp: new Date()
            }]);
            setIsProcessing(false);
        } else if (data.type === 'session-ended') {
            setConversationHistory(prev => [...prev, {
                role: 'examiner',
                content: data.feedback,
                timestamp: new Date()
            }]);
            setIsProcessing(false);
        }
    };

    const startVoiceSession = async () => {
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            streamRef.current = stream;
            
            // Start WebSocket conversation
            socketRef.current.emit('voice-conversation', { type: 'start' });
            
        } catch (error) {
            console.error('❌ Error accessing microphone:', error);
            alert('Error accessing microphone. Please check your permissions.');
        }
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

    const sendAudioToServer = (audioBlob) => {
        // Convert blob to base64 for transmission
        const reader = new FileReader();
        reader.onload = () => {
            const base64Audio = reader.result.split(',')[1];
            
            // Add user message to conversation
            setConversationHistory(prev => [...prev, {
                role: 'user',
                content: '[Voice message]',
                timestamp: new Date()
            }]);
            
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
                    <div className="flex items-center space-x-4">
                        {!isRecording ? (
                            <button
                                onClick={startRecording}
                                disabled={isProcessing}
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
            </div>

            {/* Conversation History */}
            {conversationHistory.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 max-h-64 overflow-y-auto">
                    <h4 className="text-sm font-semibold text-slate-800 mb-3">Conversation History</h4>
                    <div className="space-y-3">
                        {conversationHistory.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                                        message.role === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-100 text-slate-800'
                                    }`}
                                >
                                    <p>{message.content}</p>
                                    <p className="text-xs opacity-70 mt-1">
                                        {message.role === 'user' ? 'You' : 'AI Examiner'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
