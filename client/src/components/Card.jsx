import React from 'react';

export default function Card({ className = '', children }) {
    return (
        <div className={`rounded-2xl bg-white border border-slate-200 shadow-sm ${className}`}>
            {children}
        </div>
    );
}


