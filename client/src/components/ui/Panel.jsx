import React from 'react';

export default function Panel({ title, actions, className = '', children }) {
    return (
        <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 p-6 shadow-sm transition-colors ${className}`}>
            {(title || actions) && (
                <div className="flex items-center justify-between mb-4">
                    {title && <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>}
                    {actions}
                </div>
            )}
            {children}
        </div>
    );
}


