import { useState } from "react";
import { createPortal } from "react-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import StudentLayout from "@/components/StudentLayout";
import { useAuth } from "@/context/AuthContext";
import { useStudentTheme } from "@/context/StudentThemeContext";
import { api } from "@/lib/api";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import ProfilePicture from "@/components/ProfilePicture";
import ProfilePicUpload from "@/components/ProfilePicUpload";
import MyDevicesModal from "@/components/MyDevicesModal";

function StudentSettingsContent() {
    const { user, logout, refreshUser } = useAuth();
    const { theme, toggleTheme } = useStudentTheme();
    const isLight = theme === "light";
    const [picModalOpen, setPicModalOpen] = useState(false);
    const [devicesModalOpen, setDevicesModalOpen] = useState(false);

    // Credential modals
    const [usernameModalOpen, setUsernameModalOpen] = useState(false);
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [credLoading, setCredLoading] = useState(false);
    const [credError, setCredError] = useState("");
    const [credSuccess, setCredSuccess] = useState("");

    const closeCredModals = () => {
        setUsernameModalOpen(false);
        setPasswordModalOpen(false);
        setCredError("");
        setCredSuccess("");
        setNewUsername("");
        setNewPassword("");
        setConfirmPassword("");
    };

    const handleUsernameSubmit = async (e) => {
        e.preventDefault();
        if (!newUsername.trim()) return;
        setCredLoading(true); setCredError(""); setCredSuccess("");
        try {
            const res = await api.put("/api/auth/update-credentials", { new_username: newUsername.trim() });
            if (res.custom_token) await signInWithCustomToken(auth, res.custom_token);
            await refreshUser();
            setCredSuccess("Username updated successfully!");
            setNewUsername("");
            setTimeout(() => closeCredModals(), 2000);
        } catch (err) { setCredError(err.message || "Failed to update."); }
        finally { setCredLoading(false); }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { setCredError("Passwords do not match."); return; }
        if (newPassword.length < 6) { setCredError("Password must be at least 6 characters."); return; }
        if (!/[a-zA-Z]/.test(newPassword)) { setCredError("Must include at least one letter."); return; }
        if (!/[0-9]/.test(newPassword)) { setCredError("Must include at least one number."); return; }
        if (!/[^a-zA-Z0-9]/.test(newPassword)) { setCredError("Must include at least one special character."); return; }
        setCredLoading(true); setCredError(""); setCredSuccess("");
        try {
            const res = await api.put("/api/auth/update-credentials", { new_password: newPassword });
            if (res.custom_token) await signInWithCustomToken(auth, res.custom_token);
            await refreshUser();
            setCredSuccess("Password updated successfully!");
            setNewPassword(""); setConfirmPassword("");
            setTimeout(() => closeCredModals(), 2000);
        } catch (err) { setCredError(err.message || "Failed to update."); }
        finally { setCredLoading(false); }
    };

    const displayUsername = user?.email?.replace(/@fp\.com$/, "") || "user";
    const activeSessionCount = user?.activeSessions?.length || 0;

    const accentColor = isLight ? '#0d9488' : '#3b82f6';

    return (
        <div className="space-y-8">
            {/* ── Profile Header Card ── */}
            <section className="relative" style={{ transform: "translateZ(0)", isolation: "isolate", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
                <div
                    className="backdrop-blur-2xl p-8 rounded-[32px] ring-1 flex flex-col items-center text-center"
                    style={{
                        backgroundColor: isLight ? 'rgba(13,148,136,0.06)' : 'rgba(59,130,246,0.1)',
                        boxShadow: isLight ? '0 8px 32px rgba(0,0,0,0.06)' : '0 20px 40px rgba(0,0,0,0.3)',
                        ringColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)',
                        borderWidth: 1, borderStyle: 'solid',
                        borderColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)',
                        transform: "translateZ(0)", isolation: "isolate", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden"
                    }}
                >
                    {/* Profile Picture */}
                    <div className="mb-4 flex items-center justify-center">
                        <ProfilePicture size={96} className="border-2 border-white/20" />
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "'Manrope', sans-serif", color: 'var(--st-text-primary)' }}>
                        {user?.name || "User"}
                    </h2>
                    <p className="tracking-wider mt-1 text-sm" style={{ color: 'var(--st-text-secondary)' }}>{displayUsername}</p>
                    <div className="mt-6 flex gap-2 flex-wrap justify-center">

                        {user?.currentBadge === "prime" && (
                            <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1"
                                style={{
                                    backgroundColor: 'rgba(168,85,247,0.15)',
                                    color: isLight ? '#7c3aed' : '#c084fc',
                                    border: `1px solid rgba(168,85,247,0.25)`,
                                }}
                            >
                                <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                                Prime
                            </span>
                        )}
                        {user?.currentBadge === "golden" && (
                            <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1"
                                style={{
                                    backgroundColor: 'rgba(245,158,11,0.15)',
                                    color: isLight ? '#d97706' : '#fbbf24',
                                    border: `1px solid rgba(245,158,11,0.25)`,
                                }}
                            >
                                <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                Golden
                            </span>
                        )}
                        {user?.currentBadge === "silver" && (
                            <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1"
                                style={{
                                    backgroundColor: 'rgba(148,163,184,0.15)',
                                    color: isLight ? '#64748b' : '#cbd5e1',
                                    border: `1px solid rgba(148,163,184,0.25)`,
                                }}
                            >
                                <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                                Silver
                            </span>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Settings List ── */}
            <section className="space-y-3" style={{ transform: "translateZ(0)", isolation: "isolate", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
                {/* Change Profile Photo */}
                <button
                    onClick={() => setPicModalOpen(true)}
                    className="w-full flex items-center justify-between p-4 glass-card-student rounded-2xl transition-all group cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors" style={{ backgroundColor: 'var(--st-icon-bg)' }}>
                            <span className="material-symbols-outlined" style={{ color: accentColor }}>photo_camera</span>
                        </div>
                        <span className="font-medium" style={{ color: 'var(--st-text-primary)' }}>Change Profile Photo</span>
                    </div>
                    <span className="material-symbols-outlined" style={{ color: 'var(--st-text-muted)' }}>chevron_right</span>
                </button>

                {/* Change Username or Mobile */}
                <button
                    onClick={() => setUsernameModalOpen(true)}
                    className="w-full flex items-center justify-between p-4 glass-card-student rounded-2xl transition-all group cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors" style={{ backgroundColor: 'var(--st-icon-bg)' }}>
                            <span className="material-symbols-outlined" style={{ color: accentColor }}>person</span>
                        </div>
                        <span className="font-medium" style={{ color: 'var(--st-text-primary)' }}>Change Username or Mobile</span>
                    </div>
                    <span className="material-symbols-outlined" style={{ color: 'var(--st-text-muted)' }}>chevron_right</span>
                </button>

                {/* Change Password */}
                <button
                    onClick={() => setPasswordModalOpen(true)}
                    className="w-full flex items-center justify-between p-4 glass-card-student rounded-2xl transition-all group cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors" style={{ backgroundColor: 'var(--st-icon-bg)' }}>
                            <span className="material-symbols-outlined" style={{ color: accentColor }}>lock</span>
                        </div>
                        <span className="font-medium" style={{ color: 'var(--st-text-primary)' }}>Change Password</span>
                    </div>
                    <span className="material-symbols-outlined" style={{ color: 'var(--st-text-muted)' }}>chevron_right</span>
                </button>

                {/* Devices */}
                <button
                    onClick={() => setDevicesModalOpen(true)}
                    className="w-full flex items-center justify-between p-4 glass-card-student rounded-2xl transition-all group cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors" style={{ backgroundColor: 'var(--st-icon-bg)' }}>
                            <span className="material-symbols-outlined" style={{ color: accentColor }}>devices</span>
                        </div>
                        <span className="font-medium" style={{ color: 'var(--st-text-primary)' }}>Devices</span>
                    </div>
                    <span className="text-xs px-2 py-1 rounded" style={{ color: 'var(--st-text-secondary)', backgroundColor: 'var(--st-icon-bg)' }}>
                        {activeSessionCount} active
                    </span>
                </button>


                {/* ── Theme Toggle (Functional) ── */}
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between p-4 glass-card-student rounded-2xl transition-all cursor-pointer group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors" style={{ backgroundColor: 'var(--st-icon-bg)' }}>
                            <span className="material-symbols-outlined" style={{ color: accentColor }}>
                                {isLight ? 'light_mode' : 'dark_mode'}
                            </span>
                        </div>
                        <span className="font-medium" style={{ color: 'var(--st-text-primary)' }}>Theme</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs" style={{ color: 'var(--st-text-secondary)' }}>
                            {isLight ? 'Light mode' : 'Dark mode'}
                        </span>
                        {/* Toggle switch */}
                        <div
                            className="w-11 h-6 rounded-full relative flex items-center px-1 transition-colors duration-300"
                            style={{
                                backgroundColor: isLight ? 'rgba(13,148,136,0.3)' : 'rgba(59,130,246,0.3)',
                            }}
                        >
                            <div
                                className="w-4 h-4 rounded-full shadow-sm transition-all duration-300 flex items-center justify-center"
                                style={{
                                    backgroundColor: isLight ? '#0d9488' : '#3b82f6',
                                    marginLeft: isLight ? 'auto' : '0',
                                }}
                            >
                                <span className="material-symbols-outlined text-white text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    {isLight ? 'light_mode' : 'dark_mode'}
                                </span>
                            </div>
                        </div>
                    </div>
                </button>

                {/* Help & Support */}
                <a
                    href="https://wa.me/917001637243"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between p-4 glass-card-student rounded-2xl transition-all group cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors" style={{ backgroundColor: 'var(--st-icon-bg)' }}>
                            <span className="material-symbols-outlined" style={{ color: accentColor }}>support_agent</span>
                        </div>
                        <span className="font-medium" style={{ color: 'var(--st-text-primary)' }}>Help & Support</span>
                    </div>
                    <span className="material-symbols-outlined" style={{ color: 'var(--st-text-muted)' }}>chevron_right</span>
                </a>
            </section>

            {/* ── Footer ── */}
            <footer className="mt-12 flex flex-col items-center gap-6">
                <button
                    onClick={logout}
                    className="group flex items-center gap-3 px-8 py-3 transition-all rounded-full active:scale-95 cursor-pointer"
                    style={{
                        backgroundColor: isLight ? 'rgba(239,68,68,0.08)' : 'rgba(167,1,56,0.2)',
                        border: `1px solid ${isLight ? 'rgba(239,68,68,0.15)' : 'rgba(255,110,132,0.2)'}`,
                    }}
                >
                    <span className="material-symbols-outlined" style={{ color: isLight ? '#ef4444' : '#ff6e84' }}>logout</span>
                    <span className="font-bold tracking-tight" style={{ fontFamily: "'Manrope', sans-serif", color: isLight ? '#ef4444' : '#ff6e84' }}>Logout</span>
                </button>
                <div className="text-center">
                    <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--st-text-secondary)' }}>FP Finance v{__APP_VERSION__}</p>
                </div>
            </footer>

            {/* ══ Modals ══ */}

            {/* Profile Pic Upload */}
            <ProfilePicUpload isOpen={picModalOpen} onClose={() => setPicModalOpen(false)} />

            {/* Change Username Modal */}
            {usernameModalOpen && createPortal(
                <div 
                    data-theme={theme}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4" 
                    onClick={closeCredModals}
                    style={{
                        backgroundColor: isLight ? 'rgba(238,242,255,0.4)' : 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)'
                    }}
                >
                    <div
                        className="w-full max-w-sm rounded-[32px] p-8 animate-modal-in shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: isLight ? 'rgba(255,255,255,0.25)' : 'rgba(12,14,23,0.85)',
                            border: `1px solid ${isLight ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)'}`,
                            backdropFilter: 'blur(40px) saturate(2.0)',
                            WebkitBackdropFilter: 'blur(40px) saturate(2.0)',
                            transform: "translateZ(0)", isolation: "isolate"
                        }}
                    >
                        <h3 className="font-extrabold text-2xl mb-6 tracking-tight text-center" style={{ fontFamily: "'Manrope', sans-serif", color: 'var(--st-text-primary)' }}>Change Username</h3>
                        
                        {credError && (
                            <div className="mb-5 p-3 rounded-2xl text-xs font-bold text-center" 
                                style={{ 
                                    backgroundColor: isLight ? 'rgba(239,68,68,0.1)' : 'rgba(255,110,132,0.1)', 
                                    border: `1px solid ${isLight ? 'rgba(239,68,68,0.2)' : 'rgba(255,110,132,0.2)'}`, 
                                    color: isLight ? '#ef4444' : '#ff9dac' 
                                }}>
                                {credError}
                            </div>
                        )}
                        
                        {credSuccess && (
                            <div className="mb-5 p-3 rounded-2xl text-xs font-bold text-center" 
                                style={{ 
                                    backgroundColor: 'var(--st-accent-bg)', 
                                    border: `1px solid ${isLight ? 'rgba(13,148,136,0.2)' : 'rgba(74,248,227,0.2)'}`, 
                                    color: 'var(--st-accent)' 
                                }}>
                                {credSuccess}
                            </div>
                        )}

                        <form onSubmit={handleUsernameSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold mb-2 ml-1 uppercase tracking-widest" style={{ color: 'var(--st-text-muted)' }}>New Username or Mobile</label>
                                <input
                                    type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                                    placeholder="Enter new username or mobile" required
                                    className="w-full px-5 py-4 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 transition-all placeholder:text-gray-400"
                                    style={{ 
                                        backgroundColor: 'var(--st-icon-bg)', 
                                        border: `1px solid var(--st-input-border)`, 
                                        color: 'var(--st-text-primary)' 
                                    }}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={closeCredModals}
                                    className="flex-1 px-4 py-4 rounded-2xl text-sm font-bold transition-all cursor-pointer active:scale-95"
                                    style={{ backgroundColor: 'var(--st-icon-bg)', border: `1px solid var(--st-input-border)`, color: 'var(--st-text-secondary)' }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={credLoading}
                                    className="flex-1 px-4 py-4 rounded-2xl bg-[#3b82f6] text-white text-sm font-bold hover:bg-[#2563eb] transition-all disabled:opacity-50 cursor-pointer shadow-[0_4px_20px_rgba(59,130,246,0.3)] active:scale-95">
                                    {credLoading ? "Updating..." : "Update"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>, 
                document.body
            )}

            {/* Change Password Modal */}
            {passwordModalOpen && createPortal(
                <div 
                    data-theme={theme}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4" 
                    onClick={closeCredModals}
                    style={{
                        backgroundColor: isLight ? 'rgba(238,242,255,0.4)' : 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)'
                    }}
                >
                    <div
                        className="w-full max-w-sm rounded-[32px] p-8 animate-modal-in shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: isLight ? 'rgba(255,255,255,0.25)' : 'rgba(12,14,23,0.85)',
                            border: `1px solid ${isLight ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)'}`,
                            backdropFilter: 'blur(40px) saturate(2.0)',
                            WebkitBackdropFilter: 'blur(40px) saturate(2.0)',
                            transform: "translateZ(0)", isolation: "isolate"
                        }}
                    >
                        <h3 className="font-extrabold text-2xl mb-1 tracking-tight text-center" style={{ fontFamily: "'Manrope', sans-serif", color: 'var(--st-text-primary)' }}>Change Password</h3>
                        <p className="text-[10px] uppercase tracking-widest font-bold mb-6 text-center" style={{ color: 'var(--st-text-muted)' }}>Security update required</p>
                        
                        {credError && (
                            <div className="mb-5 p-3 rounded-2xl text-xs font-bold text-center" 
                                style={{ 
                                    backgroundColor: isLight ? 'rgba(239,68,68,0.1)' : 'rgba(255,110,132,0.1)', 
                                    border: `1px solid ${isLight ? 'rgba(239,68,68,0.2)' : 'rgba(255,110,132,0.2)'}`, 
                                    color: isLight ? '#ef4444' : '#ff9dac' 
                                }}>
                                {credError}
                            </div>
                        )}
                        
                        {credSuccess && (
                            <div className="mb-5 p-3 rounded-2xl text-xs font-bold text-center" 
                                style={{ 
                                    backgroundColor: 'var(--st-accent-bg)', 
                                    border: `1px solid ${isLight ? 'rgba(13,148,136,0.2)' : 'rgba(74,248,227,0.2)'}`, 
                                    color: 'var(--st-accent)' 
                                }}>
                                {credSuccess}
                            </div>
                        )}

                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold mb-2 ml-1 uppercase tracking-widest" style={{ color: 'var(--st-text-muted)' }}>New Password</label>
                                <input
                                    type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Min 6 characters" required minLength={6}
                                    className="w-full px-5 py-4 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 transition-all placeholder:text-gray-400"
                                    style={{ backgroundColor: 'var(--st-icon-bg)', border: `1px solid var(--st-input-border)`, color: 'var(--st-text-primary)' }}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold mb-2 ml-1 uppercase tracking-widest" style={{ color: 'var(--st-text-muted)' }}>Confirm Password</label>
                                <input
                                    type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter password" required minLength={6}
                                    className="w-full px-5 py-4 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 transition-all placeholder:text-gray-400"
                                    style={{ backgroundColor: 'var(--st-icon-bg)', border: `1px solid var(--st-input-border)`, color: 'var(--st-text-primary)' }}
                                />
                            </div>

                            <div className="flex gap-3 pt-3">
                                <button type="button" onClick={closeCredModals}
                                    className="flex-1 px-4 py-4 rounded-2xl text-sm font-bold transition-all cursor-pointer active:scale-95"
                                    style={{ backgroundColor: 'var(--st-icon-bg)', border: `1px solid var(--st-input-border)`, color: 'var(--st-text-secondary)' }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={credLoading}
                                    className="flex-1 px-4 py-4 rounded-2xl bg-[#3b82f6] text-white text-sm font-bold hover:bg-[#2563eb] transition-all disabled:opacity-50 cursor-pointer shadow-[0_4px_20px_rgba(59,130,246,0.3)] active:scale-95">
                                    {credLoading ? "Updating..." : "Update"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Devices Modal */}
            {devicesModalOpen && (
                <MyDevicesModal onClose={() => setDevicesModalOpen(false)} />
            )}
        </div>
    );
}

export default function StudentSettings() {
    return (
        <ProtectedRoute allowedRoles={["student"]}>
            <StudentLayout>
                <StudentSettingsContent />
            </StudentLayout>
        </ProtectedRoute>
    );
}
