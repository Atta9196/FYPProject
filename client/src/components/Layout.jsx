import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import Section from './ui/Section';
import { ChartIcon, InsightsIcon, MicIcon, ListIcon, TabsIcon, UserIcon, HelpIcon, MenuIcon } from './ui/icons';
import { useAuth } from '../contexts/AuthContext';

export function AppLayout({ children }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 text-gray-900">
            {/* Decorative gradient blobs */}
            <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
                <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
            </div>
            <div className="flex min-h-screen">
                <aside className="hidden md:flex md:w-72 flex-col bg-white/70 backdrop-blur-xl border-r border-slate-200/70 shadow-sm">
                    <div className="h-16 flex items-center px-6 border-b border-slate-200">
                        <Link to="/" className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-sky-500">IELTS Coach</Link>
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
                <div className="flex-1 flex flex-col">
                    <Topbar />
                    <main className="flex-1 p-4 md:p-6 lg:p-8">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}

function Topbar() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    return (
        <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-slate-200/70 flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3">
                <div className="md:hidden">
                    <button className="p-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50" aria-label="Open navigation">
                        <MenuIcon className="w-5 h-5" />
                    </button>
                </div>
                <span className="font-semibold text-slate-700">Welcome back</span>
            </div>
            <div className="flex items-center gap-3">
                <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 shadow-sm">
                    <UserIcon className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm">Profile</span>
                </Link>
                {user && (
                    <button
                        type="button"
                        onClick={() => { logout(); navigate('/login'); }}
                        className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 shadow-sm"
                    >
                        Logout
                    </button>
                )}
            </div>
        </header>
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

 

export default AppLayout;


