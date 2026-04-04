import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function ApprovalContent() {
    const [pending, setPending] = useState([]);
    const [batches, setBatches] = useState([]);
    const [filterBatch, setFilterBatch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [actionLoading, setActionLoading] = useState(null);
    const [previewImg, setPreviewImg] = useState(null);

    const fetchPending = useCallback(async () => {
        try {
            const [pendingData, batchData] = await Promise.all([
                api.get("/api/admin/pending"),
                api.get("/api/admin/batches"),
            ]);
            setPending(pendingData);
            setBatches(batchData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => { fetchPending(); }, [fetchPending]);

    // Real-time listener
    useEffect(() => {
        const q = query(
            collection(db, "payments"),
            where("status", "==", "Pending_Verification")
        );
        const unsubscribe = onSnapshot(q, () => {
            fetchPending();
        });
        return () => unsubscribe();
    }, [fetchPending]);

    const filtered = filterBatch
        ? pending.filter((p) => p.batch_id === filterBatch)
        : pending;

    const handleApprove = async (paymentId) => {
        setActionLoading(paymentId);
        setError("");
        try {
            await api.put(`/api/admin/approve/${paymentId}`);
            setSuccess("Payment approved!");
            fetchPending();
        } catch (err) { setError(err.message); }
        finally { setActionLoading(null); }
    };

    const handleReject = async (paymentId) => {
        setActionLoading(paymentId);
        setError("");
        try {
            await api.put(`/api/admin/reject/${paymentId}`);
            setSuccess("Payment rejected.");
            fetchPending();
        } catch (err) { setError(err.message); }
        finally { setActionLoading(null); }
    };

    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-[#3861fb]/30 border-t-[#3861fb] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Approval Queue ✅</h1>
                    <p className="text-[#8a8f98] text-sm mt-1">
                        {filtered.length} of {pending.length} payment(s) awaiting verification
                    </p>
                </div>
                <select
                    value={filterBatch}
                    onChange={(e) => setFilterBatch(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2.5 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50"
                >
                    <option value="">All Batches</option>
                    {batches.map((b) => (
                        <option key={b.id} value={b.id}>{b.batch_name}</option>
                    ))}
                </select>
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

            {filtered.length === 0 ? (
                <div className="glass-card rounded-xl p-10 sm:p-12 text-center animate-fade-in-up">
                    <span className="text-5xl block mb-4">🎉</span>
                    <p className="text-white text-lg font-semibold">All clear!</p>
                    <p className="text-[#8a8f98] text-sm mt-1">No pending approvals at the moment.</p>
                </div>
            ) : (
                <div className="space-y-3 sm:space-y-4">
                    {filtered.map((item, idx) => (
                        <div key={item.id} className="glass-card rounded-xl p-4 sm:p-5 animate-fade-in-up" style={{ animationDelay: `${idx * 80}ms` }}>
                            {/* Top: Name + Badge */}
                            <div className="flex items-center gap-2 mb-3">
                                <h3 className="text-white font-semibold text-sm sm:text-base truncate flex-1">{item.student_name || "Unknown Student"}</h3>
                                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold border
                                    ${item.mode === "online" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-orange-500/20 text-orange-300 border-orange-500/30"}`}>
                                    {item.mode === "online" ? "📱 Online" : "💵 Offline"}
                                </span>
                            </div>

                            {/* Details row */}
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-[#8a8f98] mb-4">
                                <span>📅 {MONTHS[item.month - 1]} {item.year}</span>
                                <span>💰 ₹{item.amount}</span>
                                {item.batch_name && <span>📋 {item.batch_name}</span>}
                                {item.teacher_name && <span>👨‍🏫 {item.teacher_name}</span>}
                            </div>

                            {/* Screenshot + Actions */}
                            <div className="flex items-center justify-between gap-3">
                                {item.screenshot_url ? (
                                    <button onClick={() => setPreviewImg(item.screenshot_url)}
                                        className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-[#1a1f2e]/50 active:border-[#3861fb]/50 transition-all cursor-pointer">
                                        <img src={item.screenshot_url} alt="Screenshot" className="w-full h-full object-cover" />
                                    </button>
                                ) : <div />}

                                <div className="flex gap-2">
                                    <button onClick={() => handleApprove(item.id)} disabled={actionLoading === item.id}
                                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-medium
                                            active:bg-emerald-500/30 disabled:opacity-50 cursor-pointer">
                                        ✅ Approve
                                    </button>
                                    <button onClick={() => handleReject(item.id)} disabled={actionLoading === item.id}
                                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-xs sm:text-sm font-medium
                                            active:bg-red-500/30 disabled:opacity-50 cursor-pointer">
                                        ❌ Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {previewImg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPreviewImg(null)}>
                    <div className="relative max-w-2xl w-full max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setPreviewImg(null)}
                            className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-[#1a1f2e] border border-[#1a1f2e]/60 text-white flex items-center justify-center active:bg-[#252a3a] cursor-pointer z-10">✕</button>
                        <img src={previewImg} alt="Payment Screenshot" className="rounded-xl max-h-[80vh] w-full object-contain border border-[#1a1f2e]/50" />
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminApprovals() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout>
                <ApprovalContent />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
