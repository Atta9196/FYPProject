import React from 'react';

export default function Button({ variant = 'primary', className = '', children, ...props }) {
    const base = 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2';
    const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 focus:ring-slate-400',
        danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500',
        ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-400',
    };
    return (
        <button className={`${base} ${variants[variant]} ${className}`} {...props}>{children}</button>
    );
}


