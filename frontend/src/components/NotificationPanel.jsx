import { useRef, useEffect } from "react";
import { useNotifications } from "@/context/NotificationContext";

/**
 * Notification type → icon & color mapping.
 */
const TYPE_CONFIG = {
    payment_approved: { icon: "✅", accent: "text-emerald-400", bg: "bg-emerald-500/10", label: "Approved" },
    payment_rejected: { icon: "❌", accent: "text-red-400", bg: "bg-red-500/10", label: "Rejected" },
    payment_pending: { icon: "⏳", accent: "text-amber-400", bg: "bg-amber-500/10", label: "Pending" },
    bill_generated: { icon: "💰", accent: "text-blue-400", bg: "bg-blue-500/10", label: "Bill" },
    distribution_settled: { icon: "💸", accent: "text-violet-400", bg: "bg-violet-500/10", label: "Settled" },
    new_approval: { icon: "🔔", accent: "text-cyan-400", bg: "bg-cyan-500/10", label: "New Request" },
};

function getConfig(type) {
    return TYPE_CONFIG[type] || { icon: "🔔", accent: "text-[#8a8f98]", bg: "bg-[#1a1f2e]/30", label: "Alert" };
}

/**
 * Relative time string (e.g., "2m ago", "1h ago", "3d ago").
 */
function timeAgo(dateStr) {
    if (!dateStr) return "";
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * Premium notification panel dropdown.
 * Props: isOpen, onClose
 */
export default function NotificationPanel({ isOpen, onClose }) {
    const { notifications, unreadCount, markRead, markAllRead, dismiss, clearAll } = useNotifications();
    const panelRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={panelRef}
            className="fixed top-16 left-4 right-4 w-auto z-[100] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-96 sm:z-50 bg-[#0f1117]/98 backdrop-blur-xl border border-[#1a1f2e]/60 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up"
            style={{ transform: "translateZ(0)", isolation: "isolate" }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1a1f2e]/60">
                <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                        <span className="bg-[#3861fb] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllRead}
                            className="text-[#3861fb] text-xs font-medium hover:text-[#5a7fff] transition-colors cursor-pointer"
                        >
                            Mark all read
                        </button>
                    )}
                    {notifications.some((n) => n.is_read) && (
                        <button
                            onClick={clearAll}
                            className="text-[#8a8f98] text-xs hover:text-white transition-colors cursor-pointer"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto overscroll-contain">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6">
                        <div className="text-4xl mb-3 opacity-40">🔕</div>
                        <p className="text-[#8a8f98] text-sm">No notifications yet</p>
                        <p className="text-[#5a5f68] text-xs mt-1">You're all caught up!</p>
                    </div>
                ) : (
                    notifications.map((n) => {
                        const cfg = getConfig(n.type);
                        return (
                            <div
                                key={n.id}
                                className={`group flex items-start gap-3 px-5 py-3.5 border-b border-[#1a1f2e]/30 transition-colors cursor-pointer
                                    ${n.is_read ? "opacity-60 hover:opacity-80" : "hover:bg-[#1a1f2e]/20"}`}
                                onClick={() => !n.is_read && markRead(n.id)}
                            >
                                {/* Icon */}
                                <div className={`mt-0.5 w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center text-sm shrink-0`}>
                                    {cfg.icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`text-sm leading-snug ${n.is_read ? "text-[#8a8f98]" : "text-white"}`}>
                                            {n.message}
                                        </p>
                                        {/* Dismiss */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                                            className="text-[#5a5f68] hover:text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className={`text-[10px] font-medium ${cfg.accent} ${cfg.bg} px-1.5 py-0.5 rounded`}>
                                            {cfg.label}
                                        </span>
                                        <span className="text-[#5a5f68] text-[10px]">
                                            {timeAgo(n.created_at)}
                                        </span>
                                        {!n.is_read && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#3861fb] animate-pulse" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
