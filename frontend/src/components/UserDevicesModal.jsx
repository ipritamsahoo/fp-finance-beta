import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function UserDevicesModal({ user, onClose, onSessionDeleted }) {
    const [deletingId, setDeletingId] = useState(null);
    const [activeSessions, setActiveSessions] = useState(user?.active_sessions || []);

    useEffect(() => {
        const uid = user?.uid || user?.id;
        if (!uid) return;

        const unsub = onSnapshot(doc(db, "users", uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setActiveSessions(data.active_sessions || []);
            }
        });

        return () => unsub();
    }, [user]);

    const handleLogoutSession = async (sessionId) => {
        if (!confirm("Are you sure you want to log out this device?")) return;
        setDeletingId(sessionId);
        try {
            await api.delete(`/api/admin/users/${user.uid || user.id}/sessions/${sessionId}`);
            onSessionDeleted?.();
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const getDeviceIcon = (deviceName) => {
        if (deviceName === "Android" || deviceName === "iOS") {
            return (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                    <line x1="12" y1="18" x2="12.01" y2="18"></line>
                </svg>
            );
        }
        return (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-md bg-[#1a1d23] rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-fade-in-up overflow-hidden"
                onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="px-5 pt-5 pb-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-white font-semibold text-[17px] tracking-tight">Active Devices</h3>
                        <button onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-[#8a8f98] hover:text-white transition-colors cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <p className="text-[#6b7280] text-xs mt-1">
                        Sessions for <span className="text-[#c0c4cc] font-medium">{user.name}</span>
                    </p>
                </div>

                {/* Content */}
                <div className="px-4 pb-5 overflow-y-auto flex-1">
                    {activeSessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-10">
                            <div className="w-14 h-14 rounded-full bg-[#2a2d35] flex items-center justify-center mb-3 text-[#6b7280]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                                    <line x1="12" y1="18" x2="12.01" y2="18"></line>
                                </svg>
                            </div>
                            <p className="text-[#8a8f98] text-sm font-medium">No active devices</p>
                            <p className="text-[#4a4f5a] text-xs mt-1">No tracked sessions for this user yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {activeSessions.map((session, idx) => {
                                const dateStr = new Date(session.last_active || session.created_at).toLocaleString();
                                return (
                                    <div key={idx}
                                        className="rounded-xl px-4 py-3.5 bg-[#22252d] border border-transparent hover:bg-[#282b33] transition-all">
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-10 h-10 rounded-full bg-[#2a2d35] text-[#6b7280] flex items-center justify-center shrink-0">
                                                {getDeviceIcon(session.device_name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-white text-sm font-medium truncate block">
                                                    {session.device_name || "Unknown"}
                                                </span>
                                                <p className="text-[#6b7280] text-xs mt-0.5 truncate">
                                                    {session.platform || "Unknown"} • {session.location || "Unknown"}
                                                </p>
                                                <p className="text-[#4a4f5a] text-[10px] mt-1 font-medium">
                                                    Last active: {dateStr}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex justify-end">
                                            <button
                                                onClick={() => handleLogoutSession(session.session_id)}
                                                disabled={deletingId === session.session_id}
                                                className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all disabled:opacity-50 cursor-pointer">
                                                {deletingId === session.session_id ? "Removing..." : "Log Out"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
