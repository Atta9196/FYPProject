import React from 'react';

export default function StatCard({ title, value, accent }) {
    return (
        <div className={`rounded-2xl p-6 border shadow-sm bg-white ${accent}`}>
            <div className="text-sm text-slate-600">{title}</div>
            <div className="mt-2 text-3xl font-extrabold">{value}</div>
        </div>
    );
}


