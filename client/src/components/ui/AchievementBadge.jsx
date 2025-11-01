import React from 'react';

export default function AchievementBadge({ 
    name, 
    description, 
    icon, 
    earned = false, 
    progress = 0,
    onClick 
}) {
    return (
        <div 
            className={`group relative p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                earned 
                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 hover:shadow-lg transform hover:scale-105' 
                    : 'bg-gray-50 border-gray-200 opacity-60 hover:opacity-80'
            }`}
            onClick={onClick}
        >
            <div className="flex items-center gap-3">
                <div className={`text-3xl transition-all duration-300 ${
                    earned ? 'animate-bounce' : 'grayscale'
                }`}>
                    {icon}
                </div>
                
                <div className="flex-1">
                    <h4 className={`text-sm font-semibold ${
                        earned ? 'text-slate-800' : 'text-gray-500'
                    }`}>
                        {name}
                    </h4>
                    <p className={`text-xs ${
                        earned ? 'text-slate-600' : 'text-gray-400'
                    }`}>
                        {description}
                    </p>
                    
                    {!earned && progress > 0 && (
                        <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-1">
                                <div 
                                    className="bg-blue-500 h-1 rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{progress}% complete</p>
                        </div>
                    )}
                </div>
                
                {earned && (
                    <div className="text-yellow-500 animate-pulse">
                        🏆
                    </div>
                )}
            </div>
            
            {earned && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-xs">✓</span>
                </div>
            )}
        </div>
    );
}
