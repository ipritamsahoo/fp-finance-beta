import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { getYearOptions } from "@/lib/yearOptions";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function StatusBadge({ status }) {
    const styles = {
        Paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        Pending_Verification: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        Unpaid: "bg-red-500/20 text-red-300 border-red-500/30",
    };
    return (
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles.Unpaid}`}>
            {status === "Pending_Verification" ? "Pending" : status}
        </span>
    );
}

function TeacherDashboardContent() {
    const { user } = useAuth();
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState("");
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [offlineLoading, setOfflineLoading] = useState(null);
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());

    const fetchBatches = useCallback(async () => {
        setError("");
        try {
            const data = await api.get("/api/teacher/batches");
            setBatches(data);
            if (data.length > 0 && !selectedBatch) {
                setSelectedBatch(data[0].id);
            }
            setError(""); // Clear error on successful fetch
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPayments = useCallback(async () => {
        if (!selectedBatch) return;
        setLoading(true);
        setError("");
        try {
            let url = `/api/teacher/payments?batch_id=${selectedBatch}&year=${filterYear}`;
            if (filterMonth) url += `&month=${filterMonth}`;
            const data = await api.get(url);
            setPayments(data);
            setError(""); // Clear error on successful fetch
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [selectedBatch, filterMonth, filterYear]);

    useEffect(() => {
        fetchBatches();

        const handleOnline = () => {
            setError("");
            fetchBatches();
            // fetchPayments is dependent on selectedBatch, so it will trigger naturally if batch exists
            if (selectedBatch) {
                fetchPayments();
            }
        };
        window.addEventListener("online", handleOnline);
        return () => window.removeEventListener("online", handleOnline);
    }, [fetchBatches, fetchPayments, selectedBatch]);

    useEffect(() => {
        if (selectedBatch) fetchPayments();
    }, [selectedBatch, fetchPayments]);

    // Real-time listener
    useEffect(() => {
        if (!selectedBatch) return;
        const q = query(
            collection(db, "payments"),
            where("batch_id", "==", selectedBatch)
        );
        const unsubscribe = onSnapshot(q, () => {
            fetchPayments();
        });
        return () => unsubscribe();
    }, [selectedBatch, fetchPayments]);

    const handleOfflineRequest = async (payment) => {
        setOfflineLoading(payment.id);
        setError("");
        try {
            await api.post("/api/teacher/offline-request", {
                student_id: payment.student_id,
                month: payment.month || filterMonth,
                year: payment.year || filterYear,
                amount: payment.amount,
            });
            setSuccess("Offline payment request submitted for approval.");
            fetchPayments();
        } catch (err) {
            const msg = typeof err.message === "string" ? err.message : JSON.stringify(err.message);
            setError(msg);
        } finally {
            setOfflineLoading(null);
        }
    };

    const isAllMonths = filterMonth === "";

    // For single-month view
    const totalStudents = payments.length;
    const paidCount = payments.filter((p) => p.status === "Paid").length;
    const unpaidCount = payments.filter((p) => p.status === "Unpaid").length;

    // For All Months pivot view
    const pivotStudentMap = {};
    const monthTotals = Array(12).fill(0);

    if (isAllMonths) {
        for (const p of payments) {
            const sid = p.student_id;
            if (!pivotStudentMap[sid]) pivotStudentMap[sid] = { name: p.student_name, months: {} };
            pivotStudentMap[sid].months[p.month] = p;

            if (p.status === "Paid") {
                monthTotals[p.month - 1] += (p.amount || 0);
            }
        }
    }
    const pivotStudents = Object.entries(pivotStudentMap)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));

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

    const statusLabel = (s) => (s === "Pending_Verification" ? "Pending" : s || "—");

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-white">Welcome, {user?.name} 👋</h1>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 mb-6 relative">
                <div className="rounded-xl p-3 sm:p-5 bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/20 glass-card animate-fade-in-up">
                    <div className="flex items-center justify-between">
                        <div className="min-w-0">
                            <p className="text-[#8a8f98] text-[10px] sm:text-sm truncate font-medium">Students</p>
                            <p className="text-lg sm:text-3xl font-bold text-indigo-300 mt-0.5 sm:mt-1 tracking-tight">{totalStudents}</p>
                        </div>
                        <span className="text-xl sm:text-3xl opacity-80 shrink-0 ml-2 drop-shadow-md">🎓</span>
                    </div>
                </div>
                <div className="rounded-xl p-3 sm:p-5 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 glass-card animate-fade-in-up" style={{ animationDelay: "80ms" }}>
                    <div className="flex items-center justify-between">
                        <div className="min-w-0">
                            <p className="text-[#8a8f98] text-[10px] sm:text-sm truncate font-medium">Paid</p>
                            <p className="text-lg sm:text-3xl font-bold text-emerald-300 mt-0.5 sm:mt-1 tracking-tight">{paidCount}</p>
                        </div>
                        <span className="text-xl sm:text-3xl opacity-80 shrink-0 ml-2 drop-shadow-md">✅</span>
                    </div>
                </div>
                <div className="rounded-xl p-3 sm:p-5 bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 glass-card animate-fade-in-up col-span-2 sm:col-span-1" style={{ animationDelay: "160ms" }}>
                    <div className="flex items-center justify-between">
                        <div className="min-w-0">
                            <p className="text-[#8a8f98] text-[10px] sm:text-sm truncate font-medium">Unpaid</p>
                            <p className="text-lg sm:text-3xl font-bold text-red-300 mt-0.5 sm:mt-1 tracking-tight">{unpaidCount}</p>
                        </div>
                        <span className="text-xl sm:text-3xl opacity-80 shrink-0 ml-2 drop-shadow-md">⏳</span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error} <button onClick={() => setError("")} className="ml-2 cursor-pointer">✕</button>
                </div>
            )}
            {success && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                    {success} <button onClick={() => setSuccess("")} className="ml-2 cursor-pointer">✕</button>
                </div>
            )}

            {/* Filters */}
            <div className="glass-card rounded-xl p-4 sm:p-5 mb-6 animate-fade-in-up delay-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}
                        className="px-3 py-2.5 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50">
                        {batches.map((b) => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                    </select>
                    <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
                        className="px-3 py-2.5 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50">
                        <option value="">All Months</option>
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={filterYear} onChange={(e) => setFilterYear(parseInt(e.target.value))}
                        className="px-3 py-2.5 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50">
                        {getYearOptions().map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Payment list */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-[#3861fb]/30 border-t-[#3861fb] rounded-full animate-spin" />
                </div>
            ) : isAllMonths ? (
                /* ─── ALL MONTHS PIVOT TABLE ─── */
                <div className="glass-card rounded-xl overflow-hidden animate-fade-in-up delay-300">
                    {pivotStudents.length === 0 ? (
                        <div className="px-4 py-8 text-center text-slate-400">No payment records for {filterYear}.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse min-w-[900px]">
                                <thead className="bg-slate-800/40 sticky top-0 z-20">
                                    <tr className="bg-slate-800/80">
                                        <th className="px-4 py-3 text-left text-xs font-bold text-emerald-400 uppercase tracking-wider whitespace-nowrap border-b border-r border-[#1a1f2e]/40 min-w-[130px] sticky left-0 bg-[#0f1320]/95 z-30">
                                            Total Collected
                                        </th>
                                        {MONTHS.map((_, i) => (
                                            <th key={i} className="px-3 py-3 text-center text-sm font-bold text-emerald-400 tracking-wider border-b border-r border-[#1a1f2e]/40 min-w-[120px]">
                                                ₹{monthTotals[i].toLocaleString()}
                                            </th>
                                        ))}
                                    </tr>
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#8a8f98] uppercase tracking-wider whitespace-nowrap border-b border-r border-[#1a1f2e]/40 min-w-[130px] sticky left-0 bg-[#0a0a12]/95 z-30">
                                            Student Name
                                        </th>
                                        {MONTHS.map((m, i) => (
                                            <th key={i} className="px-3 py-3 text-center text-xs font-semibold text-[#8a8f98] uppercase tracking-wider border-b border-r border-[#1a1f2e]/40 min-w-[120px]">
                                                {m}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pivotStudents.map((student) => (
                                        <tr key={student.id} className="border-b border-slate-700/20 hover:bg-slate-800/10 transition-colors">
                                            <td className="px-4 py-3 text-sm text-white font-medium whitespace-nowrap border-r border-slate-700/40 sticky left-0 bg-slate-900/95 z-10">
                                                {student.name}
                                            </td>
                                            {MONTHS.map((_, mi) => {
                                                const monthNum = mi + 1;
                                                const p = student.months[monthNum];
                                                if (!p) {
                                                    return (
                                                        <td key={mi} className="px-2 py-2 text-center border-r border-slate-700/40">
                                                            <span className="text-slate-600 text-xs">—</span>
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
                                                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-semibold whitespace-nowrap"
                                                                style={{ boxShadow: "0 0 8px rgba(59,130,246,0.4), 0 0 2px rgba(59,130,246,0.2)" }}>
                                                                ₹{p.amount}
                                                            </span>
                                                            <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap ${stBg}`}
                                                                style={{ boxShadow: stGlow }}>
                                                                {statusLabel(p.status)}
                                                            </span>
                                                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[11px] font-medium whitespace-nowrap"
                                                                style={{ boxShadow: "0 0 8px rgba(139,92,246,0.4), 0 0 2px rgba(139,92,246,0.2)" }}>
                                                                {p.mode ? p.mode.charAt(0).toUpperCase() + p.mode.slice(1) : "—"}
                                                            </span>
                                                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-slate-500/15 border border-slate-500/30 text-slate-300 text-[11px] font-medium whitespace-nowrap"
                                                                style={{ boxShadow: "0 0 8px rgba(100,116,139,0.35), 0 0 2px rgba(100,116,139,0.15)" }}>
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
            ) : (
                /* ─── SINGLE MONTH LIST VIEW ─── */
                <>
                    {/* Mobile: Card layout */}
                    <div className="space-y-3 md:hidden">
                        {payments.map((p, idx) => (
                            <div key={p.id} className="glass-card rounded-xl p-4 animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <p className="text-white font-medium text-sm truncate flex-1">{p.student_name}</p>
                                    <StatusBadge status={p.status} />
                                </div>
                                <p className="text-[#8a8f98] text-xs mb-3">₹{p.amount}</p>
                                {p.status === "Unpaid" && (
                                    <button onClick={() => handleOfflineRequest(p)} disabled={offlineLoading === p.id}
                                        className="w-full py-2.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium
                                            active:bg-violet-500/30 disabled:opacity-50 cursor-pointer">
                                        {offlineLoading === p.id ? "Submitting..." : "💵 Mark Offline Paid"}
                                    </button>
                                )}
                            </div>
                        ))}
                        {payments.length === 0 && (
                            <div className="glass-card rounded-xl p-8 text-center text-[#8a8f98] text-sm">No payment records for this period.</div>
                        )}
                    </div>

                    {/* Desktop: Table */}
                    <div className="hidden md:block glass-card rounded-xl overflow-hidden animate-fade-in-up delay-300">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-[#0f1320]/40">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Student</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Amount</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1a1f2e]/30">
                                    {payments.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                                            <td className="px-4 py-3 text-sm text-white">{p.student_name}</td>
                                            <td className="px-4 py-3 text-sm text-slate-300">₹{p.amount}</td>
                                            <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                                            <td className="px-4 py-3 text-right">
                                                {p.status === "Unpaid" && (
                                                    <button onClick={() => handleOfflineRequest(p)} disabled={offlineLoading === p.id}
                                                        className="px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium hover:bg-violet-500/30 transition-all disabled:opacity-50 cursor-pointer">
                                                        {offlineLoading === p.id ? "..." : "💵 Mark Offline Paid"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {payments.length === 0 && (
                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-[#8a8f98]">No payment records for this period.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default function TeacherDashboard() {
    return (
        <ProtectedRoute allowedRoles={["teacher"]}>
            <DashboardLayout>
                <TeacherDashboardContent />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
