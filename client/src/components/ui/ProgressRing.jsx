import React from 'react';

export default function ProgressRing({ 
    progress, 
    size = 120, 
    strokeWidth = 8, 
    color = '#3B82F6', 
    backgroundColor = '#E2E8F0',
    showPercentage = true,
    children 
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${circumference} ${circumference}`;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg
                width={size}
                height={size}
                className="transform -rotate-90"
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={backgroundColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
                {children || (
                    showPercentage && (
                        <div className="text-center">
                            <div className="text-2xl font-bold text-slate-800">
                                {Math.round(progress)}%
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
