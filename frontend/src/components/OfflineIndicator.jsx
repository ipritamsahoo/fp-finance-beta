import { useState, useEffect } from "react";

export default function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    if (isOnline) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-[#0a0a12] p-6 animate-in fade-in duration-300">
            <div className="flex flex-col items-center max-w-sm mx-auto">
                {/* Custom Wi-Fi Error Icon matching the user's reference */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="72"
                    height="72"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#8a8f98"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mb-6 opacity-80"
                >
                    <path d="M2.5 9A16 16 0 0 1 21.5 9" />
                    <path d="M6.5 13A11 11 0 0 1 17.5 13" />
                    <circle cx="12" cy="20" r="1.5" fill="#8a8f98" stroke="none" />
                    {/* The exclamation mark line replacing the inner arcs */}
                    <line x1="12" y1="10" x2="12" y2="16" />
                </svg>

                <h2 className="text-[22px] font-bold text-white mb-2 text-center tracking-wide">
                    No Internet Connection
                </h2>
                <p className="text-[#8a8f98] text-center text-[15px] leading-relaxed">
                    Please check your connection and try again.
                </p>
            </div>
        </div>
    );
}
