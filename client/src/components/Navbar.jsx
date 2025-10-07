import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Search, Bell } from 'lucide-react';

export default function Navbar({ onToggleTheme }) {
    return (
		<header className="h-16 bg-white/70 backdrop-blur-xl border-b border-slate-200/70 flex items-center justify-between px-4 md:px-6 shadow-sm">
			<div className="flex items-center gap-4">
				<Link to="/" className="text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-sky-500">IELTS Coach</Link>
				<div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white">
					<Search className="w-4 h-4 text-slate-400" />
					<input placeholder="Search" className="outline-none text-sm placeholder-slate-400 bg-transparent" />
                    </div>
                </div>
			<div className="flex items-center gap-2">
				<button className="p-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50" onClick={onToggleTheme} aria-label="Toggle theme">
					<Sun className="w-4 h-4" />
                            </button>
				<button className="p-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50" aria-label="Notifications">
					<Bell className="w-4 h-4" />
                            </button>
				<Link to="/profile" className="ml-2 w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600" />
                                    </div>
		</header>
    );
}
