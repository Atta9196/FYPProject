import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { io } from 'socket.io-client';
import { createRealtimeAgent } from '../realtime/useRealtimeOpenAI';

export const VoiceConversation = forwardRef(function VoiceConversation({ onEndSession }, ref) {
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
		const [isMuted, setIsMuted] = useState(false); // mic mute toggle (realtime mode)
		const [statusBanner, setStatusBanner] = useState(''); // ephemeral status line
    const [isEnding, setIsEnding] = useState(false); // double-click guard for End
    const [sessionEnded, setSessionEnded] = useState(false);
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
    // Total time (seconds) the candidate spent actually speaking during this
    // realtime session. Computed from server-VAD speech-started/stopped events.
    // Sent to /realtime/end so the scoring service can enforce the < 20s and
    // < 30 word caps fairly (was missing before — that's how "2 words → band 7"
    // slipped through).
    const userSpeakingDurationRef = useRef(0);
    const userSpeechStartedAtRef = useRef(null);
    // ── Backup recording for guaranteed transcription ────────────────
    // OpenAI's Realtime API sometimes fails to deliver Whisper transcripts
    // through the data channel (events go missing, network blips, model
    // session race conditions). To make sure scoring never reports
    // "0 spoken words" when the user actually spoke, we record the SAME
    // microphone stream in parallel via MediaRecorder, then on End we
    // transcribe the full local audio through /api/speaking/exam/transcribe
    // (existing Whisper endpoint) and use it as a fallback transcript.
    const backupRecorderRef = useRef(null);
    const backupChunksRef = useRef([]);
    const backupStartedAtRef = useRef(null);
    const backupBlobReadyRef = useRef(null); // resolves to final Blob
    // Enable Realtime API by default for better experience, can be disabled via env var
    const useRealtime = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_USE_OPENAI_REALTIME !== 'false');

    const sessionIdRef = useRef(null);
    sessionIdRef.current = sessionId;

    const hardStopSession = useCallback(() => {
        try {
            if (realtimeRef.current?.interrupt) realtimeRef.current.interrupt();
        } catch {}
        try {
            if (realtimeRef.current?.stop) {
                const p = realtimeRef.current.stop();
                if (p?.catch) p.catch(() => {});
            }
        } catch {}
        realtimeRef.current = null;

        const killAudio = (audioRefObj) => {
            if (!audioRefObj?.current) return;
            try {
                audioRefObj.current.pause();
                audioRefObj.current.srcObject = null;
                audioRefObj.current.currentTime = 0;
            } catch {}
            audioRefObj.current = null;
        };
        killAudio(realtimeAudioRef);
        killAudio(audioRef);

        try {
            if (backupRecorderRef.current?.state === 'recording') {
                backupRecorderRef.current.stop();
            }
        } catch {}
        backupRecorderRef.current = null;
        backupChunksRef.current = [];
        backupBlobReadyRef.current = null;
        backupStartedAtRef.current = null;

        if (voiceDetectionRef.current) {
            cancelAnimationFrame(voiceDetectionRef.current);
            voiceDetectionRef.current = null;
        }
        if (streamingIntervalRef.current) {
            clearInterval(streamingIntervalRef.current);
            streamingIntervalRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            try { audioContextRef.current.close(); } catch {}
            audioContextRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => { try { t.stop(); } catch {} });
            streamRef.current = null;
        }
        if (processingTimeoutRef.current) {
            clearTimeout(processingTimeoutRef.current);
            processingTimeoutRef.current = null;
        }
        try { window.speechSynthesis?.cancel(); } catch {}

        const sid = sessionIdRef.current;
        if (socketRef.current && sid && sid !== 'realtime') {
            try {
                socketRef.current.emit('voice-conversation', { type: 'end', sessionId: sid });
            } catch {}
        }
    }, []);

    useImperativeHandle(ref, () => ({
        stopSession: () => hardStopSession(),
    }), [hardStopSession]);

    useEffect(() => {
        // If using Realtime API, do NOT initialize socket (prevents two agents speaking)
        if (useRealtime) {
            return;
        }

        const SERVER_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SERVER_URL) || (typeof window !== 'undefined' && window.__SERVER_URL__) || 'https://ielts-coach-backend.onrender.com';
        
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

    // Hard cleanup when the component unmounts or user navigates away.
    useEffect(() => {
        return () => {
            hardStopSession();
        };
    }, [hardStopSession]);

    // ── Backup recording helpers ────────────────────────────────────
    const startBackupRecording = (stream) => {
        try {
            if (!stream || backupRecorderRef.current) return;
            // Pick a supported mime type, prefer opus webm (small + Whisper happy)
            const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                  ? 'audio/webm'
                  : '';
            const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
            backupChunksRef.current = [];
            backupStartedAtRef.current = Date.now();
            // Pre-allocate the promise so endVoiceSession can await it.
            backupBlobReadyRef.current = new Promise((resolve) => {
                recorder.onstop = () => {
                    const blob = new Blob(backupChunksRef.current, {
                        type: mime || 'audio/webm',
                    });
                    backupChunksRef.current = [];
                    resolve(blob);
                };
            });
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) backupChunksRef.current.push(e.data);
            };
            recorder.start(1000); // flush a chunk every 1s
            backupRecorderRef.current = recorder;
            console.log('🎙️ Backup recorder started (mime:', mime, ')');
        } catch (e) {
            console.warn('⚠️ Backup recorder failed to start:', e);
        }
    };

    // Stop the backup recorder, send the audio to Whisper, return its
    // transcript (or null if anything failed). Always cleans up state.
    const stopBackupAndTranscribe = async () => {
        const recorder = backupRecorderRef.current;
        const blobPromise = backupBlobReadyRef.current;
        if (!recorder) return { transcript: null, durationSec: 0 };
        const startedAt = backupStartedAtRef.current || Date.now();
        const durationSec = Math.max(0, (Date.now() - startedAt) / 1000);
        try {
            if (recorder.state === 'recording') recorder.stop();
        } catch (e) {
            console.warn('⚠️ Backup stop error:', e);
        }
        let blob = null;
        try {
            blob = await Promise.race([
                blobPromise,
                new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
            ]);
        } catch {}
        backupRecorderRef.current = null;
        backupBlobReadyRef.current = null;
        backupStartedAtRef.current = null;

        if (!blob || blob.size < 1000) {
            console.log('🎙️ Backup blob too small or missing, skipping Whisper.');
            return { transcript: null, durationSec };
        }
        try {
            const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
                || 'https://ielts-coach-backend.onrender.com';
            const formData = new FormData();
            formData.append('audio', blob, 'realtime-session.webm');
            console.log('🎙️ Sending backup audio to Whisper for guaranteed transcript…', { size: blob.size });
            const res = await fetch(`${API_BASE}/api/speaking/exam/transcribe`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            const transcript = (data?.transcript || '').trim();
            console.log('✅ Backup transcript:', transcript.slice(0, 80) + (transcript.length > 80 ? '…' : ''));
            return { transcript, durationSec };
        } catch (err) {
            console.warn('⚠️ Backup Whisper transcribe failed:', err);
            return { transcript: null, durationSec };
        }
    };

    // Mute / unmute the local microphone (Realtime mode)
    const toggleMute = () => {
        try {
            const next = !isMuted;
            setIsMuted(next);
            if (realtimeRef.current && typeof realtimeRef.current.setMuted === 'function') {
                realtimeRef.current.setMuted(next);
            }
        } catch (err) {
            console.warn('toggleMute failed:', err);
        }
    };

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
        if (sessionId || isEnding) return;
        setSessionEnded(false);
        try {
            if (useRealtime) {
                try {
                    // Realtime OpenAI: start WebRTC session
                    if (!realtimeRef.current) realtimeRef.current = createRealtimeAgent();
                    if (!realtimeAudioRef.current) realtimeAudioRef.current = new Audio();
                    
                // Set up audio element event handlers for real-time voice.
                // IMPORTANT: do NOT overwrite `currentMessage` here — the streaming
                // AI transcript flows into that state via the `onAgentMessage`
                // delta/done events. Just keep the `isPlaying` flag in sync so
                // the UI shows the "Speaking…" badge without losing the words.
                if (realtimeAudioRef.current) {
                    realtimeAudioRef.current.onplay = () => {
                        setIsPlaying(true);
                    };
                    realtimeAudioRef.current.onpause = () => {
                        setIsPlaying(false);
                    };
                    realtimeAudioRef.current.onended = () => {
                        setIsPlaying(false);
                    };
                    realtimeAudioRef.current.onerror = (e) => {
                        console.error('❌ Audio playback error:', e);
                        setIsPlaying(false);
                    };
                }
                    
                    await realtimeRef.current.start({
                        audioEl: realtimeAudioRef.current,
                        onConnected: () => {
                            setIsConnected(true);
                            setIsStreamingMode(true);
                            setIsRecording(false);
                            setIsListening(true);
                            try {
                                const stream = realtimeRef.current?.getMicStream?.();
                                if (stream) {
                                    setupVoiceActivityDetection(stream);
                                    startBackupRecording(stream);
                                }
                            } catch (meterErr) {
                                console.warn('⚠️ Voice meter / backup setup failed:', meterErr);
                            }
                            console.log('✅ Realtime API connected. Listening enabled; AI will speak via realtime audio.');
                        },
						onAgentMessage: ({ type, text, meta }) => {
							try {
								if (type === 'delta' && text) {
									// First delta means the AI started speaking. Drive the
									// "AI is speaking" indicator from these events rather
									// than the <audio> element, because a live MediaStream
									// never fires `onended`.
									setIsPlaying(true);
									setStatusBanner('');
									// Resume the audio element if it was paused by the
									// previous auto-interrupt. The MediaStream is still
									// attached; we just need to call play() again.
									if (realtimeAudioRef.current && realtimeAudioRef.current.paused) {
										realtimeAudioRef.current.play().catch(() => {});
									}
									// Each delta is the next slice of the AI's spoken sentence.
									// Accumulate in a ref AND mirror to currentMessage so the UI
									// shows the AI's words live (subtitle-style) while it speaks.
									streamingAgentTextRef.current = (streamingAgentTextRef.current || '') + text;
									setCurrentMessage(streamingAgentTextRef.current);
								} else if (type === 'done') {
									setIsPlaying(false);
									// Commit whatever we have to the chat history. Some event
									// shapes ship the full transcript here; if not, fall back
									// to the accumulator we've been building from deltas.
									const final = (text && text.trim().length > 0)
										? text.trim()
										: (streamingAgentTextRef.current || '').trim();
									if (final) {
										setConversationHistory(prev => {
											// Avoid duplicating the most recent examiner message
											// (some flows emit both .done and response.completed).
											const last = prev[prev.length - 1];
											if (last && last.role === 'examiner' && last.content === final) {
												return prev;
											}
											return [
												...prev,
												{ role: 'examiner', content: final, timestamp: new Date(), isAudio: true }
											];
										});
										setCurrentMessage(final);
										examinerTurnsRef.current += 1;
									}
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
                            // Handle real-time transcription updates from server VAD
                            if (data.speechStarted) {
                                userSpeechStartedAtRef.current = Date.now();
                                setStatusBanner('🎤 Mic hearing you — keep going…');
                                setRealtimeTranscript('');
                                // Snappy auto-interrupt: even though the server
                                // cancels the AI response when the candidate
                                // starts talking, the local <audio> element may
                                // still play ~200ms of buffered TTS. Mute the
                                // AI audio immediately so the candidate hears
                                // their own voice cleanly (just like ChatGPT
                                // Advanced Voice Mode).
                                if (realtimeAudioRef.current && !realtimeAudioRef.current.paused) {
                                    try {
                                        realtimeAudioRef.current.pause();
                                    } catch {}
                                }
                                setIsPlaying(false);
                                return;
                            }
                            if (data.speechStopped) {
                                if (userSpeechStartedAtRef.current) {
                                    const segSec = Math.max(
                                        0,
                                        (Date.now() - userSpeechStartedAtRef.current) / 1000
                                    );
                                    userSpeakingDurationRef.current =
                                        (userSpeakingDurationRef.current || 0) + segSec;
                                    userSpeechStartedAtRef.current = null;
                                }
                                setStatusBanner('⏳ Transcribing…');
                                return;
                            }
                            if (data.isDelta && data.transcript) {
                                // Append delta to whatever we already have
                                setRealtimeTranscript((prev) => (prev || '') + data.transcript);
                                return;
                            }
                            if (data.failed) {
                                console.warn('⚠️ Transcription failed:', data.error);
                                setStatusBanner('⚠️ Couldn\'t transcribe that — please speak again, closer to the mic.');
                                setRealtimeTranscript('');
                                return;
                            }
                            if (data.isComplete && data.transcript) {
                                // Avoid duplicate user messages if both the
                                // .completed event AND the .item.created
                                // fallback fire for the same utterance.
                                setConversationHistory((prev) => {
                                    const last = prev[prev.length - 1];
                                    if (last && last.role === 'user' && last.content === data.transcript) {
                                        return prev;
                                    }
                                    return [
                                        ...prev,
                                        {
                                            role: 'user',
                                            content: data.transcript,
                                            timestamp: new Date(),
                                        },
                                    ];
                                });
                                setUserTranscript(data.transcript);
                                setRealtimeTranscript('');
                                setStatusBanner('');
                                return;
                            }
                            if (data.isComplete && !data.transcript) {
                                setRealtimeTranscript('');
                                setStatusBanner('');
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
                const SERVER_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SERVER_URL) || (typeof window !== 'undefined' && window.__SERVER_URL__) || 'https://ielts-coach-backend.onrender.com';
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
            // Close any previous context so we don't leak nodes on restart.
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                try { audioContextRef.current.close(); } catch {}
            }
            const Ctx = window.AudioContext || window.webkitAudioContext;
            audioContextRef.current = new Ctx();
            analyserRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaStreamSource(stream);

            analyserRef.current.fftSize = 256;
            analyserRef.current.smoothingTimeConstant = 0.8;
            source.connect(analyserRef.current);

            // Chrome sometimes creates the context in `suspended` if the
            // creation isn't directly attributed to the click. Force resume.
            if (audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume().catch((e) => {
                    console.warn('⚠️ AudioContext resume failed:', e);
                });
            }

            // Sanity check: confirm the stream actually has live audio tracks.
            const tracks = stream.getAudioTracks();
            if (tracks.length === 0) {
                console.error('❌ Stream has no audio tracks — mic level meter will stay at 0.');
            } else {
                tracks.forEach((t) =>
                    console.log('🎤 Meter tap', { id: t.id, enabled: t.enabled, muted: t.muted, readyState: t.readyState })
                );
            }

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

            // In Realtime API mode the OpenAI server handles VAD and we don't
            // need a local MediaRecorder at all — bail out before the Socket.IO
            // streaming-record logic.
            if (useRealtime && sessionId === 'realtime') {
                voiceDetectionRef.current = requestAnimationFrame(checkVoiceActivity);
                return;
            }

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

    const endVoiceSession = async () => {
        if (isEnding || !sessionId) return;
        setIsEnding(true);
        setStatusBanner('Ending session…');

        if (userSpeechStartedAtRef.current) {
            const segSec = Math.max(0, (Date.now() - userSpeechStartedAtRef.current) / 1000);
            userSpeakingDurationRef.current = (userSpeakingDurationRef.current || 0) + segSec;
            userSpeechStartedAtRef.current = null;
        }

        const endedSessionId = sessionId;
        const historySnapshot = [...conversationHistory];

        try {
            if (realtimeRef.current?.interrupt) realtimeRef.current.interrupt();
        } catch {}

        setStatusBanner('Preparing your band report…');
        let backupResult = { transcript: null, durationSec: 0 };
        try {
            backupResult = await stopBackupAndTranscribe();
        } catch (e) {
            console.warn('Backup transcribe failed:', e);
        }

        hardStopSession();

        setSessionId(null);
        setIsRecording(false);
        setIsListening(false);
        setIsProcessing(false);
        setIsPlaying(false);
        setVoiceActivity(false);
        setIsMuted(false);
        setVolumeLevel(0);
        setRealtimeTranscript('');
        setStatusBanner('');
        setSessionEnded(true);

        const vadDurationSec = Number(userSpeakingDurationRef.current || 0);
        userSpeakingDurationRef.current = 0;

        let finalHistory = historySnapshot;
        const hasRealtimeUserMessages = historySnapshot.some(
            (m) => m && m.role === 'user' && typeof m.content === 'string' && m.content.trim().length > 0
        );
        const backupText = (backupResult.transcript || '').trim();
        if (!hasRealtimeUserMessages && backupText) {
            finalHistory = [
                ...historySnapshot,
                {
                    role: 'user',
                    content: backupText,
                    timestamp: new Date(),
                    source: 'backup-transcription',
                },
            ];
        }

        const totalUserSpeakingSec = Math.max(
            vadDurationSec,
            hasRealtimeUserMessages ? 0 : backupResult.durationSec
        );

        if (typeof onEndSession === 'function') {
            try {
                await onEndSession({
                    sessionId: endedSessionId,
                    conversationHistory: finalHistory,
                    userSpeakingDurationSec: totalUserSpeakingSec,
                });
            } catch (err) {
                console.warn('onEndSession handler failed:', err);
            }
        }

        setIsEnding(false);
    };

    const liveStatusLabel = sessionEnded
        ? 'Session ended'
        : isEnding
          ? 'Ending session…'
          : isMuted
            ? 'Microphone muted'
            : statusBanner
              ? statusBanner
              : isPlaying
                ? 'Examiner is speaking'
                : voiceActivity
                  ? 'You are speaking'
                  : sessionId
                    ? 'Listening — speak when ready'
                    : 'Ready to begin';

    const partBadgeClass =
        ieltsPart === 'Part 1'
            ? 'bg-sky-100 text-sky-800 border-sky-200'
            : ieltsPart === 'Part 2'
              ? 'bg-amber-100 text-amber-800 border-amber-200'
              : 'bg-violet-100 text-violet-800 border-violet-200';

    return (
        <div className="space-y-5">
            {/* Header strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-purple-100 bg-gradient-to-r from-purple-50 to-white px-4 py-3">
                <div className="flex items-center gap-2">
                    <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${
                            sessionId && !sessionEnded ? 'bg-emerald-500 animate-pulse' : sessionEnded ? 'bg-slate-400' : 'bg-slate-300'
                        }`}
                    />
                    <span className="text-sm font-medium text-slate-700">
                        {sessionId && !sessionEnded ? 'Live session' : sessionEnded ? 'Offline' : 'Not started'}
                    </span>
                </div>
                {(sessionId || sessionEnded) && (
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${partBadgeClass}`}>
                        {ieltsPart}
                    </span>
                )}
                <span className="text-xs text-slate-500 w-full sm:w-auto sm:text-right">{liveStatusLabel}</span>
            </div>

            {/* Examiner line + live transcript */}
            {(currentMessage || realtimeTranscript || userTranscript) && sessionId && !sessionEnded && (
                <div className="space-y-3">
                    {currentMessage && (
                        <div className={`rounded-2xl border p-4 ${isPlaying ? 'border-purple-300 bg-purple-50/80 ring-2 ring-purple-200' : 'border-slate-200 bg-white'}`}>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-700 mb-1">Examiner</p>
                            <p className="text-sm text-slate-800 leading-relaxed">{currentMessage}</p>
                        </div>
                    )}
                    {(realtimeTranscript || userTranscript) && (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 mb-1">You</p>
                            <p className="text-sm text-slate-800 leading-relaxed italic">
                                &ldquo;{realtimeTranscript || userTranscript}&rdquo;
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Mic level — only while session active */}
            {sessionId && !sessionEnded && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-700">Microphone level</span>
                        <span className="text-xs text-slate-500 tabular-nums">{volumeLevel}%</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-100"
                            style={{
                                width: `${volumeLevel}%`,
                                background: volumeLevel > 70 ? '#22c55e' : volumeLevel > 25 ? '#a855f7' : '#cbd5e1',
                            }}
                        />
                    </div>
                </div>
            )}

            {currentMessage && currentMessage.includes('Microphone permission') && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-semibold mb-2">Allow microphone access in your browser, then reload and try again.</p>
                </div>
            )}

            {/* Main controls */}
            <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm text-center space-y-4">
                {!sessionId && !sessionEnded && (
                    <>
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-pink-100 text-4xl">
                            🎙️
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">IELTS Speaking Test</h3>
                            <p className="mt-1 text-sm text-slate-600 max-w-md mx-auto">
                                Start a live voice session with your IELTS examiner. Parts 1, 2, and 3 — just like the real test.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={startVoiceSession}
                            disabled={!isConnected && !useRealtime}
                            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-8 py-3.5 text-white font-semibold shadow-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <span>Start speaking test</span>
                        </button>
                    </>
                )}

                {sessionId && !sessionEnded && (
                    <>
                        <div
                            className={`mx-auto max-w-sm rounded-xl px-4 py-3 text-sm font-medium ${
                                isMuted
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : isPlaying
                                      ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                      : voiceActivity
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : 'bg-slate-50 text-slate-700 border border-slate-200'
                            }`}
                        >
                            {liveStatusLabel}
                        </div>
                        <div className="flex flex-wrap justify-center gap-3">
                            {useRealtime && (
                                <button
                                    type="button"
                                    onClick={toggleMute}
                                    className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
                                        isMuted
                                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                    {isMuted ? 'Unmute' : 'Mute'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={endVoiceSession}
                                disabled={isEnding}
                                className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60 transition-colors"
                            >
                                {isEnding ? 'Ending…' : 'End session & get report'}
                            </button>
                        </div>
                    </>
                )}

                {sessionEnded && (
                    <>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">
                            ✓
                        </div>
                        <p className="text-sm font-semibold text-slate-800">Speaking session ended</p>
                        <p className="text-xs text-slate-500">The connection is closed. You can start a new test when ready.</p>
                        <button
                            type="button"
                            onClick={() => {
                                setSessionEnded(false);
                                setConversationHistory([]);
                                startVoiceSession();
                            }}
                            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
                        >
                            Start new test
                        </button>
                    </>
                )}
            </div>

            {/* Conversation log */}
            {conversationHistory.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 max-h-72 overflow-y-auto">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Conversation</h4>
                    <div className="space-y-2">
                        {conversationHistory.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                                        message.role === 'user'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-white text-slate-800 border border-slate-200'
                                    }`}
                                >
                                    <p className="leading-relaxed">{message.content}</p>
                                    <p className={`text-[10px] mt-1 ${message.role === 'user' ? 'text-purple-200' : 'text-slate-400'}`}>
                                        {message.role === 'user' ? 'You' : 'Examiner'}
                                        {message.timestamp ? ` · ${message.timestamp.toLocaleTimeString()}` : ''}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});
