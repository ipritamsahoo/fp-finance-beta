import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { getYearOptions } from "@/lib/yearOptions";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function PaymentsContent() {
    const now = new Date();
    const [batches, setBatches] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [filterBatch, setFilterBatch] = useState("");
    const [filterYear, setFilterYear] = useState(now.getFullYear());

    useEffect(() => {
        api.get("/api/admin/batches").then(setBatches).catch(() => { });
    }, []);

    const fetchPayments = useCallback(async () => {
        if (!filterBatch) { setPayments([]); setLoading(false); return; }
        setLoading(true);
        setError("");
        try {
            const res = await api.get(`/api/admin/payments?batch_id=${filterBatch}&year=${filterYear}`);
            setPayments(res);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [filterBatch, filterYear]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    // Auto-select first batch
    useEffect(() => {
        if (batches.length > 0 && !filterBatch) {
            setFilterBatch(batches[0].id);
        }
    }, [batches, filterBatch]);

    const yearOptions = getYearOptions();

    // Pivot: group payments by student, then by month
    const studentMap = {};
    for (const p of payments) {
        const sid = p.student_id;
        if (!studentMap[sid]) {
            studentMap[sid] = { name: p.student_name, months: {} };
        }
        studentMap[sid].months[p.month] = p;
    }

    const students = Object.entries(studentMap)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));

    // Monthly Totals
    const monthTotals = Array(12).fill(0);
    for (const p of payments) {
        if (p.status === "Paid") {
            monthTotals[p.month - 1] += (p.amount || 0);
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        try {
            const d = new Date(dateStr);
            const dd = String(d.getDate()).padStart(2, "0");
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const yyyy = d.getFullYear();
            return `${dd}.${mm}.${yyyy}`;
        } catch { return ""; }
    };

    const statusColor = (status) => {
        if (status === "Paid") return "text-emerald-400";
        if (status === "Pending_Verification") return "text-amber-400";
        return "text-red-400";
    };

    const statusLabel = (status) => {
        if (status === "Pending_Verification") return "Pending";
        return status || "—";
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-white">All Payments 💰</h1>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error} <button onClick={() => setError("")} className="ml-2 cursor-pointer">✕</button>
                </div>
            )}

            {/* Filters */}
            <div className="glass-card rounded-xl p-5 mb-6 animate-fade-in-up">
                <div className="flex flex-wrap gap-3">
                    <select value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50">
                        <option value="">Select Batch</option>
                        {batches.map((b) => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                    </select>
                    <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))}
                        className="px-3 py-2 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50">
                        {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Pivot Table */}
            <div className="glass-card rounded-xl overflow-hidden animate-fade-in-up delay-100">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-[#3861fb]/30 border-t-[#3861fb] rounded-full animate-spin" />
                    </div>
                ) : !filterBatch ? (
                    <div className="px-4 py-8 text-center text-[#8a8f98]">Select a batch to view payments.</div>
                ) : students.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[#8a8f98]">No payment records found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[900px]">
                            <thead className="bg-[#0f1320]/40 sticky top-0 z-20">
                                <tr className="bg-[#0f1320]/80">
                                    <th className="px-4 py-3 text-left text-xs font-bold text-emerald-400 uppercase tracking-wider whitespace-nowrap border-b border-r border-[#1a1f2e]/40 min-w-[130px] sticky left-0 bg-[#0f1320]/95 z-30">
                                        Total Collected
                                    </th>
                                    {MONTHS_SHORT.map((_, i) => (
                                        <th key={i} className="px-3 py-3 text-center text-sm font-bold text-emerald-400 tracking-wider border-b border-r border-[#1a1f2e]/40 min-w-[120px]">
                                            ₹{monthTotals[i].toLocaleString()}
                                        </th>
                                    ))}
                                </tr>
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#8a8f98] uppercase tracking-wider whitespace-nowrap border-b border-r border-[#1a1f2e]/40 min-w-[130px] sticky left-0 bg-[#0a0a12]/95 z-30">
                                        Student Name
                                    </th>
                                    {MONTHS_SHORT.map((m, i) => (
                                        <th key={i} className="px-3 py-3 text-center text-xs font-semibold text-[#8a8f98] uppercase tracking-wider border-b border-r border-[#1a1f2e]/40 min-w-[120px]">
                                            {m}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student) => (
                                    <tr key={student.id} className="border-b border-[#1a1f2e]/20 hover:bg-[#0f1320]/10 transition-colors">
                                        <td className="px-4 py-3 text-sm text-white font-medium whitespace-nowrap border-r border-[#1a1f2e]/40 sticky left-0 bg-[#0a0a12]/95 z-10">
                                            {student.name}
                                        </td>
                                        {MONTHS_SHORT.map((_, mi) => {
                                            const monthNum = mi + 1;
                                            const p = student.months[monthNum];
                                            if (!p) {
                                                return (
                                                    <td key={mi} className="px-2 py-2 text-center border-r border-[#1a1f2e]/40">
                                                        <span className="text-[#3a3f48] text-xs">—</span>
                                                    </td>
                                                );
                                            }
                                            const stBg = p.status === "Paid"
                                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                                : p.status === "Pending_Verification"
                                                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                                    : "bg-red-500/15 border-red-500/30 text-red-400";
                                            const stGlow = p.status === "Paid"
                                                ? "0 0 8px rgba(16,185,129,0.4), 0 0 2px rgba(16,185,129,0.2)"
                                                : p.status === "Pending_Verification"
                                                    ? "0 0 8px rgba(245,158,11,0.4), 0 0 2px rgba(245,158,11,0.2)"
                                                    : "0 0 8px rgba(239,68,68,0.4), 0 0 2px rgba(239,68,68,0.2)";
                                            return (
                                                <td key={mi} className="px-2 py-2 border-r border-[#1a1f2e]/40">
                                                    <div className="grid grid-cols-2 gap-1.5 min-w-[130px]">
                                                        {/* Amount */}
                                                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-semibold whitespace-nowrap"
                                                            style={{ boxShadow: "0 0 8px rgba(59,130,246,0.4), 0 0 2px rgba(59,130,246,0.2)" }}>
                                                            ₹{p.amount}
                                                        </span>
                                                        {/* Status */}
                                                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap ${stBg}`}
                                                            style={{ boxShadow: stGlow }}>
                                                            {statusLabel(p.status)}
                                                        </span>
                                                        {/* Mode */}
                                                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[11px] font-medium whitespace-nowrap"
                                                            style={{ boxShadow: "0 0 8px rgba(139,92,246,0.4), 0 0 2px rgba(139,92,246,0.2)" }}>
                                                            {p.mode ? p.mode.charAt(0).toUpperCase() + p.mode.slice(1) : "—"}
                                                        </span>
                                                        {/* Date */}
                                                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-[#1a1f2e]/40 border border-[#1a1f2e]/50 text-[#8a8f98] text-[11px] font-medium whitespace-nowrap"
                                                            style={{ boxShadow: "0 0 8px rgba(26,31,46,0.35), 0 0 2px rgba(26,31,46,0.15)" }}>
                                                            {p.status === "Paid" && p.updated_at ? formatDate(p.updated_at) : "—"}
                                                        </span>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AllPayments() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout>
                <PaymentsContent />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
