import React from 'react';
import { Mic } from 'lucide-react';

export default function MicButton({ state = 'idle', onClick }) {
	const pulsing = state === 'recording' ? 'animate-pulse-slow ring-4 ring-blue-300/50' : '';
	return (
		<button
			onClick={onClick}
			className={`relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-lg hover:brightness-110 transition ${pulsing}`}
			aria-label="Microphone"
		>
			<div className="absolute inset-0 rounded-full bg-white/10" />
			<Mic className="w-7 h-7 m-auto relative z-10" />
		</button>
	);
}
