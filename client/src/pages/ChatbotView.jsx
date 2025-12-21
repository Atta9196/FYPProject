import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/Layout';
import { geminiService } from '../services/geminiService';

export function ChatbotView() {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [apiKeyStatus, setApiKeyStatus] = useState('checking');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Check API key status and load chat history on mount
    useEffect(() => {
        checkApiKeyStatus();
        loadChatHistory();
    }, []);

    const checkApiKeyStatus = async () => {
        try {
            // Since we're using server endpoint, the API key is on the server
            // We can't check it directly, so we assume it's configured if server is accessible
            // The actual check happens when user sends a message
            console.log('✅ Using server endpoint - API key configured on server');
            setApiKeyStatus('configured');
        } catch (error) {
            console.error('Error checking API status:', error);
            setApiKeyStatus('error');
        }
    };

    const loadChatHistory = () => {
        try {
            const history = geminiService.getChatHistory();
            setMessages(history.map(msg => ({
                id: msg.id,
                role: msg.isUser ? 'user' : 'assistant',
                content: msg.text,
                timestamp: msg.timestamp
            })));
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim() || isLoading) return;

        const userMessage = inputText.trim();
        setInputText('');
        setIsLoading(true);

        // Add user message to UI immediately
        const userMsg = {
            id: Date.now().toString(),
            role: 'user',
            content: userMessage,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);

        try {
            // Send message to Gemini service
            console.log('📤 Sending message:', userMessage);
            const response = await geminiService.sendMessage(userMessage);
            console.log('✅ Received response:', response.substring(0, 100));
            
            // Add bot response to UI
            const botMsg = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, botMsg]);

            // Scroll to bottom
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (error) {
            console.error('❌ Error sending message:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack?.substring(0, 300)
            });
            
            // Show more helpful error message
            let errorTitle = 'Error';
            let errorMsg = error.message;
            
            if (error.message.includes('403') || error.message.includes('API key')) {
                errorTitle = 'API Key Error';
                errorMsg = 'Your API key may be invalid or leaked. Please check your server .env file for GEMINI_API_KEY.';
            } else if (error.message.includes('429') || error.message.includes('quota')) {
                errorTitle = 'Quota Exceeded';
                errorMsg = 'API quota exceeded. Please wait 24 hours or enable billing for higher limits.';
            } else if (error.message.includes('404')) {
                errorTitle = 'Model Error';
                errorMsg = 'Model not found. Please check the model configuration.';
            }
            
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `${errorMsg} 😊 Try asking me about IELTS practice modules, test strategies, or how to improve your band score!`,
                timestamp: new Date(),
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearHistory = () => {
        if (window.confirm('Are you sure you want to clear all chat history?')) {
            geminiService.clearChatHistory();
            setMessages([]);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const getApiKeyStatusColor = () => {
        switch (apiKeyStatus) {
            case 'configured':
                return 'bg-green-500';
            case 'missing':
                return 'bg-yellow-500';
            case 'error':
                return 'bg-red-500';
            default:
                return 'bg-gray-400';
        }
    };

    const getApiKeyStatusText = () => {
        switch (apiKeyStatus) {
            case 'configured':
                return 'API Key Configured';
            case 'missing':
                return 'API Key Missing';
            case 'error':
                return 'Error Checking API Key';
            default:
                return 'Checking...';
        }
    };

    return (
        <AppLayout>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
                {/* Header */}
                <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/70 shadow-sm sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                                    aria-label="Go back"
                                >
                                    <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <h1 className="text-xl sm:text-2xl font-bold text-slate-800">IELTS Assistant</h1>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleClearHistory}
                                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
                                    title="Clear chat history"
                                >
                                    🗑️ Clear
                                </button>
                                <button
                                    onClick={() => navigate('/profile')}
                                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
                                >
                                    Profile
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                    {/* Branding */}
                    <div className="text-center mb-6">
                        <h2 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
                            IELTSCoach
                        </h2>
                        
                        {/* API Key Status */}
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <div className={`w-3 h-3 rounded-full ${getApiKeyStatusColor()} ${apiKeyStatus === 'configured' ? 'animate-pulse' : ''}`}></div>
                            <span className="text-sm font-semibold text-slate-700">{getApiKeyStatusText()}</span>
                            {apiKeyStatus === 'configured' && (
                                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                    </div>

                    {/* Chat Container */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
                        {/* Chat Header */}
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 sm:px-6 py-4 border-b border-blue-600/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                                        <span className="text-xl sm:text-2xl">🤖</span>
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-bold text-white">AI IELTS Assistant</h3>
                                        <p className="text-xs sm:text-sm text-blue-100">Ready to help you practice</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-200 rounded-full animate-pulse"></div>
                                    <span className="text-xs text-blue-100 hidden sm:inline">Active</span>
                                </div>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-slate-50/50 to-white chat-container">
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4 animate-float">
                                        <span className="text-3xl sm:text-4xl">💬</span>
                                    </div>
                                    <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2">Start a conversation</h3>
                                    <p className="text-slate-500 text-sm sm:text-base max-w-md">
                                        Ask me anything about IELTS preparation, practice questions, or get tips to improve your band score!
                                    </p>
                                    <div className="mt-6 flex flex-wrap gap-2 justify-center">
                                        <button
                                            onClick={() => setInputText("How can I improve my speaking band score?")}
                                            className="px-4 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors"
                                        >
                                            Improve speaking score
                                        </button>
                                        <button
                                            onClick={() => setInputText("What are common IELTS writing mistakes?")}
                                            className="px-4 py-2 text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 transition-colors"
                                        >
                                            Writing mistakes
                                        </button>
                                        <button
                                            onClick={() => setInputText("Give me a practice question")}
                                            className="px-4 py-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded-lg border border-green-200 transition-colors"
                                        >
                                            Practice question
                                        </button>
                                    </div>
                                </div>
                            )}

                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex items-start gap-3 message-enter ${
                                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                    }`}
                                >
                                    {/* Avatar */}
                                    <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-semibold shadow-md ${
                                        message.role === 'user'
                                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                                            : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                                    }`}>
                                        {message.role === 'user' ? '👤' : '🤖'}
                                    </div>

                                    {/* Message Bubble */}
                                    <div className={`flex flex-col max-w-[75%] sm:max-w-[70%] md:max-w-[65%] lg:max-w-[60%] ${
                                        message.role === 'user' ? 'items-end' : 'items-start'
                                    }`}>
                                        <div
                                            className={`relative px-4 py-3 sm:px-5 sm:py-4 rounded-2xl shadow-md transition-all duration-200 ${
                                                message.role === 'user'
                                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm'
                                                    : message.isError
                                                    ? 'bg-red-50 text-red-800 border-2 border-red-200 rounded-tl-sm'
                                                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
                                            }`}
                                        >
                                            <p className={`text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words ${
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
                                                        : message.isError
                                                        ? 'bg-red-50 border-l border-t border-red-200'
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
                                                : message.role === 'user' ? 'You' : 'AI Assistant'
                                            }
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {/* Typing Indicator */}
                            {isLoading && (
                                <div className="flex items-start gap-3 animate-fade-in">
                                    <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                                        <span className="text-sm sm:text-base">🤖</span>
                                    </div>
                                    <div className="flex flex-col items-start max-w-[75%] sm:max-w-[70%] md:max-w-[65%]">
                                        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 sm:px-5 sm:py-4 shadow-md">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                                                <span className="text-xs text-slate-500 ml-2">AI is typing...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="bg-white/90 backdrop-blur-sm border-t border-slate-200/50 p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                <div className="flex-1 relative">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Type your message..."
                                        className="w-full px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base border-2 border-slate-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-slate-50 disabled:cursor-not-allowed"
                                        disabled={isLoading || apiKeyStatus !== 'configured'}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hidden sm:block">
                                        Enter to send
                                    </div>
                                </div>
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!inputText.trim() || isLoading || apiKeyStatus !== 'configured'}
                                    className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl sm:rounded-2xl font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 min-w-[100px] sm:min-w-[120px]"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span className="hidden sm:inline">Sending...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                            <span>Send</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            {apiKeyStatus !== 'configured' && (
                                <p className="text-xs text-red-600 mt-2 text-center sm:text-left">
                                    ⚠️ API key not configured. Please configure your GEMINI_API_KEY in server/.env file to use the chatbot.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

export default ChatbotView;
