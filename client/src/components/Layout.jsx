import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import Section from './ui/Section';
import {
    ChartIcon,
    InsightsIcon,
    MicIcon,
    HeadphonesIcon,
    BookIcon,
    PenIcon,
    ListIcon,
    TabsIcon,
    UserIcon,
    HelpIcon,
    MenuIcon
} from './ui/icons';
import { useAuth } from '../contexts/AuthContext';

export function AppLayout({ children }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 text-gray-900 relative">
            {/* Decorative gradient blobs */}
            <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
                <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
            </div>
            <div className="flex min-h-screen">
                <aside className="hidden md:flex md:w-72 flex-col bg-white/70 backdrop-blur-xl border-r border-slate-200/70 shadow-sm md:sticky md:top-0 md:h-screen md:overflow-y-auto">
                    <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-200">
                        <Link to="/" className="flex items-center gap-3">
                            <img 
                                src="/IeltsCoach logo.jpeg" 
                                alt="IELTS Coach Logo" 
                                className="h-10 w-auto"
                            />
                            <span className="text-xl font-extrabold text-purple-700">IELTSCoach</span>
                        </Link>
                    </div>
                    <nav className="flex-1 p-4 space-y-1">
                        <Section label="Overview" />
                        <SideLink to="/dashboard" icon={ChartIcon} label="Dashboard" />
                        <SideLink to="/performance" icon={InsightsIcon} label="Performance" />
                        <Section label="Practice" />
                        <SideLink to="/speaking" icon={MicIcon} label="Speaking Practice" />
                        <SideLink to="/listening" icon={HeadphonesIcon} label="Listening Practice" />
                        <SideLink to="/reading" icon={BookIcon} label="Reading Practice" />
                        <SideLink to="/writing" icon={PenIcon} label="Writing Practice" />
                        <SideLink to="/mcq" icon={ListIcon} label="MCQ Practice" />
                        <SideLink to="/tests" icon={TabsIcon} label="Full Test Simulator" />
                        <Section label="Games" />
                        <SideLink to="/game" icon={TabsIcon} label="Mini Games" />
                        <SideLink to="/p4game" icon={TabsIcon} label="4ps Game" />
                        <Section label="Account" />
                        <SideLink to="/profile" icon={UserIcon} label="Profile" />
                        <SideLink to="/support" icon={HelpIcon} label="Support" />
                    </nav>
                    <div className="p-4 text-xs text-slate-500">© {new Date().getFullYear()} IELTS Coach</div>
                </aside>
                <div className="flex-1 flex flex-col">
                    <Topbar />
                    <main className="flex-1 p-4 md:p-6 lg:p-8 relative">
                        {children}
                        {/* Floating Chatbot Button */}
                        <Link
                            to="/chatbot"
                            className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40 inline-flex items-center justify-center rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all w-12 h-12 md:w-14 md:h-14"
                            aria-label="Open IELTS Chatbot"
                        >
                            {/* Chat icon similar to Fiverr style */}
                            <svg
                                className="w-6 h-6 md:w-7 md:h-7"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M4 6.5C4 5.12 5.12 4 6.5 4h11A2.5 2.5 0 0 1 20 6.5v6A2.5 2.5 0 0 1 17.5 15H12l-3.5 3.5V15H6.5A2.5 2.5 0 0 1 4 12.5v-6Z" />
                                <path d="M9 9h6" />
                                <path d="M9 11.5h3.5" />
                            </svg>
                        </Link>
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


