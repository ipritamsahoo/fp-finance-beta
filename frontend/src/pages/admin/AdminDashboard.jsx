import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { getYearOptions } from "@/lib/yearOptions";
import { collection, onSnapshot } from "firebase/firestore";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function SkeletonStatCard({ delay }) {
    return (
        <div
            className="rounded-xl p-3 sm:p-5 border border-[#1a1f2e]/30 glass-card animate-fade-in-up"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-center justify-between h-full">
                <div className="min-w-0 w-full">
                    <div className="h-3 w-16 sm:h-4 sm:w-24 skeleton-loader mb-2"></div>
                    <div className="h-6 w-12 sm:h-8 sm:w-20 skeleton-loader"></div>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full skeleton-loader shrink-0 ml-2"></div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color, delay }) {
    const colors = {
        indigo: "from-[#3861fb]/20 to-[#3861fb]/10 border-[#3861fb]/20 text-[#7b9cff]",
        emerald: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-300",
        amber: "from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-300",
        violet: "from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-300",
        blue: "from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-300",
        rose: "from-rose-500/20 to-rose-600/10 border-rose-500/20 text-rose-300",
    };

    return (
        <div
            className={`rounded-xl p-3 sm:p-5 bg-gradient-to-br border ${colors[color]} glass-card animate-fade-in-up`}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-center justify-between">
                <div className="min-w-0">
                    <p className="text-[#8a8f98] text-[10px] sm:text-sm truncate font-medium">{label}</p>
                    <p className="text-lg sm:text-3xl font-bold mt-0.5 sm:mt-1 tracking-tight">{value}</p>
                </div>
                <span className="text-xl sm:text-3xl opacity-80 shrink-0 ml-2 drop-shadow-md">{icon}</span>
            </div>
        </div>
    );
}

function AdminDashboardContent() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
    const [genYear, setGenYear] = useState(new Date().getFullYear());
    const [genAmount, setGenAmount] = useState(500);
    const [genBatch, setGenBatch] = useState("");
    const [generating, setGenerating] = useState(false);
    const [undoing, setUndoing] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const fetchStats = useCallback(async () => {
        setError(""); // Clear persistent error before trying again
        try {
            const [statsData, batchData] = await Promise.all([
                api.get("/api/admin/stats"),
                api.get("/api/admin/batches"),
            ]);
            setStats(statsData);
            setBatches(batchData);
            setError(""); // Clear error on successful fetch
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();

        const handleOnline = () => {
            setError("");
            fetchStats();
        };
        window.addEventListener("online", handleOnline);
        return () => window.removeEventListener("online", handleOnline);
    }, [fetchStats]);

    // Real-time: auto-refresh stats when any payment changes in Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "payments"), () => {
            fetchStats();
        });
        return () => unsubscribe();
    }, [fetchStats]);

    const handleGenerate = async () => {
        setGenerating(true);
        setMessage("");
        setError("");
        try {
            const payload = {
                month: genMonth,
                year: genYear,
                amount: genAmount,
            };
            if (genBatch) payload.batch_id = genBatch;
            const data = await api.post("/api/admin/generate-monthly", payload);
            setMessage(data.message);
            fetchStats();
        } catch (err) {
            setError(err.message);
        } finally {
            setGenerating(false);
        }
    };

    const handleUndo = async () => {
        const monthName = MONTHS[genMonth - 1];
        if (!window.confirm(`Are you sure you want to undo fee generation for ${monthName} ${genYear}?\n\nThis will delete only "Unpaid" records. Paid and pending payments are safe.`)) return;
        setUndoing(true);
        setMessage("");
        setError("");
        try {
            const payload = { month: genMonth, year: genYear };
            if (genBatch) payload.batch_id = genBatch;
            const data = await api.post("/api/admin/undo-monthly", payload);
            setMessage(data.message);
            fetchStats();
        } catch (err) {
            setError(err.message);
        } finally {
            setUndoing(false);
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
                <div>
                    <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-white">Welcome, {user?.name} 👋</h1>
                </div>
            </div>

            {/* Messages */}
            <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                {error && (
                    <div className="toast-enter pointer-events-auto p-3 sm:p-4 rounded-xl glass-card border border-red-500/50 bg-red-950/80 shadow-lg shadow-red-900/20 text-red-200 text-sm flex items-center gap-3">
                        <span className="text-red-400">⚠️</span>
                        <p className="flex-1">{error}</p>
                        <button onClick={() => setError("")} className="ml-2 text-red-400 hover:text-red-300 transition-colors p-1 cursor-pointer">✕</button>
                    </div>
                )}
                {message && (
                    <div className="toast-enter pointer-events-auto p-3 sm:p-4 rounded-xl glass-card border border-emerald-500/50 bg-emerald-950/80 shadow-lg shadow-emerald-900/20 text-emerald-200 text-sm flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <span className="text-emerald-400">✓</span>
                            <p className="flex-1">{message}</p>
                            <button onClick={() => setMessage("")} className="ml-2 text-emerald-400 hover:text-emerald-300 transition-colors p-1 cursor-pointer">✕</button>
                        </div>
                        {!message.startsWith("Removed") && (
                            <p className="text-[10px] text-emerald-500/70 pl-7">Generated by mistake? <button onClick={handleUndo} className="underline hover:text-emerald-300 transition-colors cursor-pointer">Click Undo</button></p>
                        )}
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 mb-6 relative">
                {loading ? (
                    <>
                        <SkeletonStatCard delay={0} />
                        <SkeletonStatCard delay={80} />
                        <SkeletonStatCard delay={160} />
                        <SkeletonStatCard delay={240} />
                    </>
                ) : stats ? (
                    <>
                        <StatCard label="Students" value={stats.total_students} icon="🎓" color="indigo" delay={0} />
                        <StatCard label="Teachers" value={stats.total_teachers} icon="👨‍🏫" color="blue" delay={80} />
                        <StatCard label="Batches" value={stats.total_batches} icon="📋" color="violet" delay={160} />
                        <StatCard label="Pending" value={stats.total_pending} icon="⏳" color="amber" delay={240} />
                    </>
                ) : null}
            </div>



            {/* Generate Monthly Payments */}
            <div className="glass-card rounded-xl p-4 sm:p-6 animate-fade-in-up" style={{ animationDelay: "600ms" }}>
                <h2 className="text-base sm:text-lg font-semibold text-white mb-1">⚡ Generate Monthly Payments</h2>
                <p className="text-[#8a8f98] text-xs sm:text-sm mb-4">Create &ldquo;Unpaid&rdquo; records for a batch or all students.</p>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                    <div>
                        <label className="block text-[#8a8f98] text-[10px] sm:text-xs mb-1">Month</label>
                        <select
                            value={genMonth}
                            onChange={(e) => setGenMonth(parseInt(e.target.value))}
                            className="w-full px-2 sm:px-3 py-2.5 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50"
                        >
                            {MONTHS.map((m, i) => (
                                <option key={i} value={i + 1}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[#8a8f98] text-[10px] sm:text-xs mb-1">Year</label>
                        <select
                            value={genYear}
                            onChange={(e) => setGenYear(parseInt(e.target.value))}
                            className="w-full px-2 sm:px-3 py-2.5 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50"
                        >
                            {getYearOptions().map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[#8a8f98] text-[10px] sm:text-xs mb-1">Default Amount (₹)</label>
                        <input
                            type="number"
                            value={genAmount}
                            onChange={(e) => setGenAmount(parseInt(e.target.value))}
                            className="w-full px-2 sm:px-3 py-2.5 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50"
                        />
                        <p className="text-[#5a5f68] text-[9px] sm:text-[10px] mt-0.5">Fallback if no custom/batch fee</p>
                    </div>
                    <div>
                        <label className="block text-[#8a8f98] text-[10px] sm:text-xs mb-1">Batch</label>
                        <select
                            value={genBatch}
                            onChange={(e) => setGenBatch(e.target.value)}
                            className="w-full px-2 sm:px-3 py-2.5 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50"
                        >
                            <option value="">All Batches</option>
                            {batches.map((b) => (
                                <option key={b.id} value={b.id}>{b.batch_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-span-2 lg:col-span-1">
                        <label className="block text-[#8a8f98] text-[10px] sm:text-xs mb-1 opacity-0 pointer-events-none">&nbsp;</label>
                        <div className="flex gap-2">
                            <button
                                onClick={handleGenerate}
                                disabled={generating || undoing}
                                className={`flex-1 py-2.5 rounded-lg text-white text-sm font-bold shadow-lg shadow-[#3861fb]/25 transition-all duration-300 active:scale-95 cursor-pointer border border-[#3861fb]/30 
                                    ${generating
                                        ? 'bg-[#1a1f2e] opacity-70 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-[#3861fb] via-[#2b4fcf] to-[#3861fb] animate-gradient hover:shadow-[#3861fb]/40'}`}
                            >
                                {generating ? "Generating..." : "Generate"}
                            </button>
                            <button
                                onClick={handleUndo}
                                disabled={undoing || generating}
                                className={`px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer border
                                    ${undoing
                                        ? 'bg-[#1a1f2e] border-[#1a1f2e]/50 text-[#5a5f68] opacity-70 cursor-not-allowed'
                                        : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50'}`}
                                title="Undo last generation (removes only Unpaid records)"
                            >
                                {undoing ? "..." : "↩ Undo"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout>
                <AdminDashboardContent />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
