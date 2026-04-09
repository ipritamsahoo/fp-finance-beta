import { useState } from "react";
import { createPortal } from "react-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import TeacherLayout from "@/components/TeacherLayout";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import ProfilePicture from "@/components/ProfilePicture";
import ProfilePicUpload from "@/components/ProfilePicUpload";
import MyDevicesModal from "@/components/MyDevicesModal";

function TeacherSettingsContent() {
    const { user, logout, refreshUser } = useAuth();
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

    return (
        <div className="space-y-8" style={{ isolation: "isolate" }}>
            {/* ── Profile Header Card ── */}
            <section className="relative animate-fade-in-scale" style={{ transform: "translateZ(0)", isolation: "isolate", backfaceVisibility: "hidden" }}>
                <div className="bg-[#3b82f6]/10 backdrop-blur-2xl p-8 rounded-[32px] ring-1 ring-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.3)] flex flex-col items-center text-center" style={{ transform: "translateZ(0)", isolation: "isolate", backfaceVisibility: "hidden", outline: "1px solid transparent" }}>
                    <div className="mb-4 flex items-center justify-center">
                        <ProfilePicture size={96} className="border-2 border-white/20" />
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-[#f0f0fd]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                        {user?.name || "Teacher"}
                    </h2>
                    <p className="text-[#aaaab7] tracking-wider mt-1 text-sm">{displayUsername}</p>
                    <div className="mt-6 flex gap-2 flex-wrap justify-center">
                    </div>
                </div>
            </section>

            {/* ── Settings List ── */}
            <section className="space-y-3 animate-fade-in-scale" style={{ animationDelay: "100ms", transform: "translateZ(0)", isolation: "isolate", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
                {/* Change Profile Photo */}
                <button
                    onClick={() => setPicModalOpen(true)}
                    className="w-full flex items-center justify-between p-4 glass-card-student rounded-2xl transition-all group cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl group-hover:bg-[#3b82f6]/20 transition-colors">
                            <span className="material-symbols-outlined text-[#3b82f6]">photo_camera</span>
                        </div>
                        <span className="font-medium text-[#f0f0fd]">Change Profile Photo</span>
                    </div>
                    <span className="material-symbols-outlined text-[#737580]">chevron_right</span>
                </button>

                {/* Change Username or Mobile */}
                <button
                    onClick={() => setUsernameModalOpen(true)}
                    className="w-full flex items-center justify-between p-4 glass-card-student rounded-2xl transition-all group cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl group-hover:bg-[#3b82f6]/20 transition-colors">
                            <span className="material-symbols-outlined text-[#3b82f6]">person</span>
                        </div>
                        <span className="font-medium text-[#f0f0fd]">Change Username or Mobile</span>
                    </div>
                    <span className="material-symbols-outlined text-[#737580]">chevron_right</span>
                </button>

                {/* Change Password */}
                <button
                    onClick={() => setPasswordModalOpen(true)}
                    className="w-full flex items-center justify-between p-4 glass-card-student rounded-2xl transition-all group cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl group-hover:bg-[#3b82f6]/20 transition-colors">
                            <span className="material-symbols-outlined text-[#3b82f6]">lock</span>
                        </div>
                        <span className="font-medium text-[#f0f0fd]">Change Password</span>
                    </div>
                    <span className="material-symbols-outlined text-[#737580]">chevron_right</span>
                </button>

                {/* Devices */}
                <button
                    onClick={() => setDevicesModalOpen(true)}
                    className="w-full flex items-center justify-between p-4 glass-card-student rounded-2xl transition-all group cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl group-hover:bg-[#3b82f6]/20 transition-colors">
                            <span className="material-symbols-outlined text-[#3b82f6]">devices</span>
                        </div>
                        <span className="font-medium text-[#f0f0fd]">Devices</span>
                    </div>
                    <span className="text-xs text-[#aaaab7] bg-white/5 px-2 py-1 rounded">
                        {activeSessionCount} active
                    </span>
                </button>

                {/* Notifications */}
                <div className="w-full flex items-center justify-between p-4 glass-card-student rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl">
                            <span className="material-symbols-outlined text-[#3b82f6]">notifications</span>
                        </div>
                        <span className="font-medium text-[#f0f0fd]">Notifications</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-[#4af8e3] uppercase tracking-widest">ON</span>
                        <div className="w-10 h-5 bg-[#006a60] rounded-full relative flex items-center px-1">
                            <div className="w-3 h-3 bg-[#4af8e3] rounded-full ml-auto shadow-sm" />
                        </div>
                    </div>
                </div>

                {/* Theme */}
                <div className="w-full flex items-center justify-between p-4 glass-card-student rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl">
                            <span className="material-symbols-outlined text-[#3b82f6]">dark_mode</span>
                        </div>
                        <span className="font-medium text-[#f0f0fd]">Theme</span>
                    </div>
                    <span className="text-xs text-[#aaaab7]">Dark mode</span>
                </div>

                {/* Help & Support */}
                <a
                    href="https://wa.me/917001637243"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between p-4 glass-card-student rounded-2xl transition-all group cursor-pointer"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl group-hover:bg-[#3b82f6]/20 transition-colors">
                            <span className="material-symbols-outlined text-[#3b82f6]">support_agent</span>
                        </div>
                        <span className="font-medium text-[#f0f0fd]">Help & Support</span>
                    </div>
                    <span className="material-symbols-outlined text-[#737580]">chevron_right</span>
                </a>
            </section>

            {/* ── Footer ── */}
            <footer className="mt-12 flex flex-col items-center gap-6 animate-fade-in-scale" style={{ animationDelay: "200ms" }}>
                <button
                    onClick={logout}
                    className="group flex items-center gap-3 px-8 py-3 bg-[#a70138]/20 hover:bg-[#a70138]/30 transition-all rounded-full ring-1 ring-[#ff6e84]/20 active:scale-95 cursor-pointer"
                >
                    <span className="material-symbols-outlined text-[#ff6e84]">logout</span>
                    <span className="font-bold text-[#ff6e84] tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>Logout</span>
                </button>
                <div className="text-center">
                    <p className="text-[10px] text-[#aaaab7] uppercase tracking-[0.2em]">FP Finance v{__APP_VERSION__}</p>
                </div>
            </footer>

            {/* ══ Modals ══ */}

            {/* Profile Pic Upload */}
            <ProfilePicUpload isOpen={picModalOpen} onClose={() => setPicModalOpen(false)} />

            {/* Change Username Modal */}
            {usernameModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closeCredModals}>
                    <div className="w-full max-w-sm bg-[#0c0e17]/95 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] p-6 animate-modal-in" onClick={(e) => e.stopPropagation()} style={{ transform: "translateZ(0)", isolation: "isolate" }}>
                        <h3 className="text-[#f0f0fd] font-bold text-lg mb-4" style={{ fontFamily: "'Manrope', sans-serif" }}>Change Username or Mobile</h3>
                        {credError && <div className="mb-3 p-2.5 rounded-2xl bg-[#ff6e84]/10 border border-[#ff6e84]/20 text-[#ff9dac] text-xs">{credError}</div>}
                        {credSuccess && <div className="mb-3 p-2.5 rounded-2xl bg-[#4af8e3]/10 border border-[#4af8e3]/20 text-[#4af8e3] text-xs">{credSuccess}</div>}
                        <form onSubmit={handleUsernameSubmit}>
                            <label className="block text-[#aaaab7] text-xs mb-1.5">New Username or Mobile</label>
                            <input
                                type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="Enter new username or mobile" required
                                className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-[#f0f0fd] text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 mb-4 placeholder:text-[#737580]"
                            />
                            <div className="flex gap-2">
                                <button type="button" onClick={closeCredModals}
                                    className="flex-1 px-4 py-3 rounded-full bg-white/5 text-[#aaaab7] text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" disabled={credLoading}
                                    className="flex-1 px-4 py-3 rounded-full bg-[#3b82f6] text-white text-sm font-bold hover:bg-[#2563eb] transition-all disabled:opacity-50 cursor-pointer shadow-[0_4px_20px_rgba(59,130,246,0.3)]">
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closeCredModals}>
                    <div className="w-full max-w-sm bg-[#0c0e17]/95 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] p-6 animate-modal-in" onClick={(e) => e.stopPropagation()} style={{ transform: "translateZ(0)", isolation: "isolate" }}>
                        <h3 className="text-[#f0f0fd] font-bold text-lg mb-1" style={{ fontFamily: "'Manrope', sans-serif" }}>Change Password</h3>
                        <p className="text-[#aaaab7] text-xs mb-4">Must include letters, numbers & special characters.</p>
                        {credError && <div className="mb-3 p-2.5 rounded-2xl bg-[#ff6e84]/10 border border-[#ff6e84]/20 text-[#ff9dac] text-xs">{credError}</div>}
                        {credSuccess && <div className="mb-3 p-2.5 rounded-2xl bg-[#4af8e3]/10 border border-[#4af8e3]/20 text-[#4af8e3] text-xs">{credSuccess}</div>}
                        <form onSubmit={handlePasswordSubmit}>
                            <label className="block text-[#aaaab7] text-xs mb-1.5">New Password</label>
                            <input
                                type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Min 6 characters" required minLength={6}
                                className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-[#f0f0fd] text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 mb-3 placeholder:text-[#737580]"
                            />
                            <label className="block text-[#aaaab7] text-xs mb-1.5">Confirm Password</label>
                            <input
                                type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter password" required minLength={6}
                                className="w-full px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-[#f0f0fd] text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 mb-4 placeholder:text-[#737580]"
                            />
                            <div className="flex gap-2">
                                <button type="button" onClick={closeCredModals}
                                    className="flex-1 px-4 py-3 rounded-full bg-white/5 text-[#aaaab7] text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" disabled={credLoading}
                                    className="flex-1 px-4 py-3 rounded-full bg-[#3b82f6] text-white text-sm font-bold hover:bg-[#2563eb] transition-all disabled:opacity-50 cursor-pointer shadow-[0_4px_20px_rgba(59,130,246,0.3)]">
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

export default function TeacherSettings() {
    return (
        <ProtectedRoute allowedRoles={["teacher"]}>
            <TeacherLayout>
                <TeacherSettingsContent />
            </TeacherLayout>
        </ProtectedRoute>
    );
}
