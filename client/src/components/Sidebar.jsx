import React from 'react';
import { NavLink } from 'react-router-dom';
import Section from './ui/Section';
import { ChartIcon, InsightsIcon, MicIcon, ListIcon, TabsIcon, UserIcon, HelpIcon } from './ui/icons';

export default function Sidebar() {
    return (
        <aside className="hidden md:flex md:w-72 flex-col bg-white/70 backdrop-blur-xl border-r border-slate-200/70 shadow-sm">
            <div className="h-16 flex items-center px-6 border-b border-slate-200">
                <div className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-sky-500">IELTS Coach</div>
            </div>
            <nav className="flex-1 p-4 space-y-1">
                <Section label="Overview" />
                <SideLink to="/dashboard" icon={ChartIcon} label="Dashboard" />
                <SideLink to="/performance" icon={InsightsIcon} label="Performance" />
                <Section label="Practice" />
                <SideLink to="/speaking" icon={MicIcon} label="Speaking Practice" />
                <SideLink to="/mcq" icon={ListIcon} label="MCQ Practice" />
                <SideLink to="/tests" icon={TabsIcon} label="Full Test Simulator" />
                <Section label="Account" />
                <SideLink to="/profile" icon={UserIcon} label="Profile" />
                <SideLink to="/support" icon={HelpIcon} label="Support" />
            </nav>
            <div className="p-4 text-xs text-slate-500">© {new Date().getFullYear()} IELTS Coach</div>
        </aside>
    );
}

function SideLink({ to, icon: Icon, label }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all ${isActive ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`}
        >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
        </NavLink>
    );
}


