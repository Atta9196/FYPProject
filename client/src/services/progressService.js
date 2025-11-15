// Progress Service - Aggregates real progress data from localStorage and backend

const STORAGE_KEYS = {
    reading: "ielts-reading-history",
    writing: "ielts-writing-history",
    listening: "ielts-listening-history",
    speaking: "ielts-speaking-history"
};

/**
 * Load history from localStorage
 */
function loadHistory(key) {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn(`Failed to parse ${key} history`, error);
        return [];
    }
}

/**
 * Get all progress data from all modules
 */
export function getAllProgressData() {
    const readingHistory = loadHistory(STORAGE_KEYS.reading);
    const writingHistory = loadHistory(STORAGE_KEYS.writing);
    const listeningHistory = loadHistory(STORAGE_KEYS.listening);
    const speakingHistory = loadHistory(STORAGE_KEYS.speaking);

    return {
        reading: readingHistory,
        writing: writingHistory,
        listening: listeningHistory,
        speaking: speakingHistory
    };
}

/**
 * Calculate band scores from history
 */
function calculateBandScores(history) {
    if (!history || history.length === 0) {
        return {
            average: 0,
            latest: 0,
            trend: 0
        };
    }

    const bands = history
        .map(entry => {
            // Handle different band formats
            if (typeof entry.band === 'number') return entry.band;
            if (typeof entry.band === 'string') {
                const num = parseFloat(entry.band);
                return isNaN(num) ? 0 : num;
            }
            if (entry.overallBand) {
                const num = parseFloat(entry.overallBand);
                return isNaN(num) ? 0 : num;
            }
            return 0;
        })
        .filter(band => band > 0);

    if (bands.length === 0) {
        return { average: 0, latest: 0, trend: 0 };
    }

    const average = bands.reduce((sum, b) => sum + b, 0) / bands.length;
    const latest = bands[0] || 0;
    const previous = bands.length > 1 ? bands[1] : latest;
    const trend = latest - previous;

    return { average, latest, trend };
}

/**
 * Get overall statistics
 */
export function getOverallStats() {
    const progress = getAllProgressData();
    
    const readingBands = calculateBandScores(progress.reading);
    const writingBands = calculateBandScores(progress.writing);
    const listeningBands = calculateBandScores(progress.listening);
    const speakingBands = calculateBandScores(progress.speaking.map(e => ({ band: e.bandScore || 0 })));

    // Calculate overall band
    const moduleBands = [
        readingBands.latest,
        writingBands.latest,
        listeningBands.latest,
        speakingBands.latest
    ].filter(b => b > 0);

    const overallBand = moduleBands.length > 0
        ? moduleBands.reduce((sum, b) => sum + b, 0) / moduleBands.length
        : 0;

    return {
        bands: {
            overall: parseFloat(overallBand.toFixed(1)),
            reading: parseFloat(readingBands.latest.toFixed(1)),
            writing: parseFloat(writingBands.latest.toFixed(1)),
            listening: parseFloat(listeningBands.latest.toFixed(1)),
            speaking: parseFloat(speakingBands.latest.toFixed(1))
        },
        trends: {
            reading: parseFloat(readingBands.trend.toFixed(1)),
            writing: parseFloat(writingBands.trend.toFixed(1)),
            listening: parseFloat(listeningBands.trend.toFixed(1)),
            speaking: parseFloat(speakingBands.trend.toFixed(1))
        },
        averages: {
            reading: parseFloat(readingBands.average.toFixed(1)),
            writing: parseFloat(writingBands.average.toFixed(1)),
            listening: parseFloat(listeningBands.average.toFixed(1)),
            speaking: parseFloat(speakingBands.average.toFixed(1))
        }
    };
}

/**
 * Get recent activity from all modules
 */
export function getRecentActivity(limit = 10) {
    const progress = getAllProgressData();
    const activities = [];

    // Reading activities
    progress.reading.slice(0, limit).forEach(entry => {
        activities.push({
            type: "Reading Test",
            score: parseFloat(entry.band) || 0,
            time: entry.submittedAt,
            icon: "📖",
            color: "blue",
            module: "reading"
        });
    });

    // Writing activities
    progress.writing.slice(0, limit).forEach(entry => {
        activities.push({
            type: entry.taskId === "task1-academic" || entry.taskId === "task1-general" 
                ? "Writing Task 1" 
                : "Writing Task 2",
            score: parseFloat(entry.overallBand) || 0,
            time: entry.submittedAt,
            icon: "✍️",
            color: "purple",
            module: "writing"
        });
    });

    // Listening activities
    progress.listening.slice(0, limit).forEach(entry => {
        activities.push({
            type: "Listening Test",
            score: parseFloat(entry.band) || 0,
            time: entry.submittedAt,
            icon: "👂",
            color: "orange",
            module: "listening"
        });
    });

    // Speaking activities
    progress.speaking.slice(0, limit).forEach(entry => {
        activities.push({
            type: entry.type === 'realtime_practice' ? "Speaking Practice (Real-time)" : "Speaking Practice",
            score: parseFloat(entry.bandScore || 0),
            time: entry.submittedAt,
            icon: "🎙️",
            color: "green",
            module: "speaking"
        });
    });

    // Sort by time (most recent first) and limit
    return activities
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, limit)
        .map(activity => ({
            ...activity,
            time: formatTimeAgo(activity.time)
        }));
}

/**
 * Format time ago
 */
function formatTimeAgo(dateString) {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

/**
 * Get statistics summary
 */
export function getStatsSummary() {
    const progress = getAllProgressData();
    
    const totalTests = progress.reading.length + progress.writing.length + progress.listening.length + progress.speaking.length;
    
    // Calculate weekly change (tests in last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weeklyTests = [
        ...progress.reading,
        ...progress.writing,
        ...progress.listening,
        ...progress.speaking
    ].filter(entry => {
        const entryDate = new Date(entry.submittedAt);
        return entryDate >= weekAgo;
    }).length;

    // Calculate study hours (estimate: 1 hour per test)
    const studyHours = Math.round(totalTests * 1.2); // Slightly more than 1 hour per test
    const weeklyHours = Math.round(weeklyTests * 1.2);

    // Calculate streak (consecutive days with at least one test)
    const streakDays = calculateStreak([
        ...progress.reading,
        ...progress.writing,
        ...progress.listening,
        ...progress.speaking
    ]);

    return {
        testsCompleted: totalTests,
        weeklyChange: weeklyTests,
        studyHours,
        weeklyHours,
        streakDays,
        streakChange: 1 // Placeholder
    };
}

/**
 * Calculate streak days
 */
function calculateStreak(entries) {
    if (entries.length === 0) return 0;
    
    const dates = entries
        .map(e => {
            const date = new Date(e.submittedAt);
            return date.toDateString();
        })
        .filter((date, index, self) => self.indexOf(date) === index)
        .sort((a, b) => new Date(b) - new Date(a));

    if (dates.length === 0) return 0;

    let streak = 0;
    const today = new Date().toDateString();
    let currentDate = new Date();

    for (let i = 0; i < dates.length; i++) {
        const expectedDate = currentDate.toDateString();
        if (dates[i] === expectedDate || (i === 0 && dates[i] === today)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}

/**
 * Get band progress over time for charts
 */
export function getBandProgress(timeframe = '3months') {
    const progress = getAllProgressData();
    const now = new Date();
    let startDate = new Date();

    switch (timeframe) {
        case '1month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        case '3months':
            startDate.setMonth(now.getMonth() - 3);
            break;
        case '6months':
            startDate.setMonth(now.getMonth() - 6);
            break;
        case '1year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        default:
            startDate.setMonth(now.getMonth() - 3);
    }

    // Combine all entries
    const allEntries = [
        ...progress.reading.map(e => ({ ...e, module: 'reading' })),
        ...progress.writing.map(e => ({ ...e, module: 'writing' })),
        ...progress.listening.map(e => ({ ...e, module: 'listening' })),
        ...progress.speaking.map(e => ({ ...e, module: 'speaking', band: e.bandScore || 0 }))
    ].filter(e => {
        const entryDate = new Date(e.submittedAt);
        return entryDate >= startDate;
    }).sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

    // Group by month
    const monthlyData = {};
    allEntries.forEach(entry => {
        const date = new Date(entry.submittedAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });

        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                month: monthLabel,
                reading: [],
                writing: [],
                listening: [],
                speaking: []
            };
        }

        // Handle different band formats for different modules
        let band = 0;
        if (entry.module === 'reading') {
            band = parseFloat(entry.band || 0);
        } else if (entry.module === 'writing') {
            band = parseFloat(entry.overallBand || 0);
        } else if (entry.module === 'listening') {
            band = parseFloat(entry.band || 0);
        } else if (entry.module === 'speaking') {
            band = parseFloat(entry.band || entry.bandScore || 0);
        }

        if (band > 0) {
            monthlyData[monthKey][entry.module].push(band);
        }
    });

    // Calculate averages for each month
    return Object.values(monthlyData).map(data => {
        const calcAvg = (arr) => arr.length > 0 
            ? parseFloat((arr.reduce((sum, b) => sum + b, 0) / arr.length).toFixed(1))
            : 0;

        const reading = calcAvg(data.reading);
        const writing = calcAvg(data.writing);
        const listening = calcAvg(data.listening);
        const speaking = calcAvg(data.speaking);

        const moduleBands = [reading, writing, listening, speaking].filter(b => b > 0);
        const overall = moduleBands.length > 0
            ? moduleBands.reduce((sum, b) => sum + b, 0) / moduleBands.length
            : 0;

        return {
            month: data.month,
            overall: parseFloat(overall.toFixed(1)),
            reading,
            writing,
            listening,
            speaking
        };
    });
}

/**
 * Get weekly test completion data
 */
export function getWeeklyTests() {
    const progress = getAllProgressData();
    const allEntries = [
        ...progress.reading,
        ...progress.writing,
        ...progress.listening,
        ...progress.speaking
    ];

    const now = new Date();
    const weeks = [];
    
    // Get last 6 weeks
    for (let i = 5; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekTests = allEntries.filter(entry => {
            const entryDate = new Date(entry.submittedAt);
            return entryDate >= weekStart && entryDate < weekEnd;
        }).length;

        weeks.push({
            week: `Week ${6 - i}`,
            tests: weekTests
        });
    }

    return weeks;
}

/**
 * Get module breakdown statistics
 */
export function getModuleBreakdown() {
    const progress = getAllProgressData();

    const readingBands = progress.reading
        .map(e => parseFloat(e.band || 0))
        .filter(b => b > 0);
    
    const writingBands = progress.writing
        .map(e => parseFloat(e.overallBand || 0))
        .filter(b => b > 0);
    
    const listeningBands = progress.listening
        .map(e => parseFloat(e.band || 0))
        .filter(b => b > 0);

    const speakingBands = progress.speaking
        .map(e => parseFloat(e.bandScore || 0))
        .filter(b => b > 0);

    const readingAvg = readingBands.length > 0
        ? parseFloat((readingBands.reduce((sum, b) => sum + b, 0) / readingBands.length).toFixed(1))
        : 0;
    
    const writingAvg = writingBands.length > 0
        ? parseFloat((writingBands.reduce((sum, b) => sum + b, 0) / writingBands.length).toFixed(1))
        : 0;
    
    const listeningAvg = listeningBands.length > 0
        ? parseFloat((listeningBands.reduce((sum, b) => sum + b, 0) / listeningBands.length).toFixed(1))
        : 0;

    const speakingAvg = speakingBands.length > 0
        ? parseFloat((speakingBands.reduce((sum, b) => sum + b, 0) / speakingBands.length).toFixed(1))
        : 0;

    // Calculate improvement (latest - previous average)
    const readingImprovement = readingBands.length > 1
        ? parseFloat((readingBands[0] - readingAvg).toFixed(1))
        : 0;
    
    const writingImprovement = writingBands.length > 1
        ? parseFloat((writingBands[0] - writingAvg).toFixed(1))
        : 0;
    
    const listeningImprovement = listeningBands.length > 1
        ? parseFloat((listeningBands[0] - listeningAvg).toFixed(1))
        : 0;

    return {
        speaking: {
            averageBand: speakingAvg,
            attempts: progress.speaking.length,
            improvement: speakingBands.length > 1
                ? (speakingBands[0] - speakingAvg >= 0 ? '+' : '') + (speakingBands[0] - speakingAvg).toFixed(1)
                : '+0.0',
            weakAreas: ['Pronunciation', 'Fluency']
        },
        listening: {
            averageBand: listeningAvg,
            averageAccuracy: Math.round(listeningAvg * 10),
            attempts: progress.listening.length,
            improvement: listeningImprovement >= 0 ? `+${listeningImprovement}` : `${listeningImprovement}`,
            weakAreas: ['Map completion', 'Multiple choice']
        },
        reading: {
            averageBand: readingAvg,
            speed: 180,
            accuracy: Math.round(readingAvg * 10),
            attempts: progress.reading.length,
            improvement: readingImprovement >= 0 ? `+${readingImprovement}` : `${readingImprovement}`,
            weakAreas: ['True/False/Not Given', 'Matching headings']
        },
        writing: {
            task1: writingAvg,
            task2: writingAvg,
            attempts: progress.writing.length,
            improvement: writingImprovement >= 0 ? `+${writingImprovement}` : `${writingImprovement}`,
            weakAreas: ['Task 1 structure', 'Task 2 arguments']
        }
    };
}

/**
 * Get practice history for table
 */
export function getPracticeHistory(limit = 20) {
    const progress = getAllProgressData();
    const allEntries = [];

    progress.reading.forEach(entry => {
        allEntries.push({
            date: entry.submittedAt,
            type: 'Reading Test',
            band: parseFloat(entry.band || 0),
            duration: '60 min',
            feedback: `Correct: ${entry.correctCount || 0}/${entry.totalQuestions || 0}`
        });
    });

    progress.writing.forEach(entry => {
        allEntries.push({
            date: entry.submittedAt,
            type: entry.taskId?.includes('task1') ? 'Writing Task 1' : 'Writing Task 2',
            band: parseFloat(entry.overallBand || 0),
            duration: '20 min',
            feedback: `Word count: ${entry.wordCount || 0}`
        });
    });

    progress.listening.forEach(entry => {
        allEntries.push({
            date: entry.submittedAt,
            type: 'Listening Test',
            band: parseFloat(entry.band || 0),
            duration: '40 min',
            feedback: `Score: ${entry.totalScore || entry.score || 0}/${entry.totalQuestions || 40}`
        });
    });

    progress.speaking.forEach(entry => {
        allEntries.push({
            date: entry.submittedAt,
            type: entry.type === 'realtime_practice' ? 'Speaking Practice (Real-time)' : 'Speaking Practice',
            band: parseFloat(entry.bandScore || 0),
            duration: entry.type === 'realtime_practice' ? '15 min' : '2 min',
            feedback: entry.type === 'realtime_practice' ? 'Real-time conversation' : 'Recorded response'
        });
    });

    return allEntries
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
}

