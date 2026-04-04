import { useAuth } from "@/context/AuthContext";

export default function MyDevicesModal({ onClose }) {
    const { user } = useAuth();

    const activeSessions = user?.activeSessions || [];
    const currentSessionId = localStorage.getItem("current_device_session_id");

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
                        <h3 className="text-white font-semibold text-[17px] tracking-tight">Devices</h3>
                        <button onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-[#8a8f98] hover:text-white transition-colors cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <p className="text-[#6b7280] text-xs mt-1">Where you're logged in</p>
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
                            <p className="text-[#8a8f98] text-sm font-medium">No devices found</p>
                            <p className="text-[#4a4f5a] text-xs mt-1">Log out and log back in to start tracking</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {activeSessions.map((session, idx) => {
                                const isCurrent = session.session_id === currentSessionId;
                                const dateStr = new Date(session.last_active || session.created_at).toLocaleString();

                                return (
                                    <div key={idx}
                                        className={`rounded-xl px-4 py-3.5 flex items-center gap-3.5 transition-all ${isCurrent
                                            ? "bg-[#3861fb]/8 border border-[#3861fb]/20"
                                            : "bg-[#22252d] border border-transparent hover:bg-[#282b33]"
                                            }`}>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCurrent ? "bg-[#3861fb]/15 text-[#3861fb]" : "bg-[#2a2d35] text-[#6b7280]"
                                            }`}>
                                            {getDeviceIcon(session.device_name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white text-sm font-medium truncate">
                                                    {session.device_name || "Unknown"}
                                                </span>
                                                {isCurrent && (
                                                    <span className="text-[9px] font-bold text-[#3861fb] bg-[#3861fb]/10 px-1.5 py-0.5 rounded tracking-wider uppercase shrink-0">This device</span>
                                                )}
                                            </div>
                                            <p className="text-[#6b7280] text-xs mt-0.5 truncate">
                                                {session.platform || "Unknown"} • {session.location || "Unknown"}
                                            </p>
                                            <p className={`text-[10px] mt-1 font-medium ${isCurrent ? "text-emerald-400" : "text-[#4a4f5a]"}`}>
                                                {isCurrent ? "Active" : `Last active: ${dateStr}`}
                                            </p>
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
