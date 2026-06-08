import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const NAV_ITEMS = [
    { key: "home", label: "Home", to: "/" },
    { key: "features", label: "Features", to: "/#features" },
    { key: "about", label: "About US", to: "/about" },
    { key: "services", label: "Our Services", to: "/services" },
    { key: "contact", label: "Contact", to: "/contact" },
];

function getActiveKey(pathname, hash) {
    if (pathname === "/about") return "about";
    if (pathname === "/services") return "services";
    if (pathname === "/contact") return "contact";
    if (pathname === "/" && hash === "#features") return "features";
    if (pathname === "/") return "home";
    return null;
}

export default function PublicSiteNav() {
    const { user } = useAuth();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const activeKey = getActiveKey(location.pathname, location.hash);

    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname, location.hash]);

    useEffect(() => {
        if (!mobileOpen) return;
        const original = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = original;
        };
    }, [mobileOpen]);

    const navLinkClass = (key) =>
        `transition-all duration-300 hover:scale-105 ${
            activeKey === key
                ? "text-purple-700 font-semibold"
                : "text-slate-700 hover:text-purple-700"
        }`;

    return (
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-200/30">
            <div className="max-w-[1400px] mx-auto flex justify-between items-center px-4 sm:px-6 md:px-10 py-3 sm:py-4">
                <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
                    <img
                        src="/IeltsCoach logo.jpeg"
                        alt="IELTS Coach Logo"
                        className="h-10 sm:h-12 w-auto transition-transform duration-300 group-hover:scale-110 shrink-0"
                    />
                    <span className="text-xl sm:text-2xl font-extrabold text-purple-700 leading-tight transition-colors duration-300 group-hover:text-purple-800 truncate">
                        IELTSCoach
                    </span>
                </Link>

                <nav className="hidden md:flex items-center gap-6 text-base font-normal">
                    {NAV_ITEMS.map((item) => (
                        <Link key={item.key} to={item.to} className={navLinkClass(item.key)}>
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="hidden md:flex items-center gap-3">
                    {!user ? (
                        <>
                            <Link
                                to="/login"
                                className="px-4 py-2 rounded-md border border-purple-600 text-purple-600 font-semibold text-sm hover:bg-purple-50 transition-all"
                            >
                                Login
                            </Link>
                            <Link
                                to="/register"
                                className="px-5 py-2.5 rounded-md text-white font-semibold text-sm bg-purple-600 hover:bg-purple-700 transition-all"
                            >
                                Register
                            </Link>
                        </>
                    ) : (
                        <Link
                            to="/dashboard"
                            className="px-5 py-2.5 rounded-lg text-white font-semibold text-sm bg-purple-600 hover:bg-purple-700 transition-all"
                        >
                            Go to Dashboard
                        </Link>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => setMobileOpen((v) => !v)}
                    aria-label={mobileOpen ? "Close menu" : "Open menu"}
                    aria-expanded={mobileOpen}
                    className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-slate-700 hover:bg-slate-100 border border-slate-200"
                >
                    {mobileOpen ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>
            </div>

            {mobileOpen && (
                <>
                    <div
                        className="md:hidden fixed inset-0 top-[60px] z-30 bg-slate-900/40"
                        onClick={() => setMobileOpen(false)}
                        aria-hidden="true"
                    />
                    <div className="md:hidden border-b border-slate-200 bg-white shadow-lg relative z-40">
                        <nav className="flex flex-col px-4 py-2 text-base font-medium text-slate-700">
                            {NAV_ITEMS.map((item) => (
                                <Link
                                    key={item.key}
                                    to={item.to}
                                    className={`py-3 ${activeKey === item.key ? "text-purple-700 font-semibold" : "hover:text-purple-700"}`}
                                    onClick={() => setMobileOpen(false)}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                        <div className="border-t border-slate-200 px-4 py-3 flex flex-col gap-2">
                            {!user ? (
                                <>
                                    <Link
                                        to="/login"
                                        className="w-full text-center px-4 py-2 rounded-md border border-purple-600 text-purple-600 font-semibold text-sm hover:bg-purple-50"
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="w-full text-center px-5 py-2.5 rounded-md text-white font-semibold text-sm bg-purple-600 hover:bg-purple-700"
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        Register
                                    </Link>
                                </>
                            ) : (
                                <Link
                                    to="/dashboard"
                                    className="w-full text-center px-5 py-2.5 rounded-lg text-white font-semibold text-sm bg-purple-600 hover:bg-purple-700"
                                    onClick={() => setMobileOpen(false)}
                                >
                                    Go to Dashboard
                                </Link>
                            )}
                        </div>
                    </div>
                </>
            )}
        </header>
    );
}
