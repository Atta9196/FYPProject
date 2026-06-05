import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
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
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    // Auto-close mobile drawer when route changes
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // Lock body scroll while mobile drawer is open
    useEffect(() => {
        if (sidebarOpen) {
            const original = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = original; };
        }
    }, [sidebarOpen]);

    // Close drawer on Escape key
    useEffect(() => {
        if (!sidebarOpen) return;
        const onKey = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [sidebarOpen]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 text-gray-900 dark:text-slate-100 relative transition-colors">
            {/* Decorative gradient blobs */}
            <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-200/40 dark:bg-indigo-900/30 blur-3xl" />
                <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-sky-200/40 dark:bg-sky-900/30 blur-3xl" />
            </div>

            {/* Mobile overlay backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            <div className="flex min-h-screen">
                <aside
                    className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex-col bg-white dark:bg-slate-800 backdrop-blur-xl border-r border-slate-200/70 dark:border-slate-700 shadow-xl md:shadow-sm transition-transform duration-300 ease-out md:sticky md:top-0 md:z-auto md:flex md:h-screen md:translate-x-0 md:overflow-y-auto md:bg-white/70 dark:md:bg-slate-800/90 ${sidebarOpen ? 'flex translate-x-0' : 'hidden -translate-x-full md:flex'}`}
                >
                    <div className="h-16 flex items-center justify-between gap-3 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-700">
                        <Link to="/" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
                            <img
                                src="/IeltsCoach logo.jpeg"
                                alt="IELTS Coach Logo"
                                className="h-10 w-auto"
                            />
                            <span className="text-xl font-extrabold text-purple-700 dark:text-purple-300">IELTSCoach</span>
                        </Link>
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(false)}
                            className="md:hidden p-2 -mr-2 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                            aria-label="Close navigation"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        <Section label="Overview" />
                        <SideLink to="/dashboard" icon={ChartIcon} label="Dashboard" onNavigate={() => setSidebarOpen(false)} />
                        <SideLink to="/performance" icon={InsightsIcon} label="Performance" onNavigate={() => setSidebarOpen(false)} />
                        <Section label="Practice" />
                        <SideLink to="/speaking" icon={MicIcon} label="Speaking Practice" onNavigate={() => setSidebarOpen(false)} />
                        <SideLink to="/listening" icon={HeadphonesIcon} label="Listening Practice" onNavigate={() => setSidebarOpen(false)} />
                        <SideLink to="/reading" icon={BookIcon} label="Reading Practice" onNavigate={() => setSidebarOpen(false)} />
                        <SideLink to="/writing" icon={PenIcon} label="Writing Practice" onNavigate={() => setSidebarOpen(false)} />
                        <SideLink to="/mcq" icon={ListIcon} label="MCQ Practice" onNavigate={() => setSidebarOpen(false)} />
                        <SideLink to="/tests" icon={TabsIcon} label="Full Test Simulator" onNavigate={() => setSidebarOpen(false)} />
                        <Section label="Games" />
                        <SideLink to="/game" icon={TabsIcon} label="Mini Games" onNavigate={() => setSidebarOpen(false)} />
                        <SideLink to="/p4game" icon={TabsIcon} label="4ps Game" onNavigate={() => setSidebarOpen(false)} />
                        <Section label="Account" />
                        <SideLink to="/profile" icon={UserIcon} label="Profile" onNavigate={() => setSidebarOpen(false)} />
                        <SideLink to="/support" icon={HelpIcon} label="Support" onNavigate={() => setSidebarOpen(false)} />
                    </nav>
                    <div className="p-4 text-xs text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} IELTS Coach</div>
                </aside>

                <div className="flex-1 flex flex-col min-w-0">
                    <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
                    <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 relative dark:bg-slate-900/50 transition-colors min-w-0">
                        {children}
                        {/* Floating Chatbot Button */}
                        <Link
                            to="/chatbot"
                            className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-40 inline-flex items-center justify-center rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all w-12 h-12 md:w-14 md:h-14"
                            aria-label="Open IELTS Chatbot"
                        >
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

function Topbar({ onOpenSidebar }) {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
    const avatarButtonRef = useRef(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!dropdownOpen || !avatarButtonRef.current) return;
        const rect = avatarButtonRef.current.getBoundingClientRect();
        const gap = 8;
        const scrollbarGap = 24;
        const right = Math.max(scrollbarGap, window.innerWidth - rect.right + 12);
        setDropdownPosition({
            top: rect.bottom + gap,
            right,
        });
    }, [dropdownOpen]);

    useEffect(() => {
        function handleClickOutside(e) {
            const inAvatar = avatarButtonRef.current?.contains(e.target);
            const inDropdown = dropdownRef.current?.contains(e.target);
            if (!inAvatar && !inDropdown) setDropdownOpen(false);
        }
        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [dropdownOpen]);

    const displayName = user?.displayName
        || (user?.firstName || user?.lastName ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() : null)
        || user?.name
        || user?.email?.split('@')[0]
        || 'User';
    const avatarSrc = user?.photoURL || user?.profilePicture || null;
    const initials = (user?.firstName?.charAt(0) || user?.name?.split(' ')[0]?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase();

    const dropdownContent = dropdownOpen && user && (
        <div
            ref={dropdownRef}
            className="fixed w-64 max-w-[calc(100vw-1rem)] rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-xl py-2"
            style={{
                top: dropdownPosition.top,
                right: dropdownPosition.right,
                zIndex: 99999,
            }}
        >
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-600">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate" title={displayName}>
                    {displayName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5" title={user?.email}>
                    {user?.email}
                </p>
            </div>
            <Link
                to="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
                <UserIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                Profile &amp; settings
            </Link>
            <div className="border-t border-slate-100 dark:border-slate-600 mt-1 pt-1">
                <button
                    type="button"
                    onClick={() => {
                        setDropdownOpen(false);
                        logout();
                        navigate('/login');
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                </button>
            </div>
        </div>
    );

    return (
        <>
            <header className="h-16 bg-white/70 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-700 flex items-center justify-between px-3 sm:px-4 md:px-6 shrink-0 transition-colors sticky top-0 z-30">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                        type="button"
                        onClick={onOpenSidebar}
                        className="md:hidden p-2 -ml-1 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 shrink-0"
                        aria-label="Open navigation"
                    >
                        <MenuIcon className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                    </button>
                    <span className="font-semibold text-slate-700 dark:text-slate-200 truncate text-sm sm:text-base">
                        Welcome back{user && (displayName ? `, ${displayName}` : '')}
                    </span>
                </div>
                <div className="flex items-center justify-end shrink-0">
                    {user && (
                        <button
                            ref={avatarButtonRef}
                            type="button"
                            onClick={() => setDropdownOpen((v) => !v)}
                            className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                            aria-expanded={dropdownOpen}
                            aria-haspopup="true"
                            aria-label="Account menu"
                        >
                            {avatarSrc ? (
                                <img
                                    src={avatarSrc}
                                    alt=""
                                    className="w-9 h-9 rounded-full object-cover border-2 border-slate-200 hover:border-purple-400 transition-colors"
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold border-2 border-slate-200 hover:border-purple-400 transition-colors">
                                    {initials}
                                </div>
                            )}
                        </button>
                    )}
                </div>
            </header>
            {typeof document !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
        </>
    );
}

function SideLink({ to, icon: Icon, label, onNavigate }) {
    return (
        <NavLink
            to={to}
            onClick={onNavigate}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all ${isActive ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-sm' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
        >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{label}</span>
        </NavLink>
    );
}



export default AppLayout;
