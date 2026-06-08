import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function useScrollToHash() {
    const { pathname, hash } = useLocation();

    useEffect(() => {
        if (pathname !== "/" || !hash) return;

        const id = hash.replace("#", "");
        const scrollToTarget = () => {
            const el = document.getElementById(id);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        };

        const timer = window.setTimeout(scrollToTarget, 100);
        return () => window.clearTimeout(timer);
    }, [pathname, hash]);
}
