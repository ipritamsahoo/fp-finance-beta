import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import TeacherLayout from "@/components/TeacherLayout";
import ProfilePicture from "@/components/ProfilePicture";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { getYearOptions } from "@/lib/yearOptions";
import { collection, query, where, onSnapshot } from "firebase/firestore";

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
function StudentAvatar({ name, size = 44 }) {
    const initial = (name || "?").charAt(0).toUpperCase();
    const colors = [
        "from-[#c799ff] to-[#7744b5]",
        "from-[#4af8e3] to-[#006a60]",
        "from-[#ff9dac] to-[#a70138]",
        "from-[#bc87fe] to-[#440080]",
        "from-[#33e9d5] to-[#005b51]",
    ];
    const colorIndex = (name || "").charCodeAt(0) % colors.length;
    return (
        <div
            className={`rounded-2xl bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white font-bold shadow-lg`}
            style={{ width: size, height: size, minWidth: size, fontSize: size * 0.4 }}
        >
            {initial}
        </div>
    );
}

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

// ── Filter Pill Select ──
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

// ── Main Content ──
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
            setError("");
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
            setError("");
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
            <div className="animate-fade-in-scale">
                <h1
                    className="text-lg font-bold text-[#f0f0fd]"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                    Welcome, {user?.name} 👋
                </h1>
            </div>

            {/* ── Summary Cards ── */}
            <section className="space-y-4 animate-fade-in-scale" style={{ animationDelay: "60ms" }}>
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
            <section className="animate-fade-in-scale" style={{ animationDelay: "120ms" }}>
                <div className="flex flex-wrap gap-2">
                    {/* Batch Pill */}
                    <PillSelect
                        icon="school"
                        value={selectedBatch}
                        onChange={(e) => setSelectedBatch(e.target.value)}
                    >
                        {batches.map((b) => (
                            <option key={b.id} value={b.id}>{b.batch_name}</option>
                        ))}
                    </PillSelect>

                    {/* Month Pill */}
                    <PillSelect
                        icon="calendar_month"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                    >
                        {MONTHS.map((m, i) => (
                            <option key={i} value={i + 1}>{m}</option>
                        ))}
                    </PillSelect>

                    {/* Year Pill */}
                    <PillSelect
                        icon="event"
                        value={filterYear}
                        onChange={(e) => setFilterYear(parseInt(e.target.value))}
                    >
                        {getYearOptions().map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </PillSelect>
                </div>
            </section>

            {/* ── Alerts ── */}
            {error && (
                <div className="p-4 rounded-2xl bg-[#ff6e84]/10 border border-[#ff6e84]/20 text-[#ff9dac] text-sm flex items-center justify-between animate-fade-in-scale">
                    <span>{error}</span>
                    <button onClick={() => setError("")} className="ml-2 text-[#ff6e84] hover:text-white cursor-pointer">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            )}
            {success && (
                <div className="p-4 rounded-2xl bg-[#4af8e3]/10 border border-[#4af8e3]/20 text-[#4af8e3] text-sm flex items-center justify-between animate-fade-in-scale">
                    <span>{success}</span>
                    <button onClick={() => setSuccess("")} className="ml-2 text-[#4af8e3] hover:text-white cursor-pointer">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            )}

            {/* ── Payment Status ── */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-10 h-10 border-4 border-[#3b82f6]/30 border-t-[#3b82f6] rounded-full animate-spin" />
                </div>
            ) : (
                /* ── SINGLE MONTH — Card Layout ── */
                <section className="animate-fade-in-scale" style={{ animationDelay: "200ms" }}>
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
                                    className="p-4 animate-fade-in-scale hover:border-[#c799ff]/20 transition-all"
                                    style={{ animationDelay: `${250 + idx * 60}ms` }}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <StudentAvatar name={p.student_name} size={48} />

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
                                            onClick={() => handleOfflineRequest(p)}
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
