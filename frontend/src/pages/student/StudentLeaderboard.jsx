import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import StudentLayout from "@/components/StudentLayout";
import ProfilePicture from "@/components/ProfilePicture";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatTime(isoString) {
    if (!isoString) return "";
    try {
        const d = new Date(isoString);
        return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase();
    } catch { return ""; }
}

// ── Podium Avatar ──
function PodiumAvatar({ entry, rank, size = "lg" }) {
    const sizeMap = { lg: 96, md: 64 };
    const px = sizeMap[size] || 64;

    const borderGradients = {
        1: "from-[#c799ff] via-[#4af8e3] to-[#bc87fe]",
        2: "from-slate-400 to-transparent",
        3: "from-[#ff9dac] to-transparent",
    };

    const rankBadges = {
        1: "bg-gradient-to-br from-[#c799ff] to-[#bc87fe] text-[#340064] ring-4 ring-[#0c0e17]",
        2: "bg-slate-400 text-slate-900 ring-2 ring-[#0c0e17]",
        3: "bg-[#fb899c] text-[#5b0a22] ring-2 ring-[#0c0e17]",
    };

    return (
        <div className="flex flex-col items-center space-y-3">
            <div className={`relative ${rank === 1 ? "scale-110" : ""}`}>
                {/* Crown for #1 */}
                {rank === 1 && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                        <span className="material-symbols-outlined text-[#c799ff] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                            workspace_premium
                        </span>
                    </div>
                )}
                {/* Gradient ring */}
                <div className={`rounded-full ${rank === 1 ? "p-[3px]" : "p-[2px]"} bg-gradient-to-b ${borderGradients[rank]} shadow-lg ${rank === 1 ? "shadow-[#c799ff]/20" : rank === 3 ? "shadow-[#ff9dac]/20" : "shadow-slate-900/40"}`}
                    style={{ width: px + 6, height: px + 6 }}>
                    <div className="w-full h-full rounded-full overflow-hidden" style={{ border: `${rank === 1 ? 4 : 2}px solid #0c0e17` }}>
                        <ProfilePicture size={px} picUrl={entry.profile_pic_url} name={entry.student_name} />
                    </div>
                </div>
                {/* Rank badge */}
                <div className={`absolute -bottom-1 -right-1 flex items-center justify-center rounded-full font-bold
                    ${rankBadges[rank]}
                    ${rank === 1 ? "w-8 h-8 text-xs" : "w-6 h-6 text-[10px]"}`}>
                    {rank}
                </div>
            </div>
            <div className="text-center">
                <p className={`font-semibold text-[#f0f0fd] truncate max-w-[100px] ${rank === 1 ? "text-sm" : "text-xs"}`}
                    style={rank === 1 ? { textShadow: "0 0 15px rgba(199,153,255,0.5)" } : {}}>
                    {entry.student_name}
                </p>
                <p className={`font-medium ${rank === 1 ? "text-[11px] text-[#4af8e3] font-bold tracking-widest uppercase" : "text-[10px] text-[#aaaab7]"}`}
                    style={rank === 1 ? { textShadow: "0 0 15px rgba(74,248,227,0.5)" } : {}}>
                    {formatTime(entry.paid_at)}
                </p>
            </div>
        </div>
    );
}

// ── Month Selector ──
function MonthSelector({ current, available, onChange }) {
    const [open, setOpen] = useState(false);
    const label = `${MONTH_NAMES[current.month - 1]} ${current.year}`;

    return (
        <div className="relative inline-block">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-[#aaaab7] hover:bg-white/10 transition-all cursor-pointer"
            >
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                {label}
                <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>
            {open && (
                <div className="absolute top-full mt-2 left-0 z-50 bg-[#171924] border border-white/10 rounded-2xl shadow-2xl py-2 min-w-[160px] max-h-60 overflow-y-auto">
                    {available.map((m) => {
                        const isActive = m.month === current.month && m.year === current.year;
                        return (
                            <button
                                key={`${m.month}-${m.year}`}
                                onClick={() => { onChange(m); setOpen(false); }}
                                className={`w-full px-4 py-2.5 text-left text-sm cursor-pointer transition-colors
                                    ${isActive ? "bg-[#c799ff]/15 text-[#c799ff] font-semibold" : "text-[#aaaab7] hover:bg-white/5 hover:text-white"}`}
                            >
                                {MONTH_NAMES[m.month - 1]} {m.year}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Main Content ──
function StudentLeaderboardContent() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedMonth, setSelectedMonth] = useState(null);

    const fetchLeaderboard = useCallback(async (month, year) => {
        setError("");
        setLoading(true);
        try {
            const params = month && year ? `?month=${month}&year=${year}` : "";
            const result = await api.get(`/api/student/leaderboard${params}`);
            setData(result);
            if (!selectedMonth) {
                setSelectedMonth({ month: result.month, year: result.year });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth]);

    useEffect(() => {
        if (selectedMonth) {
            fetchLeaderboard(selectedMonth.month, selectedMonth.year);
        } else {
            fetchLeaderboard();
        }
    }, [selectedMonth]);

    const handleMonthChange = (m) => {
        setSelectedMonth(m);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-[#c799ff]/30 border-t-[#c799ff] rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#ff6e84]/10 border border-[#ff6e84]/20 text-[#ff9dac] text-sm">
                    {error}
                </div>
                <button onClick={() => fetchLeaderboard(selectedMonth?.month, selectedMonth?.year)}
                    className="px-6 py-2 rounded-full bg-[#c799ff] text-[#440080] font-bold text-sm cursor-pointer">
                    Retry
                </button>
            </div>
        );
    }

    if (!data) return null;

    const top3 = data.top5.filter(e => e.rank <= 3);
    const rank4and5 = data.top5.filter(e => e.rank > 3);
    // Keep exact length of 3 to preserve grid columns (Rank 2, Rank 1, Rank 3)
    const podiumOrder = [
        { rank: 2, entry: top3.find(e => e.rank === 2) },
        { rank: 1, entry: top3.find(e => e.rank === 1) },
        { rank: 3, entry: top3.find(e => e.rank === 3) },
    ];
    
    const hasAnyPodium = top3.length > 0;

    return (
        <div className="space-y-8">
            {/* Month Selector */}
            {data.available_months?.length > 1 && (
                <div className="flex justify-center animate-fade-in-scale">
                    <MonthSelector
                        current={selectedMonth || { month: data.month, year: data.year }}
                        available={data.available_months}
                        onChange={handleMonthChange}
                    />
                </div>
            )}

            {/* Hero Section */}
            <section className="text-center space-y-2 animate-fade-in-scale">
                <h2 className="text-4xl font-extrabold tracking-tight text-[#f0f0fd]"
                    style={{ fontFamily: "'Manrope', sans-serif", textShadow: "0 0 15px rgba(199,153,255,0.5)" }}>
                    Fastest Payers
                </h2>
                <p className="text-[#aaaab7] text-sm font-medium">
                    {MONTH_FULL[(selectedMonth?.month || data.month) - 1]} {selectedMonth?.year || data.year} Billing Cycle
                </p>
            </section>

            {/* Podium / Top 3 */}
            {hasAnyPodium ? (
                <section className="grid grid-cols-3 gap-4 items-end pb-4 animate-fade-in-scale" style={{ animationDelay: "100ms" }}>
                    {podiumOrder.map((slot) => (
                        <div key={slot.rank}>
                            {slot.entry ? (
                                <PodiumAvatar entry={slot.entry} rank={slot.rank} size={slot.rank === 1 ? "lg" : "md"} />
                            ) : (
                                <div className="flex flex-col items-center justify-end h-32 opacity-20">
                                    <div className="w-16 h-16 rounded-full border border-dashed border-white/20" />
                                </div>
                            )}
                        </div>
                    ))}
                </section>
            ) : (
                <section className="text-center py-10 animate-fade-in-scale">
                    <span className="material-symbols-outlined text-6xl text-[#737580] mb-3 block">emoji_events</span>
                    <p className="text-lg font-medium text-[#aaaab7]">No paid entries yet</p>
                    <p className="text-sm text-[#737580] mt-1">Be the first to pay and claim the #1 spot!</p>
                </section>
            )}

            {/* Ranking Details (#4, #5) */}
            {rank4and5.length > 0 && (
                <section className="space-y-4 animate-fade-in-scale" style={{ animationDelay: "200ms" }}>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg text-[#f0f0fd]/90" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            Ranking Details
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {rank4and5.map((entry, idx) => (
                            <div key={entry.rank}
                                className="rounded-3xl p-4 flex items-center gap-4 border border-white/5 hover:border-[#c799ff]/20 transition-all animate-fade-in-scale"
                                style={{
                                    background: "rgba(34,37,50,0.4)",
                                    backdropFilter: "blur(24px)",
                                    animationDelay: `${300 + idx * 80}ms`,
                                }}>
                                <span className="text-[#aaaab7] font-bold w-6" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                    #{entry.rank}
                                </span>
                                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-[#222532]">
                                    <ProfilePicture size={48} picUrl={entry.profile_pic_url} name={entry.student_name} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-[#f0f0fd]">{entry.student_name}</p>
                                    <p className="text-xs text-[#aaaab7]">Paid {formatTime(entry.paid_at)}</p>
                                </div>
                                <div className={`flex items-center gap-1 px-3 py-1 rounded-full
                                    ${entry.rank <= 5 ? "bg-[#4af8e3]/10" : "bg-white/5"}`}>
                                    {entry.rank <= 5 && (
                                        <span className="material-symbols-outlined text-[#4af8e3] text-xs">trending_up</span>
                                    )}
                                    <span className={`text-[10px] font-bold ${entry.rank <= 5 ? "text-[#4af8e3]" : "text-[#aaaab7]"}`}>
                                        {entry.rank <= 5 ? "TOP 5" : "LOCKED IN"}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Your Current Position */}
            <section className="animate-fade-in-scale" style={{ animationDelay: "400ms" }}>
                {data.is_current_paid ? (
                    <div className="p-4 rounded-3xl bg-gradient-to-r from-[#c799ff]/20 to-[#4af8e3]/10 border border-[#c799ff]/20 backdrop-blur-md">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#c799ff]/20 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#c799ff]">person_pin</span>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-[#bc87fe]">Your Current Rank</p>
                                    <p className="text-lg font-bold text-[#f0f0fd]">
                                        #{data.current_position}
                                        <span className="text-xs font-normal text-[#aaaab7] ml-2">
                                            among {data.total_students} students
                                        </span>
                                    </p>
                                </div>
                            </div>
                            {data.current_position <= 5 && (
                                <span className="material-symbols-outlined text-[#4af8e3] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    emoji_events
                                </span>
                            )}
                        </div>
                    </div>
                ) : data.has_bill ? (
                    <div className="p-4 rounded-3xl bg-[#ff6e84]/10 border border-[#ff6e84]/20">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#ff6e84]/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[#ff6e84]">lock</span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[#ff9dac]">Position Locked</p>
                                <p className="text-xs text-[#aaaab7] mt-0.5">
                                    Pay your bill first to see your ranking position
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 rounded-3xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[#737580]">info</span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#aaaab7]">No bill for this cycle</p>
                                <p className="text-xs text-[#737580] mt-0.5">You don't have a payment record for this month</p>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Stats Cards */}
            <section className="grid grid-cols-2 gap-4 animate-fade-in-scale" style={{ animationDelay: "500ms" }}>
                <div className="p-5 rounded-[32px] border border-white/5 flex flex-col gap-2"
                    style={{ background: "rgba(34,37,50,0.4)", backdropFilter: "blur(24px)" }}>
                    <span className="material-symbols-outlined text-[#4af8e3]">group</span>
                    <div>
                        <p className="text-2xl font-extrabold text-[#f0f0fd]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            {data.total_paid}/{data.total_students}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-[#aaaab7] font-bold">Students Paid</p>
                    </div>
                </div>
                <div className="p-5 rounded-[32px] border border-white/5 flex flex-col gap-2"
                    style={{ background: "rgba(34,37,50,0.4)", backdropFilter: "blur(24px)" }}>
                    <span className="material-symbols-outlined text-[#ff9dac]">percent</span>
                    <div>
                        <p className="text-2xl font-extrabold text-[#f0f0fd]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            {data.cohort_progress}%
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-[#aaaab7] font-bold">Cohort Progress</p>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default function StudentLeaderboard() {
    return (
        <ProtectedRoute allowedRoles={["student"]}>
            <StudentLayout>
                <StudentLeaderboardContent />
            </StudentLayout>
        </ProtectedRoute>
    );
}
