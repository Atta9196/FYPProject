import React from 'react';

export default function StatCard({ title, value, change, icon, color = 'blue', progress, showProgress = false }) {
    const colorClasses = {
        blue: 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100',
        green: 'border-green-200 bg-gradient-to-br from-green-50 to-green-100',
        purple: 'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100',
        orange: 'border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100'
    };

    const progressColors = {
        blue: 'stroke-blue-500',
        green: 'stroke-green-500',
        purple: 'stroke-purple-500',
        orange: 'stroke-orange-500'
    };

    const changeColors = {
        blue: 'text-blue-600',
        green: 'text-green-600',
        purple: 'text-purple-600',
        orange: 'text-orange-600'
    };

    return (
        <div className={`rounded-2xl p-6 border shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 ${colorClasses[color]}`}>
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="text-sm text-slate-600 font-medium">{title}</div>
                    <div className="mt-2 text-3xl font-extrabold text-slate-900">{value}</div>
                    {change && (
                        <div className={`text-sm font-medium ${changeColors[color]}`}>{change}</div>
                    )}
                </div>
                
                {showProgress && progress !== undefined ? (
                    <div className="relative w-16 h-16">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                            <path
                                className="stroke-slate-200"
                                strokeWidth="3"
                                fill="none"
                                d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                                className={`${progressColors[color]} transition-all duration-1000 ease-out`}
                                strokeWidth="3"
                                strokeLinecap="round"
                                fill="none"
                                strokeDasharray={`${progress}, 100`}
                                d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-slate-700">{Math.round(progress)}%</span>
                        </div>
                    </div>
                ) : (
                    icon && (
                        <div className="text-3xl opacity-80">{icon}</div>
                    )
                )}
            </div>
        </div>
    );
}


