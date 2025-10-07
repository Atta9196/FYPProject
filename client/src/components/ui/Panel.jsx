import React from 'react';

export default function Panel({ title, actions, className = '', children }) {
    return (
        <div className={`rounded-2xl bg-white border border-slate-200 p-6 shadow-sm ${className}`}>
            {(title || actions) && (
                <div className="flex items-center justify-between mb-4">
                    {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
                    {actions}
                </div>
            )}
            {children}
        </div>
    );
}


