import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import TeacherLayout from "@/components/TeacherLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getYearOptions } from "@/lib/yearOptions";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── Glass Card ──
function GlassCard({ children, className = "", style = {} }) {
    return (
        <div
            className={`rounded-[28px] border border-white/[0.07] ${className}`}
            style={{
                background: "rgba(255, 255, 255, 0.05)",
                backdropFilter: "blur(32px) saturate(180%)",
                WebkitBackdropFilter: "blur(32px) saturate(180%)",
                ...style,
            }}
        >
            {children}
        </div>
    );
}

// ── Pill Select ──
function PillSelect({ icon, value, onChange, children }) {
    return (
        <label className="relative inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-[#f0f0fd] cursor-pointer hover:bg-white/10 transition-all">
            <span className="material-symbols-outlined text-[#aaaab7] text-base">{icon}</span>
            <select
                value={value}
                onChange={onChange}
                className="bg-transparent border-none text-sm font-semibold text-[#f0f0fd] appearance-none cursor-pointer focus:outline-none pr-4"
            >
                {children}
            </select>
            <span className="material-symbols-outlined text-[#aaaab7] text-sm absolute -right-0.5 top-1/2 -translate-y-1/2 pointer-events-none">
                expand_more
            </span>
        </label>
    );
}

// ── Student Initial Avatar ──
function InitialAvatar({ name, size = 36, className = "" }) {
    const initials = (name || "?")
        .split(" ")
        .map((w) => w.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();
    const palettes = [
        { bg: "bg-[#3b82f6]/20", text: "text-[#3b82f6]", border: "border-[#3b82f6]/20" },
        { bg: "bg-[#4af8e3]/20", text: "text-[#4af8e3]", border: "border-[#4af8e3]/20" },
        { bg: "bg-[#ff9dac]/20", text: "text-[#ff9dac]", border: "border-[#ff9dac]/20" },
        { bg: "bg-[#464752]/20", text: "text-[#f0f0fd]", border: "border-[#464752]/20" },
        { bg: "bg-[#33e9d5]/20", text: "text-[#33e9d5]", border: "border-[#33e9d5]/20" },
    ];
    const p = palettes[(name || "").charCodeAt(0) % palettes.length];
    return (
        <div
            className={`rounded-full ${p.bg} ${p.text} ${p.border} border flex items-center justify-center font-bold backdrop-blur-md ${className}`}
            style={{ width: size, height: size, minWidth: size, fontSize: size * 0.3 }}
        >
            {initials}
        </div>
    );
}

function TeacherDistributionContent() {
    const { user } = useAuth();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [batchFilter, setBatchFilter] = useState("");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [expandedDate, setExpandedDate] = useState(null);
    const [activeTab, setActiveTab] = useState("datewise");

    const fetchDistribution = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            let url = `/api/teacher/distribution?month=${month}&year=${year}`;
            if (batchFilter) url += `&batch_id=${batchFilter}`;
            const res = await api.get(url);
            setData(res);
            if (!batchFilter && res.batches && res.batches.length > 0) {
                setBatchFilter(res.batches[0].id);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [month, year, batchFilter]);

    useEffect(() => {
        fetchDistribution();
    }, [fetchDistribution]);

    const yearOptions = getYearOptions();

    // Collect unique teacher names for the ledger
    const allTeachers = (() => {
        if (!data || !data.dates) return [];
        const map = new Map();
        for (const d of data.dates) {
            for (const t of d.teachers) {
                if (!map.has(t.uid)) map.set(t.uid, t.name);
            }
        }
        return Array.from(map.entries()).map(([uid, name]) => ({ uid, name }));
    })();

    const formatDateStr = (dateStr) => {
        try {
            const d = new Date(dateStr + "T00:00:00");
            return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="space-y-6">
            {/* ── Title ── */}
            <div className="animate-fade-in-scale">
                <h1
                    className="text-2xl font-extrabold flex items-center gap-2 tracking-tight text-[#f0f0fd]"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                    My Earnings 💰
                </h1>
                <p className="text-[#aaaab7] text-sm mt-1">Real-time revenue distribution</p>
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-wrap gap-2 animate-fade-in-scale" style={{ animationDelay: "60ms" }}>
                <PillSelect icon="calendar_month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                    {MONTHS.map((m, i) => (
                        <option key={i + 1} value={i + 1}>{MONTHS_SHORT[i]}</option>
                    ))}
                </PillSelect>
                <PillSelect icon="event" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                    {yearOptions.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </PillSelect>
                {data && data.batches && data.batches.length > 0 && (
                    <PillSelect icon="school" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
                        {data.batches.map((b) => (
                            <option key={b.id} value={b.id}>{b.batch_name}</option>
                        ))}
                    </PillSelect>
                )}
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="p-4 rounded-2xl bg-[#ff6e84]/10 border border-[#ff6e84]/20 text-[#ff9dac] text-sm flex items-center justify-between animate-fade-in-scale">
                    <span>{error}</span>
                    <button onClick={() => setError("")} className="ml-2 text-[#ff6e84] hover:text-white cursor-pointer">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-[#3b82f6]/30 border-t-[#3b82f6] rounded-full animate-spin" />
                </div>
            ) : data ? (
                <>
                    {/* ── Summary Bento Grid ── */}
                    <section className="grid grid-cols-2 gap-4 animate-fade-in-scale" style={{ animationDelay: "100ms" }}>
                        {/* My Earnings — Full Width */}
                        <GlassCard className="col-span-2 p-6 relative overflow-hidden group shadow-2xl" style={{ border: "1px solid rgba(59,130,246,0.15)" }}>
                            <div className="absolute top-0 right-0 w-48 h-48 bg-[#3b82f6]/15 blur-3xl -mr-20 -mt-20 group-hover:bg-[#3b82f6]/25 transition-all duration-500" />
                            <p className="text-[#aaaab7] text-xs font-semibold uppercase tracking-widest mb-2">My Earnings</p>
                            <span
                                className="text-[#4af8e3] font-extrabold text-5xl tracking-tight"
                                style={{ fontFamily: "'Manrope', sans-serif" }}
                            >
                                ₹{(data.my_total || 0).toLocaleString()}
                            </span>
                        </GlassCard>

                        {/* Total Collected */}
                        <GlassCard className="p-5 shadow-xl">
                            <p className="text-[#aaaab7] text-[10px] font-semibold uppercase tracking-widest mb-1">Total Collected</p>
                            <p className="text-[#f0f0fd] font-bold text-xl" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                ₹{data.total_collected.toLocaleString()}
                            </p>
                        </GlassCard>

                        {/* Teachers Sharing */}
                        <GlassCard className="p-5 shadow-xl">
                            <p className="text-[#aaaab7] text-[10px] font-semibold uppercase tracking-widest mb-1">Teachers Sharing</p>
                            <p className="text-[#f0f0fd] font-bold text-xl" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                {data.teacher_totals.length}
                            </p>
                        </GlassCard>
                    </section>

                    {/* ── Tab Bar ── */}
                    <div
                        className="flex gap-1 p-1.5 rounded-full border border-white/10 shadow-inner animate-fade-in-scale"
                        style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(24px)", animationDelay: "150ms" }}
                    >
                        <button
                            onClick={() => setActiveTab("datewise")}
                            className={`flex-1 py-3 px-4 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer
                                ${activeTab === "datewise"
                                    ? "bg-[#c799ff]/90 text-[#340064] shadow-lg"
                                    : "text-[#aaaab7] hover:text-[#f0f0fd]"
                                }`}
                        >
                            Date-wise Distribution
                        </button>
                        <button
                            onClick={() => setActiveTab("earnings")}
                            className={`flex-1 py-3 px-4 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer
                                ${activeTab === "earnings"
                                    ? "bg-[#c799ff]/90 text-[#340064] shadow-lg"
                                    : "text-[#aaaab7] hover:text-[#f0f0fd]"
                                }`}
                        >
                            Teacher Earnings
                        </button>
                    </div>

                    {/* ═══ Tab 1: Date-wise Distribution ═══ */}
                    {activeTab === "datewise" && (
                        <section className="space-y-4 animate-fade-in-scale" style={{ animationDelay: "200ms" }}>
                            <div className="flex justify-between items-end mb-2">
                                <h2 className="font-bold text-xl text-[#f0f0fd]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                    Distribution History
                                </h2>
                                <span className="text-[#4af8e3] text-xs font-bold border border-[#4af8e3]/30 px-4 py-1.5 rounded-full bg-[#4af8e3]/10 backdrop-blur-md">
                                    Recent
                                </span>
                            </div>

                            {data.dates && data.dates.length > 0 ? (
                                <div className="space-y-4">
                                    {data.dates.map((dist, distIdx) => {
                                        const isExpanded = expandedDate === dist.date;
                                        const formattedDate = formatDateStr(dist.date);
                                        return (
                                            <GlassCard
                                                key={dist.date}
                                                className="overflow-hidden shadow-2xl animate-fade-in-scale"
                                                style={{
                                                    borderRadius: 32,
                                                    border: dist.settled ? "1px solid rgba(74,248,227,0.15)" : "1px solid rgba(255,255,255,0.07)",
                                                    animationDelay: `${250 + distIdx * 80}ms`,
                                                }}
                                            >
                                                {/* Date Header */}
                                                <button
                                                    onClick={() => setExpandedDate(isExpanded ? null : dist.date)}
                                                    className="w-full p-5 flex justify-between items-center bg-white/5 border-b border-white/5 cursor-pointer hover:bg-white/[0.08] transition-colors"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div
                                                            className={`w-12 h-12 rounded-2xl flex items-center justify-center border backdrop-blur-xl
                                                                ${dist.settled
                                                                    ? "bg-[#4af8e3]/15 text-[#4af8e3] border-[#4af8e3]/20"
                                                                    : "bg-[#c799ff]/15 text-[#c799ff] border-[#c799ff]/20"
                                                                }`}
                                                            style={dist.settled ? { boxShadow: "0 0 20px rgba(74,248,227,0.15)" } : {}}
                                                        >
                                                            <span className="material-symbols-outlined">calendar_today</span>
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-bold text-base text-[#f0f0fd]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                                                {formattedDate}
                                                            </p>
                                                            <p className={`text-[10px] font-bold uppercase tracking-wider ${dist.settled ? "text-[#4af8e3]" : "text-amber-400"}`}>
                                                                {dist.settled ? "Settled" : "Pending"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <p className="font-extrabold text-xl text-[#f0f0fd]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                                                ₹{dist.total.toLocaleString()}
                                                            </p>
                                                            <p className="text-[10px] text-[#aaaab7] font-medium">Total Volume</p>
                                                        </div>
                                                        <span className={`material-symbols-outlined text-[#aaaab7] transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                                                            expand_more
                                                        </span>
                                                    </div>
                                                </button>

                                                {/* Expandable Student Payments */}
                                                {isExpanded && (
                                                    <div className="p-4 space-y-2 animate-fade-in-scale">
                                                        {/* Teacher earnings for this date */}
                                                        <p className="text-[10px] text-[#aaaab7] uppercase tracking-widest font-bold px-2 mb-2">
                                                            Teacher Earnings · {dist.teachers.length} teacher(s)
                                                        </p>
                                                        {dist.teachers.map((t) => (
                                                            <div
                                                                key={t.uid}
                                                                className="px-5 py-4 flex justify-between items-center bg-white/[0.03] hover:bg-white/[0.08] transition-colors rounded-2xl border border-white/[0.05]"
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <InitialAvatar name={t.name} size={36} />
                                                                    <span className="text-sm font-semibold text-[#f0f0fd]">{t.name}</span>
                                                                    {t.uid === user?.uid && (
                                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#c799ff] bg-[#c799ff]/10 px-2 py-0.5 rounded-full border border-[#c799ff]/20">
                                                                            You
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-sm font-bold text-[#f0f0fd]">
                                                                    ₹{(t.amount || 0).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        ))}

                                                        {/* Student payments breakdown */}
                                                        {dist.payments && dist.payments.length > 0 && (
                                                            <>
                                                                <p className="text-[10px] text-[#aaaab7] uppercase tracking-widest font-bold px-2 mt-4 mb-2">
                                                                    Student Payments · {dist.payments_count} payment(s)
                                                                </p>
                                                                {dist.payments.map((p, idx) => (
                                                                    <div
                                                                        key={p.id || idx}
                                                                        className="px-5 py-3 flex justify-between items-center bg-white/[0.02] hover:bg-white/[0.06] transition-colors rounded-2xl border border-white/[0.03]"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-6 h-6 rounded-full bg-[#c799ff]/15 flex items-center justify-center text-[10px] font-bold text-[#c799ff] border border-[#c799ff]/20">
                                                                                {idx + 1}
                                                                            </div>
                                                                            <span className="text-sm text-[#f0f0fd]">{p.student_name}</span>
                                                                        </div>
                                                                        <span className="text-sm font-bold text-[#4af8e3]">
                                                                            ₹{(p.amount || 0).toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </GlassCard>
                                        );
                                    })}
                                </div>
                            ) : (
                                <GlassCard className="p-10 text-center rounded-[32px]">
                                    <span className="material-symbols-outlined text-5xl text-[#737580] mb-3 block">payments</span>
                                    <p className="text-[#aaaab7] text-base font-medium mb-1">
                                        No earnings in {MONTHS[month - 1]} {year}
                                    </p>
                                    <p className="text-[#737580] text-sm">
                                        Earnings will appear here once payments are approved.
                                    </p>
                                </GlassCard>
                            )}
                        </section>
                    )}

                    {/* ═══ Tab 2: Teacher Earnings Ledger ═══ */}
                    {activeTab === "earnings" && (
                        <section className="animate-fade-in-scale" style={{ animationDelay: "200ms" }}>
                            <div className="flex justify-between items-end mb-4">
                                <h2 className="font-bold text-xl text-[#f0f0fd]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                    Monthly Earnings Breakdown
                                </h2>
                            </div>

                            {data.dates && data.dates.length > 0 && allTeachers.length > 0 ? (
                                <GlassCard className="overflow-hidden rounded-[32px] shadow-2xl">
                                    {/* Header Labels */}
                                    <div className="bg-white/5 border-b border-white/5">
                                        {/* Total row */}
                                        <div className="grid px-6 py-4" style={{ gridTemplateColumns: `1fr ${allTeachers.map(() => "1fr").join(" ")} 1fr` }}>
                                            <span className="text-[10px] font-bold text-[#4af8e3] uppercase tracking-widest">Date</span>
                                            {allTeachers.map((t) => {
                                                const teacherTotal = data.dates.reduce((s, d) => {
                                                    const found = d.teachers.find((x) => x.uid === t.uid);
                                                    return s + (found ? found.amount : 0);
                                                }, 0);
                                                return (
                                                    <span key={t.uid} className="text-[10px] font-bold text-[#f0f0fd] uppercase tracking-widest text-center">
                                                        {t.name.split(" ")[0]}
                                                        <br />
                                                        <span className="text-[#4af8e3] text-sm font-extrabold" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                                            ₹{teacherTotal.toLocaleString()}
                                                        </span>
                                                    </span>
                                                );
                                            })}
                                            <span className="text-[10px] font-bold text-[#aaaab7] uppercase tracking-widest text-right">Status</span>
                                        </div>
                                    </div>

                                    {/* Date Rows */}
                                    {data.dates.map((dist, idx) => {
                                        const formattedDate = formatDateStr(dist.date);
                                        const teacherMap = {};
                                        for (const t of dist.teachers) teacherMap[t.uid] = t.amount;

                                        return (
                                            <div key={dist.date}>
                                                <div
                                                    className="grid px-6 py-5 items-center hover:bg-white/5 transition-colors"
                                                    style={{ gridTemplateColumns: `1fr ${allTeachers.map(() => "1fr").join(" ")} 1fr` }}
                                                >
                                                    <div>
                                                        <p className="text-sm font-bold text-[#f0f0fd]">
                                                            {formattedDate.split(" ").slice(0, 2).join(" ")}
                                                        </p>
                                                        <p className="text-[10px] text-[#aaaab7]">
                                                            {formattedDate.split(" ").slice(2).join(" ")}
                                                        </p>
                                                    </div>
                                                    {allTeachers.map((t) => (
                                                        <div key={t.uid} className="text-center">
                                                            <span className={`text-sm font-semibold ${t.uid === user?.uid ? "text-[#c799ff]" : "text-[#4af8e3]"}`}>
                                                                ₹{(teacherMap[t.uid] || 0).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-end">
                                                        {dist.settled ? (
                                                            <span className="bg-[#4af8e3]/10 text-[#4af8e3] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-tight ring-1 ring-[#4af8e3]/30">
                                                                Settled
                                                            </span>
                                                        ) : (
                                                            <span className="bg-[#ff6e84]/10 text-[#ff6e84] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-tight ring-1 ring-[#ff6e84]/30">
                                                                Pending
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {idx < data.dates.length - 1 && (
                                                    <div className="mx-6 h-px bg-white/5" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </GlassCard>
                            ) : (
                                <GlassCard className="p-10 text-center rounded-[32px]">
                                    <span className="material-symbols-outlined text-5xl text-[#737580] mb-3 block">group</span>
                                    <p className="text-[#aaaab7] text-base font-medium mb-1">
                                        No teacher earnings in {MONTHS[month - 1]} {year}
                                    </p>
                                    <p className="text-[#737580] text-sm">
                                        Earnings will appear once payments are confirmed.
                                    </p>
                                </GlassCard>
                            )}
                        </section>
                    )}
                </>
            ) : null}
        </div>
    );
}

export default function TeacherDistribution() {
    return (
        <ProtectedRoute allowedRoles={["teacher"]}>
            <TeacherLayout>
                <TeacherDistributionContent />
            </TeacherLayout>
        </ProtectedRoute>
    );
}
