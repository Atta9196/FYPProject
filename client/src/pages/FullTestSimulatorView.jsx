import React, { useState, useEffect, useCallback, useMemo } from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getStorageKeyForModule } from "../services/progressService";

// Import module components (we'll embed them)
import { ReadingPracticeView } from "./ReadingPracticeView";
import { WritingPracticeView } from "./WritingPracticeView";
import { ListeningPracticeView } from "./ListeningPracticeView";
import { SpeakingPracticeView } from "./SpeakingPracticeView";

// Test timing (in seconds)
const MODULE_TIMES = {
    listening: 40 * 60,      // 40 minutes
    reading: 60 * 60,         // 60 minutes
    writing: 60 * 60,         // 60 minutes
    speaking: 14 * 60         // 14 minutes
};

const TOTAL_TEST_TIME = Object.values(MODULE_TIMES).reduce((sum, time) => sum + time, 0);

function getStorageKey(userId, module) {
    if (module) {
        return getStorageKeyForModule(module, userId) || `ielts-${module}-history`;
    }
    // For full test history, use a user-specific key
    if (!userId) return "ielts-full-test-history";
    const userIdentifier = userId.replace(/[^a-zA-Z0-9]/g, '_');
    return `ielts-full-test-history_${userIdentifier}`;
}

function loadHistory(userId, module = null) {
    if (typeof window === "undefined") return [];
    try {
        const key = getStorageKey(userId, module);
        const raw = window.localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn("Failed to parse history", error);
        return [];
    }
}

function saveHistory(entries, userId, module = null) {
    if (typeof window === "undefined") return;
    const key = getStorageKey(userId, module);
    window.localStorage.setItem(key, JSON.stringify(entries));
}

export function FullTestSimulatorView() {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Test state
    const [testStarted, setTestStarted] = useState(false);
    const [testCompleted, setTestCompleted] = useState(false);
    const [currentModule, setCurrentModule] = useState(null); // 'listening' | 'reading' | 'writing' | 'speaking'
    const [overallTimer, setOverallTimer] = useState(TOTAL_TEST_TIME);
    const [moduleTimers, setModuleTimers] = useState({
        listening: MODULE_TIMES.listening,
        reading: MODULE_TIMES.reading,
        writing: MODULE_TIMES.writing,
        speaking: MODULE_TIMES.speaking
    });
    
    // Module completion status
    const [moduleStatus, setModuleStatus] = useState({
        listening: { completed: false, score: null, band: null },
        reading: { completed: false, score: null, band: null },
        writing: { completed: false, score: null, band: null },
        speaking: { completed: false, score: null, band: null }
    });
    
    // Module order
    const moduleOrder = ['listening', 'reading', 'writing', 'speaking'];
    const currentModuleIndex = currentModule ? moduleOrder.indexOf(currentModule) : -1;
    
    // Format time helper
    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${minutes}:${String(secs).padStart(2, '0')}`;
    };
    
    // Start test
    const handleStartTest = useCallback(() => {
        setTestStarted(true);
        setCurrentModule('listening');
        setOverallTimer(TOTAL_TEST_TIME);
        setModuleTimers({
            listening: MODULE_TIMES.listening,
            reading: MODULE_TIMES.reading,
            writing: MODULE_TIMES.writing,
            speaking: MODULE_TIMES.speaking
        });
        setModuleStatus({
            listening: { completed: false, score: null, band: null },
            reading: { completed: false, score: null, band: null },
            writing: { completed: false, score: null, band: null },
            speaking: { completed: false, score: null, band: null }
        });
    }, []);
    
    // Complete module
    const handleModuleComplete = useCallback((module, results) => {
        setModuleStatus(prev => ({
            ...prev,
            [module]: {
                completed: true,
                score: results.score || results.correctCount || 0,
                band: results.band || 0
            }
        }));
        
        // Move to next module
        const nextIndex = moduleOrder.indexOf(module) + 1;
        if (nextIndex < moduleOrder.length) {
            setCurrentModule(moduleOrder[nextIndex]);
        } else {
            // All modules completed
            handleTestComplete();
        }
    }, []);
    
    // Complete test
    const handleTestComplete = useCallback(() => {
        setTestCompleted(true);
        setTestStarted(false);
        setCurrentModule(null);
        
        // Calculate overall band (average of all modules)
        const bands = Object.values(moduleStatus)
            .map(m => m.band)
            .filter(b => b !== null && b > 0);
        
        const overallBand = bands.length > 0
            ? (bands.reduce((sum, b) => sum + parseFloat(b), 0) / bands.length).toFixed(1)
            : 0;
        
        // Save to history
        const userId = user?.email || user?.id || null;
        const historyEntry = {
            id: Date.now(),
            completedAt: new Date().toISOString(),
            modules: moduleStatus,
            overallBand: parseFloat(overallBand),
            totalTime: TOTAL_TEST_TIME - overallTimer
        };
        
        const existingHistory = loadHistory(userId);
        const updatedHistory = [historyEntry, ...existingHistory].slice(0, 20);
        saveHistory(updatedHistory, userId);
        
        // Dispatch event to update dashboards
        window.dispatchEvent(new Event('progressUpdated'));
    }, [moduleStatus, overallTimer]);
    
    // Timer effect
    useEffect(() => {
        if (!testStarted || testCompleted) return;
        
        const interval = setInterval(() => {
            setOverallTimer(prev => {
                if (prev <= 1) {
                    handleTestComplete();
                    return 0;
                }
                return prev - 1;
            });
            
            if (currentModule) {
                setModuleTimers(prev => ({
                    ...prev,
                    [currentModule]: Math.max(0, prev[currentModule] - 1)
                }));
            }
        }, 1000);
        
        return () => clearInterval(interval);
    }, [testStarted, testCompleted, currentModule, handleTestComplete]);
    
    // Listen for module completion events
    useEffect(() => {
        const handleModuleResult = (event) => {
            const { module, results } = event.detail;
            if (testStarted && !moduleStatus[module]?.completed) {
                handleModuleComplete(module, results);
            }
        };
        
        window.addEventListener('moduleCompleted', handleModuleResult);
        return () => window.removeEventListener('moduleCompleted', handleModuleResult);
    }, [testStarted, moduleStatus, handleModuleComplete]);
    
    // Progress calculation
    const progress = useMemo(() => {
        const completed = Object.values(moduleStatus).filter(m => m.completed).length;
        return (completed / moduleOrder.length) * 100;
    }, [moduleStatus]);
    
    // If test not started, show start screen
    if (!testStarted && !testCompleted) {
        return (
            <AppLayout>
                <div className="p-6 md:p-10 lg:p-12 bg-gradient-to-br from-indigo-50 via-white to-purple-50 min-h-screen">
                    <Panel className="max-w-4xl mx-auto bg-white/90 backdrop-blur space-y-6">
                        <div className="text-center space-y-4">
                            <h1 className="text-4xl font-extrabold text-indigo-700">IELTS Full Test Simulator</h1>
                            <p className="text-lg text-slate-600">
                                Complete all four modules in one comprehensive test session
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {moduleOrder.map((module, index) => (
                                <div
                                    key={module}
                                    className={`p-4 rounded-xl border-2 ${
                                        module === 'listening' ? 'border-blue-200 bg-blue-50' :
                                        module === 'reading' ? 'border-green-200 bg-green-50' :
                                        module === 'writing' ? 'border-yellow-200 bg-yellow-50' :
                                        'border-purple-200 bg-purple-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-semibold text-slate-800 capitalize">{module}</h3>
                                        <span className="text-2xl">
                                            {module === 'listening' ? '🎧' :
                                             module === 'reading' ? '📖' :
                                             module === 'writing' ? '✍️' : '🎤'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600">
                                        {module === 'listening' && '40 minutes - 4 sections, 40 questions'}
                                        {module === 'reading' && '60 minutes - 3 passages, 40 questions'}
                                        {module === 'writing' && '60 minutes - 2 tasks (150 & 250 words)'}
                                        {module === 'speaking' && '11-14 minutes - 3 parts'}
                                    </p>
                                </div>
                            ))}
                        </div>
                        
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 space-y-4">
                            <h3 className="text-lg font-semibold text-indigo-900">Test Information</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-600">Total Duration:</span>
                                    <span className="font-semibold text-slate-800 ml-2">2 hours 54 minutes</span>
                                </div>
                                <div>
                                    <span className="text-slate-600">Modules:</span>
                                    <span className="font-semibold text-slate-800 ml-2">4</span>
                                </div>
                                <div>
                                    <span className="text-slate-600">Total Questions:</span>
                                    <span className="font-semibold text-slate-800 ml-2">80+</span>
                                </div>
                                <div>
                                    <span className="text-slate-600">AI-Generated:</span>
                                    <span className="font-semibold text-slate-800 ml-2">Yes</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <h4 className="font-semibold text-amber-900 mb-2">⚠️ Important Instructions</h4>
                            <ul className="text-sm text-amber-800 space-y-1">
                                <li>• Complete modules in order: Listening → Reading → Writing → Speaking</li>
                                <li>• Each module has its own timer</li>
                                <li>• You cannot go back to previous modules once completed</li>
                                <li>• The test will auto-submit when time expires</li>
                                <li>• Results will be saved automatically</li>
                            </ul>
                        </div>
                        
                        <div className="flex gap-4">
                            <button
                                onClick={handleStartTest}
                                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                            >
                                Start Full Test
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="px-6 py-3 border border-slate-300 text-slate-600 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </Panel>
                </div>
            </AppLayout>
        );
    }
    
    // If test completed, show results
    if (testCompleted) {
        const bands = Object.values(moduleStatus)
            .map(m => m.band)
            .filter(b => b !== null && b > 0);
        const overallBand = bands.length > 0
            ? (bands.reduce((sum, b) => sum + parseFloat(b), 0) / bands.length).toFixed(1)
            : 0;
        
        return (
            <AppLayout>
                <div className="p-6 md:p-10 lg:p-12 bg-gradient-to-br from-emerald-50 via-white to-green-50 min-h-screen">
                    <Panel className="max-w-4xl mx-auto bg-white/90 backdrop-blur space-y-6">
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                <span className="text-4xl">✅</span>
                            </div>
                            <h1 className="text-4xl font-extrabold text-emerald-700">Test Completed!</h1>
                            <p className="text-lg text-slate-600">Congratulations on completing the full IELTS test</p>
                        </div>
                        
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
                            <div className="text-center mb-6">
                                <p className="text-sm text-slate-600 mb-2">Overall Band Score</p>
                                <p className="text-5xl font-extrabold text-indigo-700">{overallBand}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {moduleOrder.map(module => {
                                    const status = moduleStatus[module];
                                    return (
                                        <div
                                            key={module}
                                            className={`p-4 rounded-lg border-2 text-center ${
                                                module === 'listening' ? 'border-blue-200 bg-blue-50' :
                                                module === 'reading' ? 'border-green-200 bg-green-50' :
                                                module === 'writing' ? 'border-yellow-200 bg-yellow-50' :
                                                'border-purple-200 bg-purple-50'
                                            }`}
                                        >
                                            <div className="text-2xl mb-2">
                                                {module === 'listening' ? '🎧' :
                                                 module === 'reading' ? '📖' :
                                                 module === 'writing' ? '✍️' : '🎤'}
                                            </div>
                                            <p className="text-sm font-semibold text-slate-700 capitalize mb-1">{module}</p>
                                            {status.completed ? (
                                                <>
                                                    <p className="text-xl font-bold text-slate-800">{status.band || 'N/A'}</p>
                                                    <p className="text-xs text-slate-500">Score: {status.score || 0}</p>
                                                </>
                                            ) : (
                                                <p className="text-sm text-slate-500">Not completed</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        
                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    setTestCompleted(false);
                                    setTestStarted(false);
                                    setCurrentModule(null);
                                    setModuleStatus({
                                        listening: { completed: false, score: null, band: null },
                                        reading: { completed: false, score: null, band: null },
                                        writing: { completed: false, score: null, band: null },
                                        speaking: { completed: false, score: null, band: null }
                                    });
                                }}
                                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                            >
                                Take Another Test
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="px-6 py-3 border border-slate-300 text-slate-600 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                            >
                                View Dashboard
                            </button>
                        </div>
                    </Panel>
                </div>
            </AppLayout>
        );
    }
    
    // Render current module - NO AppLayout to avoid duplicate sidebar
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
            {/* Test Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl font-bold text-slate-800">IELTS Full Test</h1>
                            <div className="flex items-center gap-2">
                                {moduleOrder.map((module, index) => (
                                    <div
                                        key={module}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                            index < currentModuleIndex
                                                ? 'bg-emerald-500 text-white'
                                                : index === currentModuleIndex
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-200 text-slate-500'
                                        }`}
                                    >
                                        {index + 1}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-xs text-slate-500">Overall Time</p>
                                <p className="text-lg font-bold text-slate-800">{formatTime(overallTimer)}</p>
                            </div>
                            {currentModule && (
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 capitalize">{currentModule} Time</p>
                                    <p className="text-lg font-bold text-slate-800">{formatTime(moduleTimers[currentModule])}</p>
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to exit the test? Your progress will be saved.')) {
                                        handleTestComplete();
                                    }
                                }}
                                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            >
                                Exit Test
                            </button>
                        </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Progress: {Math.round(progress)}% ({Object.values(moduleStatus).filter(m => m.completed).length}/4 modules)
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Module Content - Render without AppLayout wrapper */}
            <div className="max-w-7xl mx-auto p-4">
                {currentModule === 'listening' && (
                    <ListeningTestWrapper
                        onComplete={(results) => {
                            window.dispatchEvent(new CustomEvent('moduleCompleted', {
                                detail: { module: 'listening', results }
                            }));
                        }}
                    />
                )}
                {currentModule === 'reading' && (
                    <ReadingTestWrapper
                        onComplete={(results) => {
                            window.dispatchEvent(new CustomEvent('moduleCompleted', {
                                detail: { module: 'reading', results }
                            }));
                        }}
                    />
                )}
                {currentModule === 'writing' && (
                    <WritingTestWrapper
                        onComplete={(results) => {
                            window.dispatchEvent(new CustomEvent('moduleCompleted', {
                                detail: { module: 'writing', results }
                            }));
                        }}
                    />
                )}
                {currentModule === 'speaking' && (
                    <SpeakingTestWrapper
                        onComplete={(results) => {
                            window.dispatchEvent(new CustomEvent('moduleCompleted', {
                                detail: { module: 'speaking', results }
                            }));
                        }}
                    />
                )}
            </div>
        </div>
    );
}

// Wrapper components to integrate module views
function ListeningTestWrapper({ onComplete }) {
    const { user } = useAuth();
    const [completed, setCompleted] = useState(false);
    
    useEffect(() => {
        if (completed) return;
        
        const userId = user?.email || user?.id || null;
        const storageKey = getStorageKeyForModule('listening', userId) || 'ielts-listening-history';
        
        const checkCompletion = () => {
            try {
                const history = loadHistory(userId, 'listening');
                if (history.length > 0) {
                    const latest = history[0];
                    // Check if this entry was created during this test session (within last 5 minutes)
                    const entryTime = new Date(latest.submittedAt).getTime();
                    const now = Date.now();
                    if (latest.submittedAt && (now - entryTime) < 5 * 60 * 1000 && latest.totalScore !== undefined) {
                        setCompleted(true);
                        onComplete({
                            score: latest.totalScore,
                            band: latest.band
                        });
                    }
                }
            } catch (error) {
                console.error('Error checking listening completion:', error);
            }
        };
        
        // Check immediately and then periodically
        checkCompletion();
        const interval = setInterval(checkCompletion, 2000);
        
        const handleStorageChange = (e) => {
            if (e.key === storageKey) {
                checkCompletion();
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('progressUpdated', checkCompletion);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('progressUpdated', checkCompletion);
        };
    }, [onComplete, completed, user]);
    
    return <ListeningPracticeView embedded={true} />;
}

function ReadingTestWrapper({ onComplete }) {
    const { user } = useAuth();
    const [completed, setCompleted] = useState(false);
    
    useEffect(() => {
        if (completed) return;
        
        const userId = user?.email || user?.id || null;
        const storageKey = getStorageKeyForModule('reading', userId) || 'ielts-reading-history';
        
        const checkCompletion = () => {
            try {
                const history = loadHistory(userId, 'reading');
                if (history.length > 0) {
                    const latest = history[0];
                    const entryTime = new Date(latest.submittedAt).getTime();
                    const now = Date.now();
                    if (latest.submittedAt && (now - entryTime) < 5 * 60 * 1000 && latest.correctCount !== undefined) {
                        setCompleted(true);
                        onComplete({
                            correctCount: latest.correctCount,
                            band: latest.band
                        });
                    }
                }
            } catch (error) {
                console.error('Error checking reading completion:', error);
            }
        };
        
        checkCompletion();
        const interval = setInterval(checkCompletion, 2000);
        
        const handleStorageChange = (e) => {
            if (e.key === storageKey) {
                checkCompletion();
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('progressUpdated', checkCompletion);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('progressUpdated', checkCompletion);
        };
    }, [onComplete, completed, user]);
    
    return <ReadingPracticeView embedded={true} />;
}

function WritingTestWrapper({ onComplete }) {
    const { user } = useAuth();
    const [completed, setCompleted] = useState(false);
    
    useEffect(() => {
        if (completed) return;
        
        const userId = user?.email || user?.id || null;
        const storageKey = getStorageKeyForModule('writing', userId) || 'ielts-writing-history';
        
        const checkCompletion = () => {
            try {
                const history = loadHistory(userId, 'writing');
                if (history.length > 0) {
                    const latest = history[0];
                    const entryTime = new Date(latest.submittedAt).getTime();
                    const now = Date.now();
                    if (latest.submittedAt && (now - entryTime) < 5 * 60 * 1000 && latest.overallBand !== undefined) {
                        setCompleted(true);
                        onComplete({
                            score: latest.overallBand,
                            band: latest.overallBand
                        });
                    }
                }
            } catch (error) {
                console.error('Error checking writing completion:', error);
            }
        };
        
        checkCompletion();
        const interval = setInterval(checkCompletion, 2000);
        
        const handleStorageChange = (e) => {
            if (e.key === storageKey) {
                checkCompletion();
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('progressUpdated', checkCompletion);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('progressUpdated', checkCompletion);
        };
    }, [onComplete, completed, user]);
    
    return <WritingPracticeView embedded={true} />;
}

function SpeakingTestWrapper({ onComplete }) {
    const { user } = useAuth();
    const [completed, setCompleted] = useState(false);
    
    useEffect(() => {
        if (completed) return;
        
        const userId = user?.email || user?.id || null;
        const storageKey = getStorageKeyForModule('speaking', userId) || 'ielts-speaking-history';
        
        const checkCompletion = () => {
            try {
                const history = loadHistory(userId, 'speaking');
                if (history.length > 0) {
                    const latest = history[0];
                    const entryTime = new Date(latest.submittedAt || latest.createdAt).getTime();
                    const now = Date.now();
                    if ((latest.submittedAt || latest.createdAt) && (now - entryTime) < 5 * 60 * 1000 && latest.bandScore !== undefined) {
                        setCompleted(true);
                        onComplete({
                            score: latest.bandScore || 0,
                            band: latest.bandScore || 0
                        });
                    }
                }
            } catch (error) {
                console.error('Error checking speaking completion:', error);
            }
        };
        
        checkCompletion();
        const interval = setInterval(checkCompletion, 2000);
        
        const handleStorageChange = (e) => {
            if (e.key === storageKey) {
                checkCompletion();
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('progressUpdated', checkCompletion);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('progressUpdated', checkCompletion);
        };
    }, [onComplete, completed, user]);
    
    return <SpeakingPracticeView embedded={true} />;
}
