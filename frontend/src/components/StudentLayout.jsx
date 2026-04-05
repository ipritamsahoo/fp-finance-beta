import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNotifications } from "@/context/NotificationContext";
import ProfilePicture from "./ProfilePicture";

const studentNav = [
    { label: "Dashboard", href: "/student", icon: "dashboard" },
    { label: "Payments", href: "/student/payments", icon: "payments" },
    { label: "Leaderboard", href: "/student/leaderboard", icon: "emoji_events" },
    { label: "Settings", href: "/student/settings", icon: "settings" },
];

export default function StudentLayout({ children }) {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { unreadCount } = useNotifications() || {};

    return (
        <div className="student-theme min-h-screen bg-[#0c0e17] text-[#f0f0fd] relative" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* ── Nebula Background Glows ── */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] nebula-glow-1" />
                <div className="absolute top-1/4 right-0 w-full h-full nebula-glow-2" />
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#0c0e17] to-transparent" />
            </div>

            {/* ── Mobile Top Header ── */}
            <header className="md:hidden fixed top-0 left-0 right-0 z-50 student-top-bar">
                <div className="flex items-center justify-between px-6 h-16">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-[#c799ff]/30 overflow-hidden">
                            <ProfilePicture size={40} />
                        </div>
                        <span
                            className="text-xl font-extrabold bg-gradient-to-br from-purple-400 to-cyan-300 bg-clip-text text-transparent tracking-tight"
                            style={{ fontFamily: "'Manrope', sans-serif" }}
                        >
                            FP Finance
                        </span>
                    </div>
                    <button
                        onClick={() => navigate("/notifications")}
                        className="relative w-10 h-10 flex items-center justify-center rounded-full text-[#c799ff] hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined">notifications</span>
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-[#ff6e84] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 border border-[#0c0e17] animate-pulse">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* ── Desktop Sidebar ── */}
            <aside className="hidden md:flex fixed top-0 left-0 h-full z-40 w-64 flex-col"
                style={{ background: "rgba(12, 14, 23, 0.95)", backdropFilter: "blur(40px)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                {/* Logo */}
                <div className="p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="FP Finance Logo" className="w-10 h-10 rounded-xl shadow-lg shadow-[#c799ff]/25 object-cover" />
                        <div>
                            <h1
                                className="text-lg font-extrabold bg-gradient-to-br from-purple-400 to-cyan-300 bg-clip-text text-transparent tracking-tight"
                                style={{ fontFamily: "'Manrope', sans-serif" }}
                            >
                                FP Finance
                            </h1>
                            <p className="text-[#aaaab7] text-xs">Future Point</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {studentNav.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200
                                    ${isActive
                                        ? "bg-[#c799ff]/10 text-[#c799ff] border border-[#c799ff]/20 shadow-[0_0_15px_rgba(199,153,255,0.1)]"
                                        : "text-[#aaaab7] hover:text-[#f0f0fd] hover:bg-white/5"
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-xl ${isActive ? "material-symbols-filled" : ""}`}>{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Desktop notification + version */}
                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={() => navigate("/notifications")}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-sm text-[#aaaab7] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-xl">notifications</span>
                            <span className="font-medium">Notifications</span>
                        </div>
                        {unreadCount > 0 && (
                            <span className="min-w-[20px] h-5 bg-[#ff6e84] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 animate-pulse">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                    </button>
                    <p className="text-center text-[#464752] text-[10px] mt-3">FP Finance v{__APP_VERSION__}</p>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className="relative z-10 md:ml-64 min-h-screen flex flex-col">
                {/* Content area with proper padding for mobile + desktop */}
                <div className="px-6 pt-24 pb-32 md:px-8 md:pt-8 md:pb-8 max-w-4xl w-full mx-auto flex-1">
                    {children}
                </div>
            </main>

            {/* ── Mobile Bottom Navigation ── */}
            <nav className="md:hidden student-bottom-nav">
                <div className="flex justify-around items-center px-4 pt-3 pb-6">
                    {studentNav.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={`flex flex-col items-center justify-center transition-all duration-200 cursor-pointer
                                    ${isActive
                                        ? "text-cyan-300 bg-cyan-500/10 rounded-full px-4 py-1"
                                        : "text-slate-400 opacity-60 hover:opacity-100 hover:text-white"
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-2xl ${isActive ? "material-symbols-filled" : ""}`}>
                                    {item.icon}
                                </span>
                                <span
                                    className="text-[10px] font-medium uppercase tracking-widest mt-1"
                                    style={{ fontFamily: "'Inter', sans-serif" }}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
