import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import StudentLayout from "@/components/StudentLayout";
import ProfilePicture from "@/components/ProfilePicture";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getYearOptions } from "@/lib/yearOptions";
import ModernSelect from "@/components/ModernSelect";

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
                {/* Time removed as requested */}
            </div>
        </div>
    );
}


// ── Main Content ──
function StudentLeaderboardContent() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [hasInit, setHasInit] = useState(false);

    const fetchLeaderboard = useCallback(async (m, y) => {
        setError("");
        setLoading(true);
        try {
            const params = `?month=${m}&year=${y}`;
            const result = await api.get(`/api/student/leaderboard${params}`);
            setData(result);
            if (!hasInit) {
                setMonth(result.month);
                setYear(result.year);
                setHasInit(true);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [hasInit]);

    useEffect(() => {
        fetchLeaderboard(month, year);
    }, [month, year, fetchLeaderboard]);

    const yearOptions = getYearOptions();

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
                <button onClick={() => fetchLeaderboard(month, year)}
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
        <div className="space-y-8 pt-2 md:pt-0">
            {/* Date Filters */}
            <div className="flex flex-wrap justify-center gap-2 animate-fade-in-scale relative z-20">
                <ModernSelect
                    icon="calendar_month"
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    options={MONTH_FULL.map((m, i) => ({ value: i + 1, label: MONTH_NAMES[i] }))}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-[#f0f0fd] cursor-pointer hover:bg-white/10 transition-all min-w-[120px]"
                />
                <ModernSelect
                    icon="event"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    options={yearOptions}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-[#f0f0fd] cursor-pointer hover:bg-white/10 transition-all min-w-[100px]"
                />
            </div>

            {/* Hero Section */}
            <section className="text-center space-y-2 animate-fade-in-scale">
                <h2 className="text-4xl font-extrabold tracking-tight text-[#f0f0fd]"
                    style={{ fontFamily: "'Manrope', sans-serif", textShadow: "0 0 15px rgba(199,153,255,0.5)" }}>
                    Fastest Payers
                </h2>
                <p className="text-[#aaaab7] text-sm font-medium">
                    {MONTH_FULL[month - 1]} {year} Billing Cycle
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
                    {/* Heading removed as requested */}
                    <div className="space-y-3">
                        {rank4and5.map((entry, idx) => (
                            <div key={entry.rank}
                                className="glass-card-student rounded-3xl p-4 flex items-center gap-4 hover:border-[#c799ff]/30 transition-all animate-fade-in-scale"
                                style={{
                                    animationDelay: `${300 + idx * 80}ms`,
                                    transform: "translateZ(0)", isolation: "isolate", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden"
                                }}>
                                <span className="text-[#aaaab7] font-bold w-6" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                    #{entry.rank}
                                </span>
                                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-[#222532]">
                                    <ProfilePicture size={48} picUrl={entry.profile_pic_url} name={entry.student_name} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-[#f0f0fd]">{entry.student_name}</p>
                                    {/* Subtitle removed as requested */}
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
                    <div className="p-4 rounded-3xl bg-gradient-to-r from-[#c799ff]/20 to-[#4af8e3]/10 border border-[#c799ff]/30 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
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
                    <div className="p-4 rounded-3xl bg-[#ff6e84]/10 backdrop-blur-2xl border border-[#ff6e84]/30 shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]">
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
                    <div className="p-4 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]">
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
