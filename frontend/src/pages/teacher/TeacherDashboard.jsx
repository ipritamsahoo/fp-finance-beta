import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import TeacherLayout from "@/components/TeacherLayout";
import ProfilePicture from "@/components/ProfilePicture";
import AnimatedGreeting from "@/components/AnimatedGreeting";
import CachedAvatar from "@/components/CachedAvatar";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { getYearOptions } from "@/lib/yearOptions";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import ModernSelect from "@/components/ModernSelect";
import { getCache, setCache } from "@/lib/memoryCache";
import { TeacherDashboardSkeleton } from "@/components/Skeletons";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// ── Status Badge ──
function StatusBadge({ status }) {
    const config = {
        Paid: {
            bg: "bg-[#4af8e3]/10",
            text: "text-[#4af8e3]",
            ring: "ring-[#4af8e3]/30",
            label: "PAID",
        },
        Pending_Verification: {
            bg: "bg-amber-400/10",
            text: "text-amber-400",
            ring: "ring-amber-400/30",
            label: "PENDING",
        },
        Unpaid: {
            bg: "bg-[#ff6e84]/10",
            text: "text-[#ff6e84]",
            ring: "ring-[#ff6e84]/30",
            label: "UNPAID",
        },
    };
    const c = config[status] || config.Unpaid;
    return (
        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-tight ring-1 ${c.bg} ${c.text} ${c.ring}`}>
            {c.label}
        </span>
    );
}

// ── Student Initial Avatar ──
// Removed in favor of CachedAvatar

// ── Glass Card Component ──
function GlassCard({ children, className = "", style = {} }) {
    return (
        <div
            className={`rounded-[28px] border border-white/[0.07] ${className}`}
            style={{
                background: "rgba(28, 31, 43, 0.6)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                ...style,
            }}
        >
            {children}
        </div>
    );
}



// ── Main Content ──
function TeacherDashboardContent() {
    const { user } = useAuth();
    
    // In-memory caching keys and initial resolution
    const cacheKeyBatches = `teacher_batches`;
    const cachedBatches = getCache(cacheKeyBatches);
    const initialBatch = cachedBatches?.[0]?.id || "";

    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());

    const cacheKeyPayments = `teacher_payments_${initialBatch}_${filterYear}_${filterMonth}`;
    const cachedPayments = initialBatch ? getCache(cacheKeyPayments) : null;

    const [batches, setBatches] = useState(cachedBatches || []);
    const [selectedBatch, setSelectedBatch] = useState(initialBatch);
    const [payments, setPayments] = useState(cachedPayments || []);
    
    // If either cache is missing, trigger the skeleton
    const [loading, setLoading] = useState(!cachedBatches || !cachedPayments);
    
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [offlineLoading, setOfflineLoading] = useState(null);
    const [warningModalData, setWarningModalData] = useState(null);
    const [warningConfirmText, setWarningConfirmText] = useState("");

    const fetchBatches = useCallback(async () => {
        try {
            const data = await api.get("/api/teacher/batches");
            if (JSON.stringify(getCache(cacheKeyBatches)) !== JSON.stringify(data)) {
                setBatches(data);
                setCache(cacheKeyBatches, data);
            }
            if (data.length > 0 && !selectedBatch) {
                setSelectedBatch(data[0].id);
            }
        } catch (err) {
            // Handled globally
        }
    }, [selectedBatch]); // Removing setLoading(false) here, relying on fetchPayments to do it.

    const fetchPayments = useCallback(async () => {
        if (!selectedBatch) return;
        
        // Show loading spinner ONLY if there is no cached data 
        const currentCacheKey = `teacher_payments_${selectedBatch}_${filterYear}_${filterMonth}`;
        const currentCache = getCache(currentCacheKey);
        if (!currentCache && !loading) {
            setLoading(true);
        }

        try {
            let url = `/api/teacher/payments?batch_id=${selectedBatch}&year=${filterYear}`;
            if (filterMonth) url += `&month=${filterMonth}`;
            const data = await api.get(url);
            
            if (JSON.stringify(currentCache) !== JSON.stringify(data)) {
                setPayments(data);
                setCache(currentCacheKey, data);
            }
        } catch (err) {
            // Handled globally
        } finally {
            setLoading(false);
        }
    }, [selectedBatch, filterMonth, filterYear, loading]);

    useEffect(() => {
        fetchBatches();
        const handleOnline = () => {
            fetchBatches();
            if (selectedBatch) fetchPayments();
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

    const handlePreOfflineClick = async (payment) => {
        setOfflineLoading(payment.id);
        setError("");
        
        try {
            // Pre-check for previous dues
            const targetMonth = payment.month || filterMonth;
            const targetYear = payment.year || filterYear;
            const sBatch = payment.batch_id || selectedBatch;
            
            const allBatchData = await api.get(`/api/teacher/payments?batch_id=${sBatch}`);
            
            // Sort by year, then month so they display nicely
            const dueRecords = allBatchData
                .filter(p => 
                    p.student_id === payment.student_id && 
                    p.status === "Unpaid" &&
                    (p.year < targetYear || (p.year === targetYear && p.month < targetMonth))
                )
                .sort((a, b) => {
                    if (a.year !== b.year) return a.year - b.year;
                    return a.month - b.month;
                });
            
            if (dueRecords.length > 0) {
                setOfflineLoading(null);
                setWarningModalData({ payment, dues: dueRecords });
                setWarningConfirmText("");
                return; // Stop here, wait for modal unblock
            }
            
            // No dues found, proceed
            handleOfflineRequest(payment);
        } catch (err) {
            setError(err.message);
            setOfflineLoading(null);
        }
    };

    const handleOfflineRequest = async (payment) => {
        setOfflineLoading(payment.id);
        setError("");
        setSuccess("");
        try {
            await api.post("/api/teacher/offline-request", {
                student_id: payment.student_id,
                month: payment.month || filterMonth,
                year: payment.year || filterYear,
                amount: payment.amount,
            });
            setSuccess("Offline payment request submitted!");
            fetchPayments();
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            const msg = typeof err.message === "string" ? err.message : JSON.stringify(err.message);
            setError(msg);
        } finally {
            setOfflineLoading(null);
        }
    };

    // Summary stats
    const totalStudents = payments.length;
    const paidCount = payments.filter((p) => p.status === "Paid").length;
    const unpaidCount = payments.filter((p) => p.status === "Unpaid").length;
    const pendingCount = payments.filter((p) => p.status === "Pending_Verification").length;

    const statusLabel = (s) => (s === "Pending_Verification" ? "Pending" : s || "—");
    const filteredPayments = payments.filter(p => p.status !== "Paid");
    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        try {
            const d = new Date(dateStr);
            return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
        } catch { return ""; }
    };

    const selectedBatchName = batches.find(b => b.id === selectedBatch)?.batch_name || "Select Batch";

    return (
        <div className="space-y-6">
            {/* ── Welcome ── */}
            <div>
                <h1
                    className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#f0f0fd]"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                    <AnimatedGreeting name={user?.name || "Teacher"} />
                </h1>
            </div>

            {/* ── Summary Cards ── */}
            <section className="space-y-4">
                {/* Total Students — Full Width */}
                <GlassCard className="p-6 relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-[#aaaab7] font-bold mb-2">
                                Total Students
                            </p>
                            <p className="text-4xl font-extrabold text-[#f0f0fd]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                {totalStudents}
                            </p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-[#3b82f6]/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#3b82f6] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                group
                            </span>
                        </div>
                    </div>
                </GlassCard>

                {/* Paid + Unpaid — 2 Columns */}
                <div className="grid grid-cols-2 gap-4">
                    <GlassCard className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-full bg-[#4af8e3]/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[#4af8e3] text-lg">check_circle</span>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-[#4af8e3]">Paid</span>
                        </div>
                        <p className="text-3xl font-extrabold text-[#f0f0fd]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            {paidCount}
                        </p>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-full bg-[#ff6e84]/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[#ff6e84] text-lg">cancel</span>
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-[#ff6e84]">Unpaid</span>
                        </div>
                        <p className="text-3xl font-extrabold text-[#f0f0fd]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            {unpaidCount}
                        </p>
                    </GlassCard>
                </div>
            </section>

            {/* ── Current Filter ── */}
            <section>
                <div className="flex flex-col md:grid md:grid-cols-4 gap-3">
                    <ModernSelect
                        icon="calendar_month"
                        value={filterMonth}
                        options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="w-full"
                    />

                    <ModernSelect
                        icon="event"
                        value={filterYear}
                        options={getYearOptions()}
                        onChange={(e) => setFilterYear(parseInt(e.target.value))}
                        className="w-full"
                    />

                    <ModernSelect
                        icon="school"
                        value={selectedBatch}
                        options={batches}
                        onChange={(e) => setSelectedBatch(e.target.value)}
                        className="w-full md:col-span-2"
                    />
                </div>
            </section>

            {/* ── Alerts ── */}
            {error && (
                <div className="p-4 rounded-2xl bg-[#ff6e84]/10 border border-[#ff6e84]/20 text-[#ff6e84] text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError("")} className="ml-2 text-[#ff6e84] hover:text-white cursor-pointer">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            )}
            {success && (
                <div className="p-4 rounded-2xl bg-[#4af8e3]/10 border border-[#4af8e3]/20 text-[#4af8e3] text-sm flex items-center justify-between">
                    <span>{success}</span>
                    <button onClick={() => setSuccess("")} className="ml-2 text-[#4af8e3] hover:text-white cursor-pointer">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            )}

            {/* ── Payment Status ── */}
            {loading ? (
                <div className="mt-6">
                    <TeacherDashboardSkeleton />
                </div>
            ) : (
                /* ── SINGLE MONTH — Card Layout ── */
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-lg text-[#f0f0fd]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            Pending Actions
                        </h2>
                    </div>
                    <div className="space-y-3">
                        {filteredPayments.length === 0 ? (
                            <GlassCard className="p-10 text-center">
                                <span className="material-symbols-outlined text-5xl text-[#3b82f6]/40 mb-3 block">verified</span>
                                <p className="text-[#f0f0fd] font-bold text-sm">No Pending Actions! 🎉</p>
                            </GlassCard>
                        ) : (
                            filteredPayments.map((p, idx) => (
                                <GlassCard
                                    key={p.id}
                                    className="p-4 hover:border-[#c799ff]/20 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <CachedAvatar uid={p.student_id} name={p.student_name} profile_pic_url={p.profile_pic_url} pic_version={p.pic_version} size={48} />

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-[#f0f0fd] truncate">{p.student_name}</p>
                                            <p className="text-xs text-[#aaaab7] mt-0.5">₹{p.amount}</p>
                                        </div>

                                        {/* Status */}
                                        <StatusBadge status={p.status} />
                                    </div>

                                    {/* Offline button for Unpaid */}
                                    {p.status === "Unpaid" && (
                                        <button
                                            onClick={() => handlePreOfflineClick(p)}
                                            disabled={offlineLoading === p.id}
                                            className="w-full mt-3 py-3 rounded-2xl bg-gradient-to-r from-[#4af8e3]/10 to-[#c799ff]/10 border border-[#4af8e3]/20 text-[#4af8e3] text-xs font-bold uppercase tracking-wider hover:from-[#4af8e3]/20 hover:to-[#c799ff]/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                                        >
                                            {offlineLoading === p.id ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-[#4af8e3]/30 border-t-[#4af8e3] rounded-full animate-spin" />
                                                    Submitting...
                                                </span>
                                            ) : (
                                                "Mark Offline Paid"
                                            )}
                                        </button>
                                    )}
                                </GlassCard>
                            ))
                        )}
                    </div>
                </section>
            )}

            {/* Offline Due Warning Modal */}
            {warningModalData && createPortal(
                (() => {
                    const { payment, dues } = warningModalData;
                    const targetText = `I confirm to skip dues`;
                    const currentM = MONTH_FULL[(payment.month || filterMonth) - 1];
                    const currentY = payment.year || filterYear;
                    
                    return (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setWarningModalData(null)}>
                            <div 
                                className="bg-[#0c0e17]/95 backdrop-blur-3xl rounded-[32px] p-6 sm:p-8 w-full max-w-md border border-amber-400/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative animate-modal-in"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-amber-400 font-bold text-xl flex items-center gap-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                        <span className="material-symbols-outlined">warning</span>
                                        Previous Dues Found!
                                    </h3>
                                    <button onClick={() => setWarningModalData(null)} className="text-[#aaaab7] hover:text-white transition-colors cursor-pointer p-2 rounded-full hover:bg-white/5 flex items-center justify-center">
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                                
                                <div className="space-y-4 mb-6 text-[#aaaab7]">
                                    <p className="text-sm text-[#f0f0fd] font-medium leading-relaxed">
                                        <span className="font-bold text-white">{payment.student_name}</span> has unpaid dues for previous months. 
                                    </p>
                                    
                                    <div className="bg-amber-400/5 border border-amber-400/10 p-4 rounded-2xl text-[13px] leading-relaxed text-amber-200/80">
                                        <p className="font-bold mb-2 text-amber-400/90 tracking-wide uppercase text-[11px]">Unpaid Months:</p>
                                        <ul className="space-y-1.5 font-medium">
                                            {dues.map(d => (
                                                <li key={d.id} className="flex items-center gap-2">
                                                    <span className="w-1 h-1 rounded-full bg-amber-400/40" />
                                                    {MONTH_FULL[d.month - 1]} {d.year} (₹{d.amount})
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <p className="text-xs font-medium text-amber-400/70 italic leading-snug">
                                        Are you sure you want to exceptionally mark {currentM} {currentY} as Paid (Offline)?
                                    </p>
    
                                    <div className="mt-4">
                                        <label className="block text-[11px] font-bold tracking-widest uppercase mb-2 text-[#aaaab7]">
                                            Type <span className="text-amber-400 font-black select-all cursor-pointer">{targetText}</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={warningConfirmText}
                                            onChange={(e) => setWarningConfirmText(e.target.value)}
                                            className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 focus:border-amber-400/50 focus:ring-amber-400 text-[#f0f0fd] text-sm font-medium focus:outline-none transition-all placeholder:text-[#464752]"
                                            placeholder={targetText}
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>
    
                                <div className="flex flex-col-reverse sm:flex-row gap-3 mt-8">
                                    <button onClick={() => setWarningModalData(null)} className="w-full sm:flex-1 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-widest text-[#aaaab7] bg-white/5 hover:bg-white/10 transition-all cursor-pointer">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            setWarningModalData(null);
                                            handleOfflineRequest(payment);
                                        }}
                                        disabled={warningConfirmText !== targetText}
                                        className="w-full sm:flex-[1.5] py-3.5 rounded-2xl bg-amber-400 text-[#0c0e17] shadow-[0_8px_20px_rgba(251,191,36,0.2)] text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:scale-100 cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">verified</span>
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })(),
                document.body
            )}
        </div>
    );
}

export default function TeacherDashboard() {
    return (
        <ProtectedRoute allowedRoles={["teacher"]}>
            <TeacherLayout>
                <TeacherDashboardContent />
            </TeacherLayout>
        </ProtectedRoute>
    );
}
