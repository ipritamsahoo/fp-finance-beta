import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { getYearOptions } from "@/lib/yearOptions";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function DistributionContent() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [batchFilter, setBatchFilter] = useState("");
    const [batches, setBatches] = useState([]);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [expandedDate, setExpandedDate] = useState(null);
    const [settleLoading, setSettleLoading] = useState(null);
    const [activeTab, setActiveTab] = useState("datewise");

    // Settle a date's distribution (one-time, irreversible)
    const handleSettle = async (date, paymentsCount) => {
        if (!confirm(`⚠️ PERMANENT ACTION\n\nSettle distribution for ${date}?\nThis will freeze ${paymentsCount} payment(s) and teacher shares permanently.\n\nThis action CANNOT be undone.`)) return;
        setSettleLoading(date);
        setError("");
        try {
            await api.post("/api/admin/settle-distribution", {
                date,
                month,
                year,
                batch_id: batchFilter || null,
            });
            fetchDistribution();
        } catch (err) {
            setError(err.message);
        } finally {
            setSettleLoading(null);
        }
    };

    // Fetch batches for the filter dropdown
    useEffect(() => {
        api.get("/api/admin/batches").then(setBatches).catch(() => { });
    }, []);

    // Auto-select first batch
    useEffect(() => {
        if (batches.length > 0 && !batchFilter) {
            setBatchFilter(batches[0].id);
        }
    }, [batches, batchFilter]);

    const fetchDistribution = useCallback(async () => {
        if (!batchFilter) return;
        setLoading(true);
        setError("");
        try {
            let url = `/api/admin/distribution?month=${month}&year=${year}&batch_id=${batchFilter}`;
            const res = await api.get(url);
            setData(res);
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

    // Collect unique teacher names from all dates for the ledger table
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

    return (
        <div>
            {/* Header + Selectors */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Revenue Distribution 💸</h1>
                    <p className="text-[#8a8f98] text-sm mt-1">Teacher payment split based on confirmation date</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                        className="px-3 py-2.5 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50">
                        {MONTHS.map((m, i) => (
                            <option key={i + 1} value={i + 1}>{m}</option>
                        ))}
                    </select>
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                        className="px-3 py-2.5 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50">
                        {yearOptions.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    {batches.length > 0 ? (
                        <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}
                            className="px-3 py-2.5 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50">
                            {batches.map((b) => (
                                <option key={b.id} value={b.id}>{b.batch_name}</option>
                            ))}
                        </select>
                    ) : (
                        <div className="px-3 py-2.5 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 w-32 h-[38px] animate-pulse" />
                    )}
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error} <button onClick={() => setError("")} className="ml-2 cursor-pointer">✕</button>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-[#3861fb]/30 border-t-[#3861fb] rounded-full animate-spin" />
                </div>
            ) : data ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
                        <div className="glass-card rounded-xl p-4 sm:p-5 animate-fade-in-up">
                            <p className="text-[#8a8f98] text-xs uppercase tracking-wider mb-1">Total Collected</p>
                            <p className="text-2xl sm:text-3xl font-bold text-emerald-400">₹{data.total_collected.toLocaleString()}</p>
                            <p className="text-[#5a5f68] text-xs mt-1">{MONTHS[month - 1]} {year}</p>
                        </div>
                        <div className="glass-card rounded-xl p-4 sm:p-5 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
                            <p className="text-[#8a8f98] text-xs uppercase tracking-wider mb-1">Teachers Earning</p>
                            <p className="text-2xl sm:text-3xl font-bold text-blue-400">{data.teacher_totals.length}</p>
                            <p className="text-[#5a5f68] text-xs mt-1">Across {data.batches.length} batch(es)</p>
                        </div>
                    </div>

                    {/* ═══ Tab Bar ═══ */}
                    <div className="flex flex-col sm:flex-row gap-1 mb-6 p-1 rounded-xl bg-[#0f1320]/60 border border-[#1a1f2e]/50 animate-fade-in-up" style={{ animationDelay: "130ms" }}>
                        <button
                            onClick={() => setActiveTab("datewise")}
                            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                                ${activeTab === "datewise"
                                    ? "bg-gradient-to-r from-[#3861fb]/20 to-[#2b4fcf]/10 text-white border border-[#3861fb]/30 shadow-[0_0_15px_rgba(56,97,251,0.15)]"
                                    : "text-[#8a8f98] hover:text-white hover:bg-[#1a1f2e]/40"
                                }`}
                        >
                            📅 Date-wise Distribution
                        </button>
                        <button
                            onClick={() => setActiveTab("earnings")}
                            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                                ${activeTab === "earnings"
                                    ? "bg-gradient-to-r from-[#3861fb]/20 to-[#2b4fcf]/10 text-white border border-[#3861fb]/30 shadow-[0_0_15px_rgba(56,97,251,0.15)]"
                                    : "text-[#8a8f98] hover:text-white hover:bg-[#1a1f2e]/40"
                                }`}
                        >
                            👨‍🏫 Teacher Earnings
                        </button>
                    </div>

                    {/* ═══ Tab 1: Date-wise Distribution ═══ */}
                    {activeTab === "datewise" && (
                        <>
                            {data.dates && data.dates.length > 0 ? (
                                <div className="animate-fade-in-up">
                                    <div className="space-y-3">
                                        {data.dates.map((dist) => {
                                            const isExpanded = expandedDate === dist.date;
                                            const formattedDate = (() => {
                                                try {
                                                    const d = new Date(dist.date + "T00:00:00");
                                                    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                                                } catch { return dist.date; }
                                            })();
                                            return (
                                                <div key={dist.date} className={`glass-card rounded-xl overflow-hidden ${dist.settled ? "border border-emerald-500/20" : ""}`}>
                                                    {/* Row header — clickable */}
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-2">
                                                        <button
                                                            onClick={() => setExpandedDate(isExpanded ? null : dist.date)}
                                                            className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                                                        >
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm shrink-0 ${dist.settled
                                                                ? "bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30"
                                                                : "bg-gradient-to-br from-[#3861fb]/20 to-[#2b4fcf]/20 border border-[#3861fb]/30"
                                                                }`}>
                                                                {dist.settled ? "✅" : "📅"}
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-white font-semibold text-sm">{formattedDate}</p>
                                                                <p className="text-[#5a5f68] text-xs">
                                                                    {dist.payments_count} payment(s) · {dist.teachers.length} teacher(s)
                                                                    {dist.settled && <span className="text-emerald-400 ml-1">· Permanently Settled</span>}
                                                                </p>
                                                            </div>
                                                        </button>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                                                                ₹{dist.total.toLocaleString()}
                                                            </span>
                                                            {/* Settle button — only for unsettled dates */}
                                                            {dist.settled ? (
                                                                <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/70 text-xs font-semibold select-none">
                                                                    🔒 Settled
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleSettle(dist.date, dist.payments_count); }}
                                                                    disabled={settleLoading === dist.date}
                                                                    className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold
                                                                        hover:bg-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
                                                                    title="Lock this date's distribution permanently (irreversible)"
                                                                >
                                                                    {settleLoading === dist.date ? "..." : "🔒 Settle"}
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => setExpandedDate(isExpanded ? null : dist.date)}
                                                                className={`text-[#8a8f98] transition-transform duration-200 cursor-pointer ${isExpanded ? "rotate-180" : ""}`}>
                                                                ▼
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Expanded teacher breakdown */}
                                                    {isExpanded && (
                                                        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-[#1a1f2e]/30">
                                                            <p className="text-[#8a8f98] text-xs uppercase tracking-wider mt-3 mb-2">
                                                                Student Payments for {formattedDate}
                                                                {dist.settled && <span className="text-emerald-400 ml-1">(Permanently frozen)</span>}
                                                            </p>

                                                            {/* Mobile view */}
                                                            <div className="space-y-2 md:hidden">
                                                                {dist.payments && dist.payments.map((p, idx) => (
                                                                    <div key={p.id || idx} className="flex items-center justify-between py-2 border-b border-[#1a1f2e]/20 last:border-0">
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#3861fb] to-[#2b4fcf] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                                                                {idx + 1}
                                                                            </div>
                                                                            <p className="text-white text-sm truncate">{p.student_name}</p>
                                                                        </div>
                                                                        <p className="text-emerald-400 text-sm font-bold whitespace-nowrap ml-2">
                                                                            ₹{(p.amount || 0).toLocaleString()}
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                                {(!dist.payments || dist.payments.length === 0) && (
                                                                    <p className="text-[#5a5f68] text-sm py-2">No payment details available.</p>
                                                                )}
                                                            </div>

                                                            {/* Desktop table */}
                                                            <div className="hidden md:block">
                                                                <table className="w-full">
                                                                    <thead>
                                                                        <tr className="text-xs text-[#5a5f68] uppercase">
                                                                            <th className="text-left py-2 w-12">#</th>
                                                                            <th className="text-left py-2">Student</th>
                                                                            <th className="text-right py-2">Amount</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {dist.payments && dist.payments.map((p, idx) => (
                                                                            <tr key={p.id || idx} className="border-t border-[#1a1f2e]/20 hover:bg-slate-800/10 transition-colors">
                                                                                <td className="py-2.5 text-sm text-[#5a5f68]">{idx + 1}</td>
                                                                                <td className="py-2.5 text-sm text-white font-medium">{p.student_name}</td>
                                                                                <td className="py-2.5 text-sm text-emerald-400 font-bold text-right">
                                                                                    ₹{(p.amount || 0).toLocaleString()}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                        {(!dist.payments || dist.payments.length === 0) && (
                                                                            <tr>
                                                                                <td colSpan="3" className="py-4 text-[#5a5f68] text-sm text-center border-t border-[#1a1f2e]/20">No payment details available.</td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="glass-card rounded-xl p-8 text-center animate-fade-in-up">
                                    <p className="text-[#8a8f98] text-lg mb-1">No payments confirmed in {MONTHS[month - 1]} {year}</p>
                                    <p className="text-[#5a5f68] text-sm">Payments will appear here once approved by admin.</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* ═══ Tab 2: Teacher Earnings Ledger ═══ */}
                    {activeTab === "earnings" && (
                        <div className="animate-fade-in-up">
                            {data.dates && data.dates.length > 0 && allTeachers.length > 0 ? (
                                <>
                                    {/* Ledger table (scrollable on mobile) */}
                                    <div className="glass-card rounded-xl overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse min-w-[600px]">
                                                <thead className="bg-[#0f1320]/40 sticky top-0 z-20">
                                                    {/* Summary row: Total Collected per teacher for the month */}
                                                    <tr className="bg-[#0f1320]/80">
                                                        <th className="px-4 py-3 text-left text-xs font-bold text-emerald-400 uppercase tracking-wider whitespace-nowrap border-b border-r border-[#1a1f2e]/40 min-w-[140px] sticky left-0 bg-[#0f1320]/95 z-30">
                                                            Total Collected
                                                        </th>
                                                        {allTeachers.map((t) => {
                                                            const teacherTotal = data.dates.reduce((s, d) => {
                                                                const found = d.teachers.find((x) => x.uid === t.uid);
                                                                return s + (found ? found.amount : 0);
                                                            }, 0);
                                                            return (
                                                                <th key={t.uid} className="px-4 py-3 text-center text-sm font-bold text-emerald-400 border-b border-r border-[#1a1f2e]/40 min-w-[130px]">
                                                                    ₹{teacherTotal.toLocaleString()}
                                                                </th>
                                                            );
                                                        })}
                                                        <th className="px-4 py-3 border-b border-[#1a1f2e]/40 min-w-[110px]"></th>
                                                    </tr>
                                                    {/* Column headers */}
                                                    <tr className="bg-[#0a0a12]/95">
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#8a8f98] uppercase tracking-wider whitespace-nowrap border-b border-r border-[#1a1f2e]/40 sticky left-0 bg-[#0a0a12]/95 z-30">
                                                            Date
                                                        </th>
                                                        {allTeachers.map((t) => (
                                                            <th key={t.uid} className="px-4 py-3 text-center text-xs font-semibold text-[#8a8f98] uppercase tracking-wider border-b border-r border-[#1a1f2e]/40">
                                                                {t.name}
                                                            </th>
                                                        ))}
                                                        <th className="px-4 py-3 text-center text-xs font-semibold text-[#8a8f98] uppercase tracking-wider border-b border-[#1a1f2e]/40">
                                                            Status
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data.dates.map((dist) => {
                                                        const formattedDate = (() => {
                                                            try {
                                                                const d = new Date(dist.date + "T00:00:00");
                                                                return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                                                            } catch { return dist.date; }
                                                        })();
                                                        const teacherMap = {};
                                                        for (const t of dist.teachers) teacherMap[t.uid] = t.amount;

                                                        return (
                                                            <tr key={dist.date} className="border-b border-[#1a1f2e]/20 hover:bg-[#0f1320]/10 transition-colors">
                                                                <td className="px-4 py-3 text-sm text-white font-medium whitespace-nowrap border-r border-[#1a1f2e]/40 sticky left-0 bg-[#0a0a12]/95 z-10">{formattedDate}</td>
                                                                {allTeachers.map((t) => (
                                                                    <td key={t.uid} className="px-4 py-3 border-r border-[#1a1f2e]/40 text-center">
                                                                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold"
                                                                            style={{ boxShadow: "0 0 8px rgba(59,130,246,0.4), 0 0 2px rgba(59,130,246,0.2)" }}>
                                                                            ₹{(teacherMap[t.uid] || 0).toLocaleString()}
                                                                        </span>
                                                                    </td>
                                                                ))}
                                                                <td className="px-4 py-3 text-center">
                                                                    {dist.settled ? (
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold"
                                                                            style={{ boxShadow: "0 0 8px rgba(16,185,129,0.4), 0 0 2px rgba(16,185,129,0.2)" }}>
                                                                            🔒 Settled
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold"
                                                                            style={{ boxShadow: "0 0 8px rgba(245,158,11,0.4), 0 0 2px rgba(245,158,11,0.2)" }}>
                                                                            ⏳ Pending
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="glass-card rounded-xl p-8 text-center">
                                    <p className="text-[#8a8f98] text-lg mb-1">No teacher earnings in {MONTHS[month - 1]} {year}</p>
                                    <p className="text-[#5a5f68] text-sm">Earnings will appear once payments are confirmed.</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : null
            }
        </div >
    );
}

export default function RevenueDistribution() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout>
                <DistributionContent />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
