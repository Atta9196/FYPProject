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
    const [realtimeTranscript, setRealtimeTranscript] = useState(''); // Real-time transcription as user speaks
    const [isStreamingMode, setIsStreamingMode] = useState(true); // Always use streaming mode
    const [voiceActivity, setVoiceActivity] = useState(false);
		const [volumeLevel, setVolumeLevel] = useState(0); // 0-100 live level for pronunciation/voice bar
		const [ieltsPart, setIeltsPart] = useState('Part 1');
		const examinerTurnsRef = useRef(0);
		const streamingAgentTextRef = useRef('');
    
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
    const processingTimeoutRef = useRef(null); // Timeout for processing response
    const lastAudioSentTimeRef = useRef(null); // Track when audio was last sent
    // Enable Realtime API by default for better experience, can be disabled via env var
    const useRealtime = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_USE_OPENAI_REALTIME !== 'false');

    useEffect(() => {
        // If using Realtime API, do NOT initialize socket (prevents two agents speaking)
        if (useRealtime) {
            return;
        }

        const SERVER_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SERVER_URL) || (typeof window !== 'undefined' && window.__SERVER_URL__) || 'http://localhost:5000';
        
        if (!socketRef.current) {
            console.log('🔌 Initializing Socket.io connection...');
            socketRef.current = io(SERVER_URL);
        }
        
        if (socketRef.current) {
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
                setIsRecording(false);
                
                if (processingTimeoutRef.current) {
                    clearTimeout(processingTimeoutRef.current);
                    processingTimeoutRef.current = null;
                }
                
                setCurrentMessage(`❌ Error: ${error.message || 'Unknown error occurred'}. Please try speaking again.`);
            });
            
            socketRef.current.on('disconnect', () => {
                console.log('🔌 Disconnected from voice server');
                setIsConnected(false);
            });
        }
        
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [useRealtime]);

    const handleVoiceResponse = (data) => {
        if (data.type === 'session-started') {
            setSessionId(data.sessionId);
            setCurrentMessage(data.message);
            setConversationHistory([{
                role: 'examiner',
                content: data.message,
                timestamp: new Date(),
                isAudio: true
            }]);
            
            // ALWAYS play AI greeting with voice (prefer audioData, fallback to TTS)
            if (data.audioData) {
                console.log('🔊 Playing AI greeting audio...');
                playAudioResponse(data.audioData);
            } else {
                console.log('🔊 Using TTS for AI greeting...');
                speakWithSpeechSynthesis(data.message);
            }
        } else if (data.type === 'ai-response') {
            // Clear processing timeout since we got a response
            if (processingTimeoutRef.current) {
                clearTimeout(processingTimeoutRef.current);
                processingTimeoutRef.current = null;
            }
            
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
                    timestamp: new Date(),
                    isAudio: true
                }
            ]);
            setIsProcessing(false);
            setIsRecording(false); // Make sure recording is stopped
            
            // ALWAYS play AI response with voice (prefer audioData, fallback to TTS)
            if (data.audioData) {
                console.log('🔊 Playing AI response audio...');
                playAudioResponse(data.audioData);
            } else {
                console.log('🔊 Using TTS for AI response...');
                speakWithSpeechSynthesis(data.message);
            }
        } else if (data.type === 'streaming-chunk') {
            // Handle realtime streaming chunks - accumulate and display as they arrive
            console.log('🔄 Received streaming chunk:', data.chunk);
            
            // Update current message with accumulated chunks
            setCurrentMessage(prev => {
                const newMessage = (prev || '') + data.chunk;
                return newMessage;
            });
            
            // Update user transcript if provided
            if (data.userTranscript) {
                setUserTranscript(data.userTranscript);
            }
            
            // Don't add to history yet - wait for complete response
        } else if (data.type === 'streaming-response') {
            // Clear processing timeout since we got a response
            if (processingTimeoutRef.current) {
                clearTimeout(processingTimeoutRef.current);
                processingTimeoutRef.current = null;
            }
            
            console.log('✅ Received complete streaming response from server:', data.message);
            
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
                    timestamp: new Date(),
                    isAudio: true
                }
            ]);
            setIsProcessing(false);
            
            // ALWAYS play AI response with voice (prefer audioData, fallback to TTS)
            if (data.audioData) {
                console.log('🔊 Playing streaming AI response audio...');
                playAudioResponse(data.audioData);
            } else {
                console.log('🔊 Using TTS for streaming AI response...');
                speakWithSpeechSynthesis(data.message);
            }
        } else if (data.type === 'session-ended') {
            setConversationHistory(prev => [...prev, {
                role: 'examiner',
                content: data.feedback,
                timestamp: new Date(),
                isAudio: true
            }]);
            setIsProcessing(false);
            
            // ALWAYS play session summary with voice (prefer audioData, fallback to TTS)
            if (data.audioData) {
                console.log('🔊 Playing session summary audio...');
                playAudioResponse(data.audioData);
            } else {
                console.log('🔊 Using TTS for session summary...');
                speakWithSpeechSynthesis(data.feedback);
            }
        }
    };

    const speakWithSpeechSynthesis = (text, onEndCallback) => {
        try {
            if (!('speechSynthesis' in window)) {
                console.warn('⚠️ SpeechSynthesis not available in this browser');
                return;
            }
            if (!text) {
                console.warn('⚠️ No text provided for TTS');
                return;
            }
            
            console.log('🔊 Using browser TTS to speak:', text.substring(0, 50) + '...');
            
            // Stop any ongoing speech first
            window.speechSynthesis.cancel();
            
            // Wait a moment for cancel to complete
            setTimeout(() => {
                const utter = new SpeechSynthesisUtterance(text);
                utter.lang = 'en-US';
                utter.rate = 1.0;
                utter.pitch = 1.0;
                utter.volume = 1.0;
                
                setIsPlaying(true);
                
                utter.onstart = () => {
                    console.log('🎵 TTS started speaking');
                };
                
                utter.onend = () => {
                    console.log('🎵 TTS finished speaking');
                    setIsPlaying(false);
                    if (typeof onEndCallback === 'function') {
                        try { onEndCallback(); } catch (cbErr) { console.warn('TTS onEnd callback error:', cbErr); }
                    }
                };
                
                utter.onerror = (e) => {
                    console.error('❌ TTS error:', e);
                    setIsPlaying(false);
                };
                
                window.speechSynthesis.speak(utter);
            }, 100);
        } catch (e) {
            console.error('❌ SpeechSynthesis failed:', e);
            setIsPlaying(false);
        }
    };

    const playAudioResponse = (audioBase64) => {
        try {
            if (!audioBase64) {
                console.warn('⚠️ No audio data provided, cannot play');
                return;
            }
            
            setIsPlaying(true);
            console.log('🔊 Playing AI audio response...', { audioLength: audioBase64.length });
            
            // Stop any currently playing audio first
            if (audioRef.current) {
                try {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                } catch (e) {
                    // Ignore errors
                }
            }
            
            // Convert base64 to audio blob
            let audioArray;
            try {
                const audioData = atob(audioBase64);
                audioArray = new Uint8Array(audioData.length);
                for (let i = 0; i < audioData.length; i++) {
                    audioArray[i] = audioData.charCodeAt(i);
                }
            } catch (error) {
                console.error('❌ Error decoding base64 audio:', error);
                setIsPlaying(false);
                return;
            }
            
            // Try different audio formats - MP3 is most common from OpenAI TTS
            const audioFormats = [
                { type: 'audio/mp3', blob: new Blob([audioArray], { type: 'audio/mp3' }) },
                { type: 'audio/mpeg', blob: new Blob([audioArray], { type: 'audio/mpeg' }) },
                { type: 'audio/wav', blob: new Blob([audioArray], { type: 'audio/wav' }) },
                { type: 'audio/webm', blob: new Blob([audioArray], { type: 'audio/webm' }) }
            ];
            
            const tryPlayAudio = (formatIndex = 0) => {
                if (formatIndex >= audioFormats.length) {
                    console.error('❌ All audio formats failed, falling back to TTS');
                    setIsPlaying(false);
                    // Fallback to TTS if audio playback fails
                    const message = currentMessage || conversationHistory[conversationHistory.length - 1]?.content;
                    if (message) {
                        speakWithSpeechSynthesis(message);
                    }
                    return;
                }
                
                const format = audioFormats[formatIndex];
                const audioUrl = URL.createObjectURL(format.blob);
                const audio = new Audio(audioUrl);
                
                // Store audio reference
                audioRef.current = audio;
                
                audio.onloadstart = () => {
                    console.log(`🎵 Audio loading started (${format.type})`);
                };
                
                audio.oncanplay = () => {
                    console.log(`🎵 Audio can play (${format.type})`);
                };
                
                audio.onplay = () => {
                    console.log(`🎵 Audio started playing (${format.type})`);
                    setIsPlaying(true);
                };
                
                audio.onended = () => {
                    console.log(`🎵 Audio finished playing (${format.type})`);
                    setIsPlaying(false);
                    URL.revokeObjectURL(audioUrl);
                    audioRef.current = null;
                };
                
                audio.onerror = (e) => {
                    console.error(`❌ Error playing audio (${format.type}):`, e);
                    URL.revokeObjectURL(audioUrl);
                    // Try next format
                    tryPlayAudio(formatIndex + 1);
                };
                
                // Add error handling for play promise
                audio.play().then(() => {
                    console.log(`✅ Audio playback started successfully (${format.type})`);
                }).catch(error => {
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
            // Fallback to TTS
            const message = currentMessage || conversationHistory[conversationHistory.length - 1]?.content;
            if (message) {
                speakWithSpeechSynthesis(message);
            }
        }
    };

    const startVoiceSession = async () => {
        try {
            if (useRealtime) {
                try {
                    // Realtime OpenAI: start WebRTC session
                    if (!realtimeRef.current) realtimeRef.current = createRealtimeAgent();
                    if (!realtimeAudioRef.current) realtimeAudioRef.current = new Audio();
                    
                // Set up audio element event handlers for real-time voice
                if (realtimeAudioRef.current) {
                    realtimeAudioRef.current.onplay = () => {
                        setIsPlaying(true);
                        console.log('🔊 AI is speaking in real-time...');
                        setCurrentMessage('🔊 AI is speaking...');
                    };
                    
                    realtimeAudioRef.current.onended = () => {
                        setIsPlaying(false);
                        console.log('🔊 AI finished speaking');
                        setCurrentMessage('✅ AI finished speaking. You can respond now.');
                    };
                    
                    realtimeAudioRef.current.onerror = (e) => {
                        console.error('❌ Audio playback error:', e);
                        setIsPlaying(false);
                    };
                    
                    realtimeAudioRef.current.onloadedmetadata = () => {
                        console.log('🎵 AI audio metadata loaded');
                    };
                    
                    realtimeAudioRef.current.oncanplay = () => {
                        console.log('🎵 AI audio can play');
                    };
                }
                    
                    await realtimeRef.current.start({
                        audioEl: realtimeAudioRef.current,
                        onConnected: () => {
                            setIsConnected(true);
                            setIsStreamingMode(true);
                            // Do NOT start listening yet; first play greeting + first question
                            setIsListening(false);
                            setIsRecording(false);

                            // Let Realtime model handle greeting/responding; do not speak locally to avoid double audio
                            setIsListening(true);
                            console.log('✅ Realtime API connected. Listening enabled; AI will speak via realtime audio.');
                        },
						onAgentMessage: ({ type, text, meta }) => {
							try {
								if (type === 'delta' && text) {
									// Accumulate streaming text from AI
                                    streamingAgentTextRef.current = (streamingAgentTextRef.current || '') + text;
									setCurrentMessage(prev => {
										const combined = (prev || '') + text;
										return combined;
									});
								} else if (type === 'done') {
									const final = (text && text.trim().length > 0) ? text.trim() : (streamingAgentTextRef.current || '').trim();
									if (final) {
										setConversationHistory(prev => ([
											...prev,
											{ role: 'examiner', content: final, timestamp: new Date(), isAudio: true }
										]));
										setCurrentMessage(final);
										// Heuristic fallback still available if model does not emit part.change
										examinerTurnsRef.current += 1;
									}
									// Reset accumulator
									streamingAgentTextRef.current = '';
								} else if (type === 'part') {
									if (meta && meta.part) {
										const p = meta.part === 1 ? 'Part 1' : meta.part === 2 ? 'Part 2' : 'Part 3';
										setIeltsPart(p);
										examinerTurnsRef.current = 0;
									}
								} else if (type === 'question') {
                                    if (text && text.trim()) {
										setCurrentMessage(text.trim());
										setConversationHistory(prev => ([
											...prev,
											{ role: 'examiner', content: text.trim(), timestamp: new Date(), isAudio: true }
										]));
									}
								}
							} catch (e) {
								console.warn('⚠️ onAgentMessage handling failed:', e);
							}
						},
						onFeedback: (fb) => {
							// Optional: wire into UI metrics (pronunciation/fluency/etc.)
							console.log('🎯 Inline feedback:', fb);
						},
                        onError: (e) => {
                            console.error('❌ Realtime start failed:', e);
                            setIsConnected(false);
                            setCurrentMessage(`❌ Connection failed: ${e.message}. Falling back to Socket.io mode...`);
                            throw e; // Re-throw to be caught by outer catch
                        },
                        onTranscriptionUpdate: (data) => {
                            // Handle real-time transcription updates
                            console.log('📝 Real-time transcription update:', data);
                            if (data.transcript) {
                                // Always update real-time transcript as user speaks
                                setRealtimeTranscript(data.transcript);
                                
                                // If transcription is complete, also save to userTranscript
                                if (data.isComplete) {
                                    setUserTranscript(data.transcript);
                                    // Keep realtime transcript visible for a moment, then clear
                                    setTimeout(() => {
                                        setRealtimeTranscript('');
                                    }, 2000);
                                }
                            } else if (data.isComplete) {
                                // If complete but no transcript, clear realtime
                                setRealtimeTranscript('');
                            }
                        },
                        maxDurationMs: 10 * 60 * 1000 // 10 minutes
                    });
                    setSessionId('realtime');
                    
                    return; // Success - exit function
                } catch (realtimeError) {
                    // If Realtime API fails, fall back to Socket.io mode
                    console.warn('⚠️ Realtime API failed, falling back to Socket.io mode:', realtimeError);
                    setCurrentMessage(`⚠️ Realtime API unavailable. Using Socket.io mode instead...`);
                    // Continue to Socket.io mode below
                }
            }
            
            // Check microphone permissions first (non-blocking)
            try {
                await checkMicrophonePermission();
            } catch (permError) {
                console.warn('⚠️ Permission check warning:', permError);
                // Continue anyway - getUserMedia will handle the actual permission
            }
            
            // Request microphone access (Socket.io fallback mode)
            console.log('🎤 Requesting microphone access...');
            
            // Check if getUserMedia is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.');
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            console.log('✅ Microphone access granted');
            
            streamRef.current = stream;
            
            // Setup audio context for voice activity detection
            setupVoiceActivityDetection(stream);
            
            // In streaming mode, start listening immediately
            if (isStreamingMode) {
                setIsListening(true);
                console.log('🎤 Streaming mode: Voice detection active, waiting for voice...');
            }
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
            if (!socketRef.current) {
                // Initialize socket if not already initialized
                const SERVER_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SERVER_URL) || (typeof window !== 'undefined' && window.__SERVER_URL__) || 'http://localhost:5000';
                socketRef.current = io(SERVER_URL);
                
                // Set up event handlers
                socketRef.current.on('connect', () => {
                    console.log('🔌 Socket connected');
                    setIsConnected(true);
                });
                
                socketRef.current.on('voice-response', (data) => {
                    handleVoiceResponse(data);
                });
                
                socketRef.current.on('voice-error', (error) => {
                    console.error('❌ Voice error:', error);
                    setIsProcessing(false);
                });
            }
            
            // Ensure socket is connected before sending
            if (!socketRef.current) {
                throw new Error('Socket.io connection not initialized');
            }
            
            // Wait for socket connection if not already connected
            if (!socketRef.current.connected) {
                console.log('⏳ Waiting for socket connection...');
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Socket connection timeout after 5 seconds'));
                    }, 5000);
                    
                    socketRef.current.once('connect', () => {
                        clearTimeout(timeout);
                        console.log('✅ Socket connected, proceeding...');
                        resolve();
                    });
                    
                    socketRef.current.once('connect_error', (error) => {
                        clearTimeout(timeout);
                        reject(new Error(`Socket connection failed: ${error.message}`));
                    });
                });
            }
            
            console.log('📤 Sending start request to server...');
            socketRef.current.emit('voice-conversation', { type: 'start' });
            
        } catch (error) {
            console.error('❌ Error accessing microphone:', error);
            
            // Handle different error types with detailed instructions
            let errorMessage = '';
            let detailedInstructions = '';
            
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage = 'Microphone permission was denied';
                detailedInstructions = 'To fix this:\n\n' +
                    '1. Click the lock icon (🔒) or info icon (ℹ️) in your browser address bar\n' +
                    '2. Find "Microphone" in the permissions list\n' +
                    '3. Change it from "Block" to "Allow"\n' +
                    '4. Reload this page (F5 or Ctrl+R)\n' +
                    '5. Click "Start Voice Conversation" again\n\n' +
                    'Alternative: Go to browser Settings → Privacy → Site Settings → Microphone → Add this site to allowed list';
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMessage = 'No microphone found';
                detailedInstructions = 'Please:\n\n' +
                    '1. Connect a microphone to your computer\n' +
                    '2. Make sure it\'s properly plugged in\n' +
                    '3. Check your system settings to verify the microphone is detected\n' +
                    '4. Try again';
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                errorMessage = 'Microphone is being used by another application';
                detailedInstructions = 'Please:\n\n' +
                    '1. Close other applications using the microphone:\n' +
                    '   - Zoom, Teams, Skype, Discord\n' +
                    '   - Other browser tabs with video/audio\n' +
                    '   - Screen recording software\n' +
                    '2. Wait a few seconds\n' +
                    '3. Try again';
            } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
                errorMessage = 'Microphone settings could not be satisfied';
                detailedInstructions = 'Please:\n\n' +
                    '1. Try a different microphone\n' +
                    '2. Check your microphone settings in system preferences\n' +
                    '3. Make sure the microphone is not muted\n' +
                    '4. Try again';
            } else if (error.message && error.message.includes('not supported')) {
                errorMessage = 'Browser not supported';
                detailedInstructions = 'Please use a modern browser:\n\n' +
                    '✅ Chrome (recommended)\n' +
                    '✅ Firefox\n' +
                    '✅ Edge\n' +
                    '✅ Safari (Mac)\n\n' +
                    'Make sure your browser is up to date.';
            } else {
                errorMessage = `Error: ${error.message || error.name || 'Unknown error'}`;
                detailedInstructions = 'Please try:\n\n' +
                    '1. Reload the page (F5 or Ctrl+R)\n' +
                    '2. Check your browser console for more details (F12)\n' +
                    '3. Make sure your browser is up to date\n' +
                    '4. Try a different browser';
            }
            
            setCurrentMessage(`❌ ${errorMessage}. Please check the instructions below.`);
            setIsConnected(false);
            
            // Show detailed error dialog with instructions
            setTimeout(() => {
                alert(`${errorMessage}\n\n${detailedInstructions}`);
            }, 100);
        }
    };
    
    // Check microphone permissions before starting (non-blocking)
    const checkMicrophonePermission = async () => {
        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('getUserMedia is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.');
        }
        
        // Try to query permissions (if supported) - this is just informational
        if (navigator.permissions && navigator.permissions.query) {
            try {
                const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
                console.log('🎤 Microphone permission status:', permissionStatus.state);
                
                if (permissionStatus.state === 'denied') {
                    console.warn('⚠️ Microphone permission is denied');
                    // Don't throw - let getUserMedia handle it with better error message
                }
            } catch (permError) {
                // Permission query not supported or failed, continue anyway
                console.log('ℹ️ Could not query permissions (this is normal in some browsers):', permError.message);
            }
        }
        
        return true;
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
        if (!analyserRef.current) {
            console.warn('⚠️ Analyser not available for voice detection');
            return;
        }
        
        // Cancel any existing detection loop
        if (voiceDetectionRef.current) {
            cancelAnimationFrame(voiceDetectionRef.current);
        }
        
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        let silenceCount = 0;
        let recordingStartTime = null; // Track when recording started for max time limit
        const SILENCE_THRESHOLD_FRAMES = 8; // Stop after 8 frames of silence (~0.2-0.3 seconds)
        
        const checkVoiceActivity = () => {
            if (!analyserRef.current) {
                return; // Stop if analyser is gone
            }
            
            analyserRef.current.getByteFrequencyData(dataArray);
            
            // Calculate average volume
            const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
            
            // Lower threshold for better sensitivity (adjust based on testing)
            const threshold = 20; // Lowered from 30 for better detection
            
            // Calculate peak volume for better detection
            const peak = Math.max(...dataArray);
            const isVoiceActive = average > threshold || peak > 40;
            
            setVoiceActivity(isVoiceActive);
			// Map peak to 0-100 for a smooth pronunciation/voice level bar
			const normalized = Math.min(100, Math.max(0, Math.round((peak / 255) * 100)));
			setVolumeLevel(normalized);
            
            // Always automatically start recording when voice is detected (streaming mode only)
            if (sessionId) {
                if (isVoiceActive && !isRecording && !isPlaying) {
                    console.log('🎤 Voice detected, starting streaming recording...', { average, peak });
                    silenceCount = 0;
                    recordingStartTime = Date.now(); // Track recording start time
                    startStreamingRecording();
                } else if (!isVoiceActive && isRecording) {
                    // Count silence frames - very quick response (shorter wait)
                    silenceCount++;
                    // Much reduced threshold for faster response (~0.2-0.3 seconds of silence)
                    const SILENCE_FRAMES_TO_STOP = 8; // ~0.2-0.3 seconds at 60fps for very quick response
                    
                    // Stop recording after silence threshold
                    if (silenceCount >= SILENCE_FRAMES_TO_STOP) {
                        console.log('🔇 Silence detected, stopping recording and sending audio immediately...', { 
                            silenceFrames: silenceCount,
                            audioChunks: audioChunksRef.current.length 
                        });
                        silenceCount = 0;
                        
                        if (mediaRecorderRef.current && isRecording) {
                            try {
                                // Request final data immediately before stopping
                                if (mediaRecorderRef.current.state === 'recording') {
                                    mediaRecorderRef.current.requestData();
                                }
                                
                                // Stop the recorder immediately - this will trigger onstop which sends the audio
                                mediaRecorderRef.current.stop();
                                setIsRecording(false);
                                setIsProcessing(true); // Show processing state immediately
                                setIsListening(true); // Keep listening for next voice
                                
                                console.log('✅ Recording stopped, sending audio to server immediately...');
                            } catch (e) {
                                console.error('❌ Error stopping recording:', e);
                                setIsRecording(false);
                                setIsProcessing(false);
                            }
                        }
                    }
                } else if (isVoiceActive && isRecording) {
                    // Reset silence counter when voice is active
                    silenceCount = 0;
                    
                    // Add maximum recording time limit (10 seconds) to prevent infinite recording
                    const MAX_RECORDING_TIME = 10000; // 10 seconds
                    if (!recordingStartTime) {
                        recordingStartTime = Date.now();
                    } else if (Date.now() - recordingStartTime > MAX_RECORDING_TIME) {
                        console.log('⏱️ Maximum recording time reached, stopping automatically...');
                        silenceCount = 0;
                        
                        if (mediaRecorderRef.current && isRecording) {
                            try {
                                if (mediaRecorderRef.current.state === 'recording') {
                                    mediaRecorderRef.current.requestData();
                                }
                                mediaRecorderRef.current.stop();
                                setIsRecording(false);
                                setIsProcessing(true);
                                setIsListening(true);
                                recordingStartTime = null;
                                console.log('✅ Recording stopped due to max time limit');
                            } catch (e) {
                                console.error('❌ Error stopping recording:', e);
                                setIsRecording(false);
                                setIsProcessing(false);
                                recordingStartTime = null;
                            }
                        }
                    }
                }
            }
            
            // Continue detection loop
            voiceDetectionRef.current = requestAnimationFrame(checkVoiceActivity);
        };
        
        console.log('🎤 Starting voice activity detection...');
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
                    // Always send chunks immediately for faster response (streaming mode)
                    sendStreamingAudio(event.data);
                }
            };
            
            mediaRecorder.onstop = async () => {
                console.log('🛑 MediaRecorder stopped, processing audio immediately...', {
                    chunks: audioChunksRef.current.length,
                    totalSize: audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)
                });
                
                // Streaming chunks are already being sent, but we should still send final audio if substantial
                if (audioChunksRef.current.length > 0) {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    
                    // Only send final audio if it's substantial (not just a tiny chunk)
                    // Streaming chunks are already being processed, so this is just for completeness
                    if (audioBlob.size > 2000) { // At least 2KB - substantial audio
                        console.log('📤 Sending final audio blob to server for processing...', { 
                            size: audioBlob.size,
                            type: audioBlob.type 
                        });
                        
                        // Send audio to server for processing
                        sendAudioToServer(audioBlob);
                    } else {
                        console.log('ℹ️ Audio blob small, streaming chunks already sent - skipping final send');
                        // Processing state is already set by streaming chunks
                    }
                    
                    // Clear chunks for next recording
                    audioChunksRef.current = [];
                } else {
                    console.warn('⚠️ No audio chunks to send');
                    setIsProcessing(false);
                }
                
                // Always keep listening (streaming mode)
                setIsListening(true);
            };
            
            mediaRecorder.start(200); // Collect data every 200ms for even faster streaming and quicker response
            setIsRecording(true);
            setIsListening(true);
            console.log('🎤 Recording started in streaming mode');
            
        } catch (error) {
            console.error('❌ Error starting streaming recording:', error);
        }
    };

    const sendStreamingAudio = (audioData) => {
        // Do not send streaming audio to server when using Realtime session
        if (!sessionId || sessionId === 'realtime') {
            console.warn('⚠️ No session ID for streaming audio');
            return;
        }
        
        if (!audioData || audioData.size === 0) {
            return; // Skip empty chunks
        }
        
        // Log when audio is being sent for debugging
        console.log('📤 Sending streaming audio chunk immediately...', {
            size: audioData.size,
            type: audioData.type,
            timestamp: new Date().toISOString()
        });
        
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const base64Audio = reader.result.split(',')[1];
                
                if (!base64Audio) {
                    console.warn('⚠️ Failed to convert streaming audio to base64');
                    return;
                }
                
                // Send streaming audio chunk immediately for faster response
                if (socketRef.current && socketRef.current.connected) {
                    socketRef.current.emit('voice-conversation', {
                        type: 'streaming-audio',
                        audioData: base64Audio,
                        sessionId: sessionId
                    });
                    
                    // Track when audio was sent
                    lastAudioSentTimeRef.current = Date.now();
                    
                    // Set processing state when we start sending chunks
                    if (!isProcessing) {
                        setIsProcessing(true);
                        
                        // Set timeout to force stop if no response after 15 seconds
                        if (processingTimeoutRef.current) {
                            clearTimeout(processingTimeoutRef.current);
                        }
                        processingTimeoutRef.current = setTimeout(() => {
                            console.error('⏱️ Timeout: No response from server after 15 seconds');
                            setCurrentMessage('⚠️ No response from server. Please try speaking again or restart the session.');
                            setIsProcessing(false);
                            setIsRecording(false);
                            setIsListening(true);
                            
                            // Force stop recording if still recording
                            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                                try {
                                    mediaRecorderRef.current.stop();
                                } catch (e) {
                                    console.error('❌ Error force stopping recording:', e);
                                }
                            }
                        }, 15000); // 15 second timeout
                    }
                } else {
                    console.error('❌ Socket not available or not connected for streaming audio');
                    setCurrentMessage('❌ Connection lost. Please refresh the page and try again.');
                    setIsProcessing(false);
                    setIsRecording(false);
                }
            } catch (error) {
                console.error('❌ Error sending streaming audio:', error);
            }
        };
        
        reader.onerror = (error) => {
            console.error('❌ Error reading streaming audio:', error);
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
        // Do not send final audio to server when using Realtime session
        if (!sessionId || sessionId === 'realtime') {
            console.error('❌ No session ID, cannot send audio');
            setIsProcessing(false);
            return;
        }
        
        // Check if blob is valid
        if (!audioBlob || audioBlob.size === 0) {
            console.warn('⚠️ Audio blob is empty, not sending');
            setIsProcessing(false);
            return;
        }
        
        console.log('📤 Preparing to send audio to server...', {
            size: audioBlob.size,
            type: audioBlob.type,
            sessionId: sessionId
        });
        
        // Convert blob to base64 for transmission
        const reader = new FileReader();
        
        reader.onload = () => {
            try {
                const base64Audio = reader.result.split(',')[1];
                
                if (!base64Audio) {
                    console.error('❌ Failed to convert audio to base64');
                    setIsProcessing(false);
                    return;
                }
                
                console.log('✅ Audio converted to base64, sending to server...', {
                    base64Length: base64Audio.length
                });
                
                setIsProcessing(true);
                
                // Send audio to server
                if (socketRef.current && socketRef.current.connected) {
                    socketRef.current.emit('voice-conversation', {
                        type: 'audio-chunk',
                        audioData: base64Audio,
                        sessionId: sessionId
                    });
                    console.log('✅ Audio sent to server via socket');
                } else {
                    console.error('❌ Socket not available or not connected');
                    setIsProcessing(false);
                }
            } catch (error) {
                console.error('❌ Error processing audio:', error);
                setIsProcessing(false);
            }
        };
        
        reader.onerror = (error) => {
            console.error('❌ Error reading audio blob:', error);
            setIsProcessing(false);
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
        
        // Only notify server if not in Realtime mode
        if (socketRef.current && sessionId !== 'realtime') {
            socketRef.current.emit('voice-conversation', { type: 'end', sessionId });
        }
        
        setIsRecording(false);
        setIsListening(false);
        setIsProcessing(false);
        // Always keep streaming mode enabled
        setVoiceActivity(false);
    };

    return (
        <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} ${isConnected ? 'animate-pulse' : ''}`}></div>
                <span className="text-sm text-slate-600">
                    {isConnected 
                        ? (useRealtime && sessionId === 'realtime'
                            ? '✅ Connected via Realtime API'
                            : socketRef.current?.connected
                                ? '✅ Connected to voice server'
                                : '⚠️ Connection issue - check console')
                        : 'Connecting...'}
                </span>
            </div>

            {/* Mode Indicator - Always Streaming */}
            {sessionId && (
                <div className="flex flex-col items-center space-y-2">
                    <div className="flex items-center justify-center space-x-3">
                        <span className="text-sm text-slate-600">Mode:</span>
                        {useRealtime && sessionId === 'realtime' ? (
                            // Realtime API mode
                            <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                🚀 Realtime API (Best Experience)
                            </div>
                        ) : (
                            // Streaming mode only
                            <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                🎙️ Live Streaming
                            </div>
                        )}
                        <span className="text-xs text-slate-500">
                            {useRealtime && sessionId === 'realtime' 
                                ? 'AI understands and responds in real-time' 
                                : 'Speak naturally - AI detects your voice automatically'}
                        </span>
                    </div>
					{/* IELTS Part Indicator */}
					<div className="flex items-center space-x-2">
						<span className="text-xs text-slate-600">Current Section:</span>
						<span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
							ieltsPart === 'Part 1' ? 'bg-sky-50 text-sky-700 border-sky-200'
							: ieltsPart === 'Part 2' ? 'bg-amber-50 text-amber-700 border-amber-200'
							: 'bg-violet-50 text-violet-700 border-violet-200'
						}`}>
							{ieltsPart}
						</span>
					</div>
                </div>
            )}

            {/* Current Message Display */}
            {currentMessage && (
                <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-slate-200 p-6 shadow-sm ${isPlaying ? 'ring-2 ring-green-400' : ''}`}>
                    <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPlaying ? 'bg-green-100 animate-pulse' : 'bg-blue-100'}`}>
                            <span className={`text-lg ${isPlaying ? 'text-green-600' : 'text-blue-600'}`}>
                                {isPlaying ? '🔊' : '🎙️'}
                            </span>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-sm font-semibold text-slate-800">AI Examiner:</h4>
                                {isPlaying && (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium animate-pulse">
                                        🔊 Speaking...
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-700 leading-relaxed">{currentMessage}</p>
                            {!isPlaying && !isProcessing && (
                                <p className="text-xs text-slate-500 mt-2 italic">
                                    (Audio response will play automatically)
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Real-time Transcription Display - Shows as user speaks */}
            {realtimeTranscript && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-300 p-4 shadow-md animate-pulse">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center animate-pulse">
                            <span className="text-blue-600 text-sm">🎤</span>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-xs font-semibold text-blue-800">Speaking...</h4>
                                <div className="flex space-x-1">
                                    <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                    <div className="w-1 h-4 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                                    <div className="w-1 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                    <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
                                    <div className="w-1 h-4 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-blue-200">
                                <p className="text-slate-800 text-sm leading-relaxed font-medium">"{realtimeTranscript}"</p>
                            </div>
                            <p className="text-xs text-blue-600 mt-2 italic">Real-time transcription...</p>
                        </div>
                    </div>
                </div>
            )}

            {/* User Transcript Display - Shows final transcript after speaking */}
            {userTranscript && !realtimeTranscript && (
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

			{/* Realtime pronunciation/voice level bar */}
			<div className="mt-4">
				<div className="flex items-center justify-between mb-1">
					<span className="text-xs font-medium text-slate-600">Realtime voice level</span>
					<span className="text-xs text-slate-500">{volumeLevel}%</span>
				</div>
				<div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
					<div
						className="h-2 rounded-full transition-all duration-100"
						style={{
							width: `${volumeLevel}%`,
							background: volumeLevel > 70 ? '#22c55e' : volumeLevel > 40 ? '#eab308' : '#94a3b8'
						}}
					></div>
				</div>
				<p className="text-[11px] text-slate-500 mt-1">Speaks louder/clearer = higher bar. This is not an official pronunciation score.</p>
			</div>

            {/* Microphone Permission Help */}
            {currentMessage && currentMessage.includes('Microphone permission') && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                    <h4 className="font-semibold text-yellow-800 mb-2">📋 How to Enable Microphone Access:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
                        <li>Look for the lock icon (🔒) or info icon (ℹ️) in your browser's address bar</li>
                        <li>Click on it to open site permissions</li>
                        <li>Find "Microphone" in the list</li>
                        <li>Change it from "Block" to "Allow"</li>
                        <li>Reload this page (F5 or Ctrl+R)</li>
                        <li>Click "Start Voice Conversation" again</li>
                    </ol>
                </div>
            )}

            {/* Voice Controls */}
            <div className="flex flex-col items-center space-y-4">
                {!sessionId ? (
                    <button
                        onClick={startVoiceSession}
                        disabled={!isConnected && !useRealtime}
                        className="px-8 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        <span className="text-2xl">🎙️</span>
                        <span>Start Voice Conversation</span>
                    </button>
                ) : useRealtime && sessionId === 'realtime' && realtimeAudioRef.current && realtimeAudioRef.current.paused ? (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                            <p className="text-yellow-800 text-sm font-medium mb-2">🔊 Audio Playback Blocked</p>
                            <p className="text-yellow-700 text-xs mb-3">Your browser requires user interaction to start audio playback.</p>
                            <button
                                onClick={() => {
                                    if (realtimeAudioRef.current) {
                                        realtimeAudioRef.current.play()
                                            .then(() => {
                                                console.log('✅ Audio playback started after user click');
                                                setIsPlaying(true);
                                            })
                                            .catch(e => {
                                                console.error('❌ Failed to start audio:', e);
                                                alert('Failed to start audio playback. Please check your browser settings.');
                                            });
                                    }
                                }}
                                className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 text-sm"
                            >
                                🔊 Click to Start Audio
                            </button>
                        </div>
                        <button
                            onClick={endVoiceSession}
                            className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 flex items-center space-x-2"
                        >
                            <span className="text-xl">🏁</span>
                            <span>End Session</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="text-center">
                            <div className="text-lg font-semibold text-slate-700 mb-2">
                                {useRealtime && realtimeRef.current ? '📞 Real-Time Voice Call Active' : '🎙️ Live Streaming Mode Active'}
                            </div>
                            <div className="text-sm text-slate-600 mb-4">
                                {useRealtime && realtimeRef.current ? 
                                    'This works like a phone call - speak naturally and the AI will automatically detect your voice and respond. You can interrupt the AI anytime by speaking.' :
                                    'Just speak naturally - the AI will detect your voice and respond automatically'
                                }
                            </div>
                            <div className={`px-4 py-2 rounded-lg ${voiceActivity ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {useRealtime && realtimeRef.current ? (
                                    isPlaying ? '🔊 AI is speaking...' : 
                                    voiceActivity ? '🎤 You are speaking...' : 
                                    '👂 Listening... (Speak naturally - AI will respond automatically)'
                                ) : (
                                    voiceActivity ? '🎤 Voice Detected - Recording...' : '🔇 Waiting for voice...'
                                )}
                            </div>
                        </div>
                        
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
                    {useRealtime && realtimeRef.current ? (
                        <>
                            <div className={`w-3 h-3 rounded-full ${isPlaying ? 'bg-blue-500 animate-pulse' : voiceActivity ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                            <span className="text-sm text-slate-600">
                                {isPlaying ? 'AI Speaking...' : voiceActivity ? 'You Speaking...' : 'Listening...'}
                            </span>
                        </>
                    ) : (
                        <>
                            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
                            <span className="text-sm text-slate-600">
                                {isRecording ? 'Recording...' : 'Not Recording'}
                            </span>
                        </>
                    )}
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
