import { useNavigate } from "react-router-dom";
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

export default function NotificationsPage() {
    const navigate = useNavigate();
    const { notifications, unreadCount, markRead, markAllRead, dismiss, clearAll } = useNotifications();

    return (
        <div className="min-h-screen bg-[#0a0a12] text-white flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#0f1117]/80 backdrop-blur-2xl border-b border-white/10">
                <div className="flex items-center px-4 h-16 gap-4">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all active:scale-90 cursor-pointer"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-white font-bold text-xl tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>Notifications</h1>
                    <div className="ml-auto flex items-center gap-2">
                        {unreadCount > 0 && (
                            <span className="bg-[#3b82f6] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {/* Content actions */}
            {notifications.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1f2e]/30">
                    <div className="text-sm text-[#8a8f98]">
                        {notifications.length} {notifications.length === 1 ? 'Notification' : 'Notifications'}
                    </div>
                    <div className="flex items-center gap-3">
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-[#3861fb] text-sm font-medium hover:text-[#5a7fff] transition-colors cursor-pointer"
                            >
                                Mark all read
                            </button>
                        )}
                        {notifications.some((n) => n.is_read) && (
                            <button
                                onClick={clearAll}
                                className="text-[#8a8f98] text-sm hover:text-white transition-colors cursor-pointer"
                            >
                                Clear read
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto w-full max-w-3xl mx-auto align-middle">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6">
                        <div className="text-6xl mb-4 opacity-40">🔕</div>
                        <p className="text-[#8a8f98] text-base">No notifications yet</p>
                        <p className="text-[#5a5f68] text-sm mt-1">You're all caught up!</p>
                    </div>
                ) : (
                    notifications.map((n) => {
                        const cfg = getConfig(n.type);
                        return (
                            <div
                                key={n.id}
                                className={`group flex items-start gap-3 px-4 sm:px-5 py-4 border-b border-[#1a1f2e]/30 transition-colors cursor-pointer
                                    ${n.is_read ? "opacity-60 hover:opacity-80" : "hover:bg-[#1a1f2e]/20"}`}
                                onClick={() => !n.is_read && markRead(n.id)}
                            >
                                {/* Icon */}
                                <div className={`mt-0.5 w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center text-lg shrink-0`}>
                                    {cfg.icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`text-sm leading-snug sm:text-base ${n.is_read ? "text-[#8a8f98]" : "text-white"}`}>
                                            {n.message}
                                        </p>
                                        {/* Dismiss */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                                            className="text-[#5a5f68] hover:text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer pl-2"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`text-[10px] sm:text-xs font-medium ${cfg.accent} ${cfg.bg} px-2 py-0.5 rounded-md`}>
                                            {cfg.label}
                                        </span>
                                        <span className="text-[#5a5f68] text-xs">
                                            {timeAgo(n.created_at)}
                                        </span>
                                        {!n.is_read && (
                                            <span className="w-2 h-2 rounded-full bg-[#3861fb] animate-pulse ml-1" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            {/* Some bottom spacing for mobile */}
            <div className="h-6"></div>
        </div>
    );
}
