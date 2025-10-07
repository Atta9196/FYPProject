import React, { useState } from 'react';

export function Tabs({ tabs = [], initial = 0, onChange }) {
	const [active, setActive] = useState(initial);
	return (
		<div>
			<div className="flex gap-2 border-b border-slate-200 pb-2">
				{tabs.map((t, i) => (
					<button
						key={t.key || i}
						onClick={() => { setActive(i); onChange && onChange(i); }}
						className={`px-3 py-1.5 rounded-md text-sm ${active === i ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
					>
						{t.label}
					</button>
				))}
			</div>
			<div className="mt-4">
				{tabs[active]?.content}
			</div>
		</div>
	);
}

export default Tabs;
