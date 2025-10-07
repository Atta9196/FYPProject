import React from 'react';

export default function Loader({ label = 'Loading...' }) {
    return (
        <div className="flex items-center gap-3 text-slate-600">
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" className="opacity-20" /><path d="M22 12a10 10 0 00-10-10" /></svg>
            <span className="text-sm">{label}</span>
        </div>
    );
}


