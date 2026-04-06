import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useNotifications } from "@/context/NotificationContext";
import { useAuth } from "@/context/AuthContext";
import ProfilePicture from "./ProfilePicture";

const adminBottomNav = [
    { label: "Home", href: "/admin", icon: "home" },
    { label: "Approvals", href: "/admin/approvals", icon: "fact_check" },
    { label: "Payments", href: "/admin/payments", icon: "payments" },
    { label: "Distribution", href: "/admin/distribution", icon: "account_tree" },
];

const adminFabNav = [
    { label: "Students", href: "/admin/students", icon: "school" },
    { label: "Teachers", href: "/admin/teachers", icon: "person" },
    { label: "Batches", href: "/admin/batches", icon: "assignment" },
    { label: "Reports", href: "/admin/reports", icon: "description" },
];

// Combined flat nav for desktop sidebar
const adminSidebarNav = [...adminBottomNav, ...adminFabNav];

export default function AdminLayout({ children }) {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { unreadCount } = useNotifications() || {};
    const { logout } = useAuth();
    const [fabOpen, setFabOpen] = useState(false);

    const handleLogout = async () => {
        if (window.confirm("Are you sure you want to logout?")) {
            await logout();
            navigate("/login");
        }
    };

    // Close FAB when navigating
    const handleFabLink = (href) => {
        setFabOpen(false);
        navigate(href);
    };

    const isSubPageMobile = pathname !== "/admin" && 
                            pathname !== "/admin/approvals" && 
                            pathname !== "/admin/payments" && 
                            pathname !== "/admin/distribution";

    const getSubPageTitle = () => {
        const item = adminSidebarNav.find(i => i.href !== "/admin" && pathname.startsWith(i.href));
        return item ? item.label : "Back";
    };

    return (
        <div className="min-h-screen bg-[#0c0e17] text-[#f0f0fd] relative" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* ── Ambient Backgrounds ── */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-[radial-gradient(circle,rgba(59,130,246,0.15)_0%,transparent_70%)] blur-[100px]" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[70%] h-[70%] bg-[radial-gradient(circle,rgba(59,130,246,0.1)_0%,transparent_70%)] blur-[100px]" />
            </div>

            {/* ── Mobile TopAppBar (Main Pages) ── */}
            {!isSubPageMobile && (
                <header className="md:hidden fixed top-0 w-full bg-[#0c0e17]/80 backdrop-blur-xl flex justify-between items-center px-6 h-16 z-50 shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all animate-fade-in">
                    <div className="flex items-center gap-3" onClick={() => navigate("/admin")}>
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-[#3b82f6]/40 bg-[#0c0e17] shadow-lg shadow-[#3b82f6]/20 flex items-center justify-center p-0.5">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-[1.1]" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tighter text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>FP Finance</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleLogout}
                            className="text-[#ff6e84]/60 hover:text-[#ff6e84] transition-colors cursor-pointer active:scale-95"
                        >
                            <span className="material-symbols-outlined text-xl">logout</span>
                        </button>
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
                            className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/10 active:border-[#3b82f6]/50 transition-all cursor-pointer shadow-lg"
                            onClick={() => navigate("/admin")}
                        >
                            <ProfilePicture size={36} />
                        </div>
                    </div>
                </header>
            )}

            {/* ── Mobile Header (Sub-Pages) ── */}
            {isSubPageMobile && (
                <header className="md:hidden fixed top-0 w-full bg-[#0c0e17]/90 backdrop-blur-3xl flex items-center px-4 h-16 z-50 border-b border-white/5 animate-fade-in-down shadow-xl">
                    <button 
                        onClick={() => navigate("/admin")}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-[#aaaab7] active:scale-90 transition-all mr-3"
                    >
                        <span className="material-symbols-outlined">arrow_back_ios_new</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight leading-none" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            {getSubPageTitle() === "Reports" ? "Report Export" : `Manage ${getSubPageTitle()}`}
                        </h1>
                    </div>
                </header>
            )}

            {/* ── Desktop Sidebar ── */}
            <aside 
                className="hidden md:flex fixed top-0 left-0 h-full z-40 w-64 flex-col bg-[#0c0e17]/95 backdrop-blur-[40px] border-r border-white/5 shadow-[20px_0_40px_rgba(0,0,0,0.3)]"
            >
                {/* Profile / Header */}
                <div className="p-6 border-b border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 flex items-center gap-3 cursor-pointer" onClick={() => navigate("/admin")}>
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
                    {adminSidebarNav.map((item) => {
                        const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/admin");
                        return (
                            <Link 
                                key={item.href}
                                to={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 group
                                    ${isActive 
                                        ? "bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                                        : "text-[#aaaab7] hover:text-white hover:bg-white/5 active:scale-95"
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-[22px] transition-transform group-hover:scale-110 ${isActive ? "material-symbols-filled" : ""}`}>
                                    {item.icon}
                                </span>
                                <span style={{ fontFamily: "'Manrope', sans-serif" }}>{item.label}</span>
                            </Link>
                        );
                    })}
                    
                    {/* Logout Button in Sidebar */}
                    <button 
                        onClick={handleLogout}
                        className="w-full mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-[#ff6e84] hover:bg-[#ff6e84]/10 transition-all active:scale-95 group cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[22px] group-hover:translate-x-1 transition-transform">logout</span>
                        <span style={{ fontFamily: "'Manrope', sans-serif" }}>Logout</span>
                    </button>
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
                    <p className="text-center text-[#464752] text-[9px] mt-4 font-bold tracking-tighter uppercase opacity-50">Financial Nebula v3.2</p>
                </div>
            </aside>


            {/* ── Main Content ── */}
            <main className={`relative z-10 pt-24 ${!isSubPageMobile ? "pb-32" : "pb-12"} md:pb-8 px-6 md:px-12 md:ml-64 space-y-8 flex-1`}>
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            {/* ── Mobile: FAB Menu Drawer ── */}
            <div className={`md:hidden fixed bottom-28 right-6 z-[60] w-48 flex flex-col gap-3 transition-all duration-300 transform origin-bottom-right ${fabOpen && !isSubPageMobile ? "scale-100 opacity-100 translate-y-0" : "scale-50 opacity-0 translate-y-10 pointer-events-none"}`}>
                <div className="bg-[#171924]/95 backdrop-blur-3xl rounded-3xl p-3 shadow-2xl border border-white/5 space-y-1">
                    {adminFabNav.map((item) => (
                        <button 
                            key={item.href}
                            onClick={() => handleFabLink(item.href)}
                            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-white/5 transition-colors group cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[#3b82f6]">{item.icon}</span>
                            <span className="font-semibold text-[#aaaab7] group-hover:text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Mobile: Overlay to close FAB ── */}
            {fabOpen && !isSubPageMobile && (
                <div 
                    className="md:hidden fixed inset-0 z-[55] bg-black/20 backdrop-blur-sm transition-opacity cursor-pointer"
                    onClick={() => setFabOpen(false)}
                />
            )}

            {/* ── Mobile: Floating Action Button ── */}
            {!isSubPageMobile && (
                <button 
                    onClick={() => setFabOpen(!fabOpen)}
                    className={`md:hidden fixed bottom-24 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(74,248,227,0.3)] z-[60] active:scale-90 transition-all duration-300 cursor-pointer ${fabOpen ? "bg-[#ff6e84] text-white rotate-45 shadow-[0_10px_30px_rgba(255,110,132,0.3)]" : "bg-[#4af8e3] text-[#005b51]"}`}
                >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {fabOpen ? "add" : "grid_view"}
                    </span>
                </button>
            )}

            {/* ── Mobile: Bottom Navigation Bar ── */}
            {!isSubPageMobile && (
                <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 bg-[#0c0e17]/90 backdrop-blur-2xl flex justify-around items-center px-4 pb-8 pt-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] rounded-t-3xl border-t border-white/10">
                    {adminBottomNav.map((item) => {
                        const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/admin");
                        return (
                            <Link 
                                key={item.href}
                                to={item.href}
                                className={`flex flex-col items-center justify-center transition-all duration-200 active:scale-90 ${isActive ? "text-[#4af8e3] bg-[#4af8e3]/10 rounded-xl px-4 py-2" : "text-[#53545f] hover:text-[#f0f0fd] px-4 py-2"}`}
                            >
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                                <span className="text-[10px] font-medium uppercase tracking-widest mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>
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

