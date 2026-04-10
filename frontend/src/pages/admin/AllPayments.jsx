import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";
import { api } from "@/lib/api";
import { getYearOptions } from "@/lib/yearOptions";
import ModernSelect from "@/components/ModernSelect";
import { getCache, setCache } from "@/lib/memoryCache";
import { GenericListSkeleton } from "@/components/Skeletons";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function PaymentsContent() {
    const now = new Date();
    
    const cacheKeyBatches = "admin_all_batches";
    const cachedBatches = getCache(cacheKeyBatches);

    const [batches, setBatches] = useState(cachedBatches || []);
    const [filterBatch, setFilterBatch] = useState("");
    const [filterYear, setFilterYear] = useState(now.getFullYear());
    
    const cacheKeyPayments = `admin_all_payments_${filterBatch}_${filterYear}`;
    const cachedPayments = filterBatch ? getCache(cacheKeyPayments) : null;

    const [payments, setPayments] = useState(cachedPayments || []);
    const [loading, setLoading] = useState(!cachedBatches || (filterBatch && !cachedPayments));
    const [error, setError] = useState("");

    useEffect(() => {
        api.get("/api/admin/batches").then((res) => {
            if (JSON.stringify(getCache(cacheKeyBatches)) !== JSON.stringify(res)) {
                 setBatches(res);
                 setCache(cacheKeyBatches, res);
            }
        }).catch(() => { });
    }, []);

    const fetchPayments = useCallback(async () => {
        if (!filterBatch) { setPayments([]); setLoading(false); return; }
        
        const currentCacheKey = `admin_all_payments_${filterBatch}_${filterYear}`;
        if (!getCache(currentCacheKey) && !loading) {
            setLoading(true);
        }
        
        setError("");
        try {
            const res = await api.get(`/api/admin/payments?batch_id=${filterBatch}&year=${filterYear}`);
            if (JSON.stringify(getCache(currentCacheKey)) !== JSON.stringify(res)) {
                setPayments(res);
                setCache(currentCacheKey, res);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            if (loading) setLoading(false);
        }
    }, [filterBatch, filterYear, loading]);

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
            studentMap[sid] = { name: p.student_name, profile_pic_url: p.profile_pic_url, pic_version: p.pic_version, months: {} };
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
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-[#f0f0fd] flex items-center gap-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    All Payments
                </h1>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-[#171924]/80 backdrop-blur-[20px] border border-[#ff6e84]/30 shadow-lg text-[#ff9dac] text-sm flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#ff6e84]">error</span>
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setError("")} className="ml-2 hover:text-white transition-colors cursor-pointer">✕</button>
                </div>
            )}

{/* Filters */}
            <div className="bg-[#171924]/60 backdrop-blur-[20px] border border-[#737580]/10 rounded-[2rem] p-5 transition-colors">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1 md:flex-none md:w-[220px] z-20">
                        <ModernSelect
                            value={filterBatch}
                            onChange={(e) => setFilterBatch(e.target.value)}
                            options={[{ id: "", batch_name: "Select Batch" }, ...batches]}
                            placeholder="Select Batch"
                            className="w-full flex items-center justify-between bg-[#222532]/50 border border-[#464752]/50 hover:border-[#3b82f6]/50 transition-colors rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 text-[#f0f0fd] text-sm"
                        />
                    </div>
                    <div className="relative flex-1 md:flex-none md:w-[140px] z-10">
                        <ModernSelect
                            value={filterYear}
                            onChange={(e) => setFilterYear(Number(e.target.value))}
                            options={yearOptions}
                            className="w-full flex items-center justify-between bg-[#222532]/50 border border-[#464752]/50 hover:border-[#3b82f6]/50 transition-colors rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 text-[#f0f0fd] text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Pivot Table */}
            <div className="bg-[#171924]/60 backdrop-blur-[20px] border border-[#737580]/10 rounded-3xl overflow-hidden transition-colors shadow-xl">
                {loading ? (
                    <div className="p-6">
                        <GenericListSkeleton />
                    </div>
                ) : !filterBatch ? (
                    <div className="flex-1 flex items-center justify-center p-12 text-[#aaaab7]" style={{ fontFamily: "'Inter', sans-serif" }}>Select a batch to view payments.</div>
                ) : students.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-12 text-[#aaaab7]" style={{ fontFamily: "'Inter', sans-serif" }}>No payment records found.</div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse min-w-[1200px]">
                            <thead className="bg-[#0c0e17]/80 backdrop-blur-xl sticky top-0 z-20">
                                <tr className="border-b border-white/5">
                                    <th className="px-4 py-3 text-left text-xs font-bold text-[#4af8e3] uppercase tracking-wider whitespace-nowrap w-0 border-r border-[#464752]/40 sticky left-0 bg-[#0c0e17]/60 backdrop-blur-md z-30 shadow-[4px_0_10px_rgba(0,0,0,0.3)]">
                                        Monthly Totals
                                    </th>
                                    {MONTHS_SHORT.map((_, i) => (
                                        <th key={i} className="px-4 py-3 text-center text-sm font-bold text-[#4af8e3] tracking-widest border-r border-[#464752]/40 min-w-[170px]">
                                            ₹{monthTotals[i].toLocaleString()}
                                        </th>
                                    ))}
                                </tr>
                                <tr className="border-b border-[#464752]/40">
                                    <th className="px-4 py-3 text-left text-xs font-bold text-[#aaaab7] uppercase tracking-widest whitespace-nowrap w-0 border-r border-[#464752]/40 sticky left-0 bg-[#0c0e17]/60 backdrop-blur-md z-30 shadow-[4px_0_10px_rgba(0,0,0,0.3)]">
                                        Student Name
                                    </th>
                                    {MONTHS_SHORT.map((m, i) => (
                                        <th key={i} className="px-4 py-3 text-center text-xs font-bold text-[#aaaab7] uppercase tracking-widest border-r border-[#464752]/40 min-w-[170px]">
                                            {m}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student) => (
                                    <tr key={student.id} className="border-b border-[#464752]/20 hover:bg-white/5 transition-colors group">
                                        <td className="px-4 py-4 text-sm text-[#f0f0fd] font-bold whitespace-nowrap w-0 border-r border-[#464752]/40 sticky left-0 bg-[#171924]/60 backdrop-blur-md group-hover:bg-[#1f2231]/80 transition-colors z-10 shadow-[4px_0_10px_rgba(0,0,0,0.15)]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                                <span>{student.name}</span>
                                        </td>
                                        {MONTHS_SHORT.map((_, mi) => {
                                            const monthNum = mi + 1;
                                            const p = student.months[monthNum];
                                            if (!p) {
                                                return (
                                                    <td key={mi} className="px-3 py-4 text-center border-r border-[#464752]/40 opacity-50">
                                                        <span className="text-[#aaaab7] text-xs">—</span>
                                                    </td>
                                                );
                                            }
                                            const stBg = p.status === "Paid"
                                                ? "bg-[#4af8e3]/10 border-[#4af8e3]/30 text-[#4af8e3]"
                                                : p.status === "Pending_Verification"
                                                    ? "bg-[#facc15]/10 border-[#facc15]/30 text-[#facc15]"
                                                    : p.status === "Rejected"
                                                        ? "bg-[#ff6e84]/10 border-[#ff6e84]/30 text-[#ff6e84]"
                                                        : "bg-[#fb923c]/10 border-[#fb923c]/30 text-[#fb923c]";
                                            const stGlow = p.status === "Paid"
                                                ? "0 0 8px rgba(74,248,227,0.4), 0 0 2px rgba(74,248,227,0.2)"
                                                : p.status === "Pending_Verification"
                                                    ? "0 0 8px rgba(250,204,21,0.4), 0 0 2px rgba(250,204,21,0.2)"
                                                    : p.status === "Rejected"
                                                        ? "0 0 8px rgba(255,110,132,0.4), 0 0 2px rgba(255,110,132,0.2)"
                                                        : "0 0 8px rgba(251,146,60,0.4), 0 0 2px rgba(251,146,60,0.2)";
                                            return (
                                                <td key={mi} className="px-2 py-4 border-r border-[#464752]/40 bg-black/10">
                                                    <div className="flex flex-col gap-1.5 w-[155px] mx-auto">
                                                        {/* Top Row: Amount & Status */}
                                                        <div className="grid grid-cols-2 gap-1.5 w-full">
                                                            <span className="flex items-center justify-center px-1.5 py-1 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/30 text-[#3b82f6] text-[10px] font-bold tracking-widest whitespace-nowrap shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                                                                ₹{p.amount}
                                                            </span>
                                                            <span className={`flex items-center justify-center px-1.5 py-1 rounded-full border text-[10px] uppercase font-bold tracking-widest whitespace-nowrap ${stBg}`}
                                                                style={{ boxShadow: stGlow }}>
                                                                {statusLabel(p.status)}
                                                            </span>
                                                        </div>
                                                        {/* Bottom Row: Mode & Date */}
                                                        <div className="grid grid-cols-2 gap-1.5 w-full">
                                                            <span className="flex items-center justify-center px-1.5 py-1 rounded-full bg-[#222532]/50 border border-[#464752]/50 text-[#aaaab7] text-[10px] font-bold tracking-widest whitespace-nowrap">
                                                                {p.mode ? p.mode.charAt(0).toUpperCase() + p.mode.slice(1) : "—"}
                                                            </span>
                                                            <span className="flex items-center justify-center px-1.5 py-1 rounded-full bg-[#171924]/60 border border-[#464752]/30 text-[#f0f0fd] text-[10px] font-bold tracking-widest whitespace-nowrap opacity-80">
                                                                {p.status === "Paid" && p.updated_at ? formatDate(p.updated_at) : "—"}
                                                            </span>
                                                        </div>
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
            <AdminLayout>
                <style dangerouslySetInnerHTML={{__html: `
                    .custom-scrollbar::-webkit-scrollbar {
                        height: 8px;
                        width: 8px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: rgba(12, 14, 23, 0.5);
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(59, 130, 246, 0.2);
                        border-radius: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(59, 130, 246, 0.5);
                    }
                `}} />
                <PaymentsContent />
            </AdminLayout>
        </ProtectedRoute>
    );
}
