import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { getAllProgressData } from '../../services/progressService';

export default function WeeklyStudyGraph({ data, height = 200 }) {
    const [chartData, setChartData] = useState([
        { day: 'Mon', hours: 0, tests: 0 },
        { day: 'Tue', hours: 0, tests: 0 },
        { day: 'Wed', hours: 0, tests: 0 },
        { day: 'Thu', hours: 0, tests: 0 },
        { day: 'Fri', hours: 0, tests: 0 },
        { day: 'Sat', hours: 0, tests: 0 },
        { day: 'Sun', hours: 0, tests: 0 }
    ]);

    useEffect(() => {
        const loadWeeklyData = () => {
            if (data) {
                setChartData(data);
                return;
            }

            try {
                const progress = getAllProgressData();
                const allEntries = [
                    ...progress.reading,
                    ...progress.writing,
                    ...progress.listening,
                    ...progress.speaking
                ];

                // Get last 7 days
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const weeklyData = days.map((day, index) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - index));
                    date.setHours(0, 0, 0, 0);
                    const nextDate = new Date(date);
                    nextDate.setDate(nextDate.getDate() + 1);

                    const dayEntries = allEntries.filter(entry => {
                        const entryDate = new Date(entry.submittedAt);
                        return entryDate >= date && entryDate < nextDate;
                    });

                    const tests = dayEntries.length;
                    const hours = Math.round(tests * 1.2 * 10) / 10; // Estimate 1.2 hours per test

                    return { day, hours, tests };
                });

                setChartData(weeklyData);
            } catch (error) {
                console.error("Error loading weekly data:", error);
            }
        };

        loadWeeklyData();

        // Update every 5 seconds
        const interval = setInterval(loadWeeklyData, 5000);

        // Listen for progress updates
        const handleProgressUpdate = () => {
            loadWeeklyData();
        };
        window.addEventListener('progressUpdated', handleProgressUpdate);

        return () => {
            clearInterval(interval);
            window.removeEventListener('progressUpdated', handleProgressUpdate);
        };
    }, [data]);

    return (
        <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-800">Weekly Study Activity</h3>
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-slate-600">Study Hours</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-slate-600">Tests Completed</span>
                    </div>
                </div>
            </div>
            
            <div style={{ height: `${height}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis 
                            dataKey="day" 
                            stroke="#64748B"
                            fontSize={12}
                        />
                        <YAxis 
                            stroke="#64748B"
                            fontSize={12}
                        />
                        <Tooltip 
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="hours" 
                            stroke="#3B82F6" 
                            fillOpacity={1} 
                            fill="url(#colorHours)"
                            strokeWidth={2}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="tests" 
                            stroke="#10B981" 
                            strokeWidth={3}
                            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
