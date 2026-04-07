import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNotifications } from "@/context/NotificationContext";
import ProfilePicture from "./ProfilePicture";

// ── Heavy inertia cubic-bezier(0.85, 0, 0.15, 1) solver ──
const heavyInertia = (progress) => {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;
    const x1 = 0.85, y1 = 0, x2 = 0.15, y2 = 1;
    let t = progress;
    for (let i = 0; i < 8; i++) {
        const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
        const x = ((ax * t + bx) * t + cx) * t - progress;
        const dx = (3 * ax * t + 2 * bx) * t + cx;
        if (Math.abs(x) < 1e-7) break;
        t = Math.max(0, Math.min(1, t - x / dx));
    }
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    return ((ay * t + by) * t + cy) * t;
};
const teacherNav = [
    { label: "Dashboard", href: "/teacher", icon: "dashboard" },
    { label: "Payments", href: "/teacher/payments", icon: "receipt_long" },
    { label: "Distribution", href: "/teacher/distribution", icon: "payments" },
    { label: "Settings", href: "/teacher/settings", icon: "settings" },
];

export default function TeacherLayout({ children }) {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { unreadCount } = useNotifications();

    // ── Bottom nav: kinetic sliding indicator ──
    const activeIdx = teacherNav.findIndex(item => pathname === item.href);
    const prevIdxRef = useRef(activeIdx);
    const rafRef = useRef(null);
    const iconRefs = useRef([]);
    const isAnimatingRef = useRef(false);

    useEffect(() => {
        const from = prevIdxRef.current;
        const to = activeIdx;
        if (from !== -1 && from !== to && to >= 0) {
            isAnimatingRef.current = true;
            const start = performance.now();
            const duration = 1500;

            const tick = (now) => {
                const raw = Math.min((now - start) / duration, 1);
                const eased = heavyInertia(raw);
                const pos = from + (to - from) * eased;

                teacherNav.forEach((_, i) => {
                    const el = iconRefs.current[i];
                    if (!el) return;
                    const prox = Math.max(0, 1 - Math.abs(pos - i) * 1.4);
                    el.style.color = prox > 0.25 ? `rgba(255,255,255,${Math.min(prox * 1.5, 1)})` : 'rgba(59,89,152,0.5)';
                    el.style.transform = `scale(${1 + 0.14 * prox})`;
                    el.style.fontVariationSettings = prox > 0.4 ? "'FILL' 1" : "'FILL' 0";
                });

                if (raw < 1) {
                    rafRef.current = requestAnimationFrame(tick);
                } else {
                    isAnimatingRef.current = false;
                    iconRefs.current.forEach(el => {
                        if (el) { el.style.color = ''; el.style.transform = ''; el.style.fontVariationSettings = ''; }
                    });
                }
            };
            rafRef.current = requestAnimationFrame(tick);
            prevIdxRef.current = to;
            return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
        }
        prevIdxRef.current = to;
    }, [activeIdx]);

    const isSubPageMobile = pathname !== "/teacher" && 
                            pathname !== "/teacher/payments" &&
                            pathname !== "/teacher/distribution" && 
                            pathname !== "/teacher/settings";

    const getSubPageTitle = () => {
        const item = teacherNav.find(i => i.href !== "/teacher" && pathname.startsWith(i.href));
        if (pathname === "/notifications") return "Notifications";
        return item ? item.label : "Back";
    };

    return (
        <div className="h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-[#0c0e17] text-[#f0f0fd] relative" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* ── Ambient Backgrounds ── */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-[radial-gradient(circle,rgba(59,130,246,0.15)_0%,transparent_70%)] blur-[100px]" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[70%] h-[70%] bg-[radial-gradient(circle,rgba(59,130,246,0.1)_0%,transparent_70%)] blur-[100px]" />
            </div>

            {/* ── Mobile TopAppBar (Main Pages) ── */}
            {!isSubPageMobile && (
                <div className="md:hidden fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-32px)]">
                    <header className="flex justify-between items-center px-5 h-14 rounded-[28px] bg-[#111427]/70 backdrop-blur-2xl border border-[#2a3055]/50 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] animate-fade-in">
                    <div className="flex items-center gap-3" onClick={() => navigate("/teacher")}>
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-[#3b82f6]/40 bg-[#0c0e17] shadow-lg shadow-[#3b82f6]/20 flex items-center justify-center p-0.5">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-[1.1]" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tighter text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>FP Finance</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate("/notifications")}
                            className="relative text-[#aaaab7] hover:text-white transition-all active:scale-95 duration-200 cursor-pointer"
                        >
                            <span className="material-symbols-outlined">notifications</span>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-[#ff6e84] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 border border-[#0c0e17] animate-pulse">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </button>
                        <div 
                            className="rounded-full flex items-center justify-center p-[2px] border-2 border-white/10 active:border-[#3b82f6]/50 transition-all cursor-pointer shadow-lg"
                            onClick={() => navigate("/teacher/settings")}
                        >
                            <ProfilePicture size={34} />
                        </div>
                    </div>
                </header>
                </div>
            )}

            {/* ── Mobile Header (Sub-Pages) ── */}
            {isSubPageMobile && (
                <header className="md:hidden fixed top-0 w-full bg-[#0c0e17]/90 backdrop-blur-3xl flex items-center px-4 h-16 z-50 border-b border-white/5 animate-fade-in-down shadow-xl">
                    <button 
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-[#aaaab7] active:scale-90 transition-all mr-3"
                    >
                        <span className="material-symbols-outlined">arrow_back_ios_new</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight leading-none" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            {getSubPageTitle()}
                        </h1>
                    </div>
                </header>
            )}

            {/* ── Desktop Sidebar ── */}
            <aside
                className="hidden md:flex fixed top-0 left-0 h-full z-40 w-64 flex-col bg-[#0c0e17]/95 backdrop-blur-[40px] border-r border-white/5 shadow-[20px_0_40px_rgba(0,0,0,0.3)]"
            >
                {/* Logo Section */}
                <div className="p-6 border-b border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-[#3b82f6]/40 bg-[#0c0e17] shadow-lg shadow-[#3b82f6]/20 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center p-0.5">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-[1.1]" />
                        </div>
                        <div>
                            <h1 className="text-sm font-extrabold text-white tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>FP Finance</h1>
                            <p className="text-[#aaaab7] text-[11px] font-medium uppercase tracking-widest opacity-70">Future Point</p>
                        </div>
                    </div>
                </div>

                {/* Navigation Scroll */}
                <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto custom-scrollbar">
                    {teacherNav.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 group
                                    ${isActive 
                                        ? "bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                                        : "text-[#aaaab7] hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-[22px] transition-transform group-hover:scale-110 ${isActive ? "material-symbols-filled" : ""}`}>
                                    {item.icon}
                                </span>
                                <span style={{ fontFamily: "'Manrope', sans-serif" }}>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-white/5 bg-[#0c0e17]/50">
                    <button 
                        onClick={() => navigate("/notifications")}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[#aaaab7] hover:text-white hover:bg-[#3b82f6]/10 border border-transparent hover:border-[#3b82f6]/20 transition-all cursor-pointer group"
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[22px] group-hover:rotate-12 transition-transform">notifications</span>
                            <span className="text-sm font-bold" style={{ fontFamily: "'Manrope', sans-serif" }}>Alerts</span>
                        </div>
                        {unreadCount > 0 && (
                            <span className="min-w-[18px] h-[18px] bg-[#ff6e84] text-white text-[9px] font-extrabold rounded-full flex items-center justify-center px-1 shadow-[0_0_10px_rgba(255,110,132,0.4)] animate-pulse">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                    </button>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className={`relative z-10 md:ml-64 min-h-screen flex flex-col pt-24 ${!isSubPageMobile ? "pb-24" : "pb-12"} md:pt-8 md:pb-8 px-6 md:px-12`}>
                <div className="max-w-7xl w-full mx-auto flex-1">
                    {children}
                </div>
            </main>

            {/* ── Mobile Bottom Navigation ── */}
            {!isSubPageMobile && (
                <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-32px)]">
                    <nav className="relative flex items-center rounded-[28px] bg-[#111427]/70 backdrop-blur-2xl border border-[#2a3055]/50 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]">
                        {activeIdx >= 0 && (
                            <div
                                className="absolute top-1/2 -translate-y-1/2 z-0 flex items-center justify-center pointer-events-none will-change-[left]"
                                style={{
                                    width: `${100 / teacherNav.length}%`,
                                    left: `${activeIdx * (100 / teacherNav.length)}%`,
                                    transition: 'left 1500ms cubic-bezier(0.85, 0, 0.15, 1)',
                                }}
                            >
                                <div className="w-12 h-12 rounded-full bg-[#3b82f6] shadow-[0_4px_20px_rgba(59,130,246,0.5)]" />
                            </div>
                        )}
                        {teacherNav.map((item, i) => {
                            const isActive = i === activeIdx;
                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className="flex-1 relative z-10 flex items-center justify-center h-[60px] rounded-full active:scale-90"
                                >
                                    <span
                                        ref={el => iconRefs.current[i] = el}
                                        className="material-symbols-outlined text-[22px]"
                                        style={{
                                            color: isActive ? '#ffffff' : 'rgba(59,89,152,0.5)',
                                            transform: isActive ? 'scale(1.14)' : 'scale(1)',
                                            fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                                            willChange: 'transform, color',
                                        }}
                                    >
                                        {item.icon}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            )}

            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(59,130,246,0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(59,130,246,0.3);
                }
                @keyframes fade-in-down {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-fade-in-down {
                    animation: fade-in-down 0.4s ease-out;
                }
            `}} />
        </div>
    );
}
