import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Floating chatbot button that survives mobile pinch-zoom.
 *
 * Why this component exists:
 * Plain `position: fixed` is relative to the *layout viewport*. When a user
 * pinch-zooms on mobile, the *visual viewport* shrinks and offsets, leaving
 * fixed-positioned elements (like a floating "chat" button) outside the
 * visible area. We use the Visual Viewport API to track the visible area and
 * dynamically shift the button so it stays in the bottom-right of what the
 * user can see, even while zoomed.
 *
 * Also respects iOS safe-area-inset for notched devices / home indicator.
 */
export default function FloatingChatButton({ to = '/chatbot', ariaLabel = 'Open IELTS Chatbot' }) {
    const [offsets, setOffsets] = useState({ bottom: 16, right: 16 });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const vv = window.visualViewport;
        if (!vv) return;

        const update = () => {
            const layoutW = document.documentElement.clientWidth;
            const layoutH = document.documentElement.clientHeight;
            const bottomGap = Math.max(0, layoutH - (vv.offsetTop + vv.height));
            const rightGap = Math.max(0, layoutW - (vv.offsetLeft + vv.width));
            setOffsets({
                bottom: bottomGap + 16,
                right: rightGap + 16,
            });
        };

        update();
        vv.addEventListener('resize', update);
        vv.addEventListener('scroll', update);
        return () => {
            vv.removeEventListener('resize', update);
            vv.removeEventListener('scroll', update);
        };
    }, []);

    return (
        <Link
            to={to}
            style={{
                bottom: `max(${offsets.bottom}px, calc(env(safe-area-inset-bottom, 0px) + 16px))`,
                right: `max(${offsets.right}px, calc(env(safe-area-inset-right, 0px) + 16px))`,
            }}
            className="fixed z-40 inline-flex items-center justify-center rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all w-12 h-12 md:w-14 md:h-14"
            aria-label={ariaLabel}
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
    );
}
