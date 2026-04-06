import { useAuth } from "@/context/AuthContext";

export default function MyDevicesModal({ onClose }) {
    const { user } = useAuth();

    // The user object in AuthContext has activeSessions
    const activeSessions = user?.activeSessions || [];
    const currentSessionId = localStorage.getItem("current_device_session_id");

    const getDeviceIcon = (deviceName) => {
        const iconName = (deviceName === "Android" || deviceName === "iOS") ? "smartphone" : "desktop_windows";
        return (
            <span className="material-symbols-outlined text-[#3b82f6]">{iconName}</span>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in overflow-y-auto" onClick={onClose}>
            <div className="w-full max-w-lg bg-[#13151f]/90 backdrop-blur-[20px] rounded-[2.5rem] border border-[#737580]/20 shadow-2xl flex flex-col max-h-[85vh] animate-fade-in-up overflow-hidden m-auto"
                onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="px-8 pt-8 pb-6 border-b border-[#464752]/30 relative">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <h3 className="text-[#f0f0fd] font-extrabold text-2xl tracking-tight flex items-center gap-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                <span className="material-symbols-outlined text-3xl text-[#3b82f6]">devices</span>
                                My Devices
                            </h3>
                        </div>
                        <button onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-[#aaaab7] hover:text-[#ff6e84] hover:bg-[#ff6e84]/10 hover:border-[#ff6e84]/30 transition-all cursor-pointer group">
                            <span className="material-symbols-outlined transition-transform group-hover:rotate-90">close</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6 overflow-y-auto flex-1 custom-scrollbar">
                    {activeSessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-16 animate-fade-in">
                            <div className="w-20 h-20 rounded-[2rem] bg-[#3b82f6]/5 border border-[#3b82f6]/10 flex items-center justify-center mb-6 text-[#3b82f6]/40 relative">
                                <span className="material-symbols-outlined text-5xl">devices</span>
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#0c0e17] border border-[#737580]/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-sm text-[#ff6e84]">block</span>
                                </div>
                            </div>
                            <p className="text-[#f0f0fd] text-xl font-bold tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>No Active Devices</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activeSessions.map((session, idx) => {
                                const isCurrent = session.session_id === currentSessionId;
                                const dateStr = new Date(session.last_active || session.created_at).toLocaleString('en-IN', {
                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                });
                                return (
                                    <div key={idx}
                                        className={`rounded-[2.5rem] p-6 border transition-all animate-fade-in-up relative overflow-hidden group shadow-lg ${
                                            isCurrent 
                                            ? "bg-[#3b82f6]/10 border-[#3b82f6]/30" 
                                            : "bg-[#171924]/60 border-[#737580]/10 hover:bg-[#171924]/80 hover:border-[#3b82f6]/20"
                                        }`}
                                        style={{ animationDelay: `${idx * 100}ms` }}>
                                        
                                        {isCurrent && (
                                            <div className="absolute top-0 right-0 px-4 py-1.5 bg-[#3b82f6] text-white text-[9px] font-bold uppercase tracking-widest rounded-bl-2xl shadow-lg">
                                                This Device
                                            </div>
                                        )}

                                        <div className="flex items-center gap-5">
                                            <div className={`w-14 h-14 rounded-3xl flex items-center justify-center shrink-0 transition-all border ${
                                                isCurrent 
                                                ? "bg-[#3b82f6]/20 border-[#3b82f6]/40 text-[#f0f0fd] shadow-[0_0_20px_rgba(59,130,246,0.25)]" 
                                                : "bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#3b82f6] shadow-[0_0_15px_rgba(59,130,246,0.15)] group-hover:shadow-[0_0_25px_rgba(59,130,246,0.25)]"
                                            }`}>
                                                {getDeviceIcon(session.device_name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[#f0f0fd] text-base font-bold truncate tracking-wide" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                                        {session.device_name || "Unknown Device"}
                                                    </span>
                                                    {isCurrent && (
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#4af8e3] bg-[#4af8e3]/10 px-2 py-0.5 rounded-md border border-[#4af8e3]/20 animate-pulse">
                                                            Online
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[#aaaab7] text-xs mt-1 font-medium flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">public</span>
                                                    {session.platform || "Unknown"} • {session.location || "Unknown"}
                                                </p>
                                                <p className={`text-[10px] mt-2 font-bold uppercase tracking-tighter flex items-center gap-1 ${isCurrent ? "text-[#3b82f6]/80" : "text-[#737580]"}`}>
                                                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                                                    {isCurrent ? "Current Session" : `Last active: ${dateStr}`}
                                                </p>
                                            </div>
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
