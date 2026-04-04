import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { api, apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { generateReceiptPDF } from "@/lib/pdfUtils";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isMobile() {
    if (typeof navigator === "undefined") return false;
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
        || ("ontouchstart" in window && window.innerWidth < 768);
}

function StatusBadge({ status }) {
    const styles = {
        Paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        Pending_Verification: "bg-amber-500/20 text-amber-300 border-amber-500/30 pulse-pending",
        Unpaid: "bg-red-500/20 text-red-300 border-red-500/30",
    };
    return (
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles.Unpaid}`}>
            {status === "Pending_Verification" ? "Pending" : status}
        </span>
    );
}

// ── Unified Pay Now Modal ──
function PayNowModal({ payment, upiData, onClose, onProceed }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [upiNotice, setUpiNotice] = useState(false);

    const handleFileChange = (e) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        setFile(selected);
        // Generate local preview URL
        const url = URL.createObjectURL(selected);
        setPreview(url);
    };

    const handleRemoveFile = () => {
        if (preview) URL.revokeObjectURL(preview);
        setFile(null);
        setPreview(null);
    };

    const handleSubmit = async () => {
        if (!file) return;
        setSubmitting(true);
        try {
            await onProceed(payment.id, file);
        } finally {
            setSubmitting(false);
        }
    };

    // Cleanup preview URL on unmount
    useEffect(() => {
        return () => { if (preview) URL.revokeObjectURL(preview); };
    }, [preview]);

    if (!payment) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="relative bg-[#0f1117] border border-[#1a1f2e]/50 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button onClick={onClose}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#1a1f2e] border border-[#1a1f2e]/60 text-white flex items-center justify-center hover:bg-[#252a3a] cursor-pointer z-10">
                    ✕
                </button>

                {/* Header */}
                <div className="p-6 pb-0 text-center">
                    <h3 className="text-white font-bold text-xl">Pay Now</h3>
                    <p className="text-[#8a8f98] text-sm mt-1">
                        {MONTHS[payment.month - 1]} {payment.year}
                    </p>
                    <div className="mt-3 inline-flex items-baseline gap-1">
                        <span className="text-[#8a8f98] text-sm">₹</span>
                        <span className="text-white font-bold text-3xl">{payment.amount}</span>
                    </div>
                </div>

                {/* Divider */}
                <div className="mx-6 my-4 border-t border-[#1a1f2e]/50" />

                {/* Step 1: Make Payment */}
                <div className="px-6">
                    <p className="text-slate-300 text-sm font-semibold mb-3">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#3861fb]/30 text-[#7b9cff] text-xs font-bold mr-2">1</span>
                        Make Payment
                    </p>

                    {/* QR Code section */}
                    {upiData && (
                        <div className="text-center mb-4">
                            <div className="inline-block p-3 bg-white rounded-xl mb-3">
                                <QRCodeSVG value={upiData.upi_link} size={180} level="H" includeMargin={false} />
                            </div>
                            <p className="text-[#5a5f68] text-xs">Scan with any UPI app</p>
                        </div>
                    )}

                    {/* UPI App button — mobile only */}
                    {isMobile() && upiData && (
                        <button
                            onClick={() => setUpiNotice(true)}
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#3861fb]/20 border border-[#3861fb]/30 text-[#7b9cff] text-sm font-medium hover:bg-[#3861fb]/30 transition-all mb-2 cursor-pointer"
                        >
                            💳 Open UPI App
                        </button>
                    )}

                    {/* UPI unavailable notice */}
                    {upiNotice && (
                        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed">
                            <span className="font-semibold">⚠️ This service is currently unavailable!</span><br />
                            Pay either via QR code or pay <span className="font-semibold text-amber-200">Mr. Soumya Sengupta</span> directly through your UPI app, then upload a screenshot here for verification.
                            <button onClick={() => setUpiNotice(false)} className="ml-2 text-amber-400 hover:text-amber-200 cursor-pointer">✕</button>
                        </div>
                    )}

                    {!upiData && (
                        <div className="flex items-center justify-center py-6">
                            <div className="w-6 h-6 border-3 border-[#3861fb]/30 border-t-[#3861fb] rounded-full animate-spin" />
                            <span className="text-[#8a8f98] text-sm ml-3">Loading payment info...</span>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="mx-6 my-4 border-t border-[#1a1f2e]/50" />

                {/* Step 2: Upload Screenshot */}
                <div className="px-6">
                    <p className="text-slate-300 text-sm font-semibold mb-3">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#3861fb]/30 text-[#7b9cff] text-xs font-bold mr-2">2</span>
                        Upload Payment Screenshot
                    </p>

                    {!preview ? (
                        <label className="flex flex-col items-center justify-center w-full py-8 rounded-xl border-2 border-dashed border-[#1a1f2e]/50 bg-[#0f1320]/30 hover:border-[#3861fb]/40 hover:bg-[#0f1320]/50 transition-all cursor-pointer">
                            <span className="text-3xl mb-2">📤</span>
                            <span className="text-[#8a8f98] text-sm">Tap to upload screenshot</span>
                            <span className="text-[#5a5f68] text-xs mt-1">PNG, JPG up to 5MB</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </label>
                    ) : (
                        <div className="relative">
                            <img
                                src={preview}
                                alt="Payment screenshot preview"
                                className="w-full rounded-xl border border-[#1a1f2e]/50 max-h-48 object-contain bg-[#0f1320]/50"
                            />
                            <button
                                onClick={handleRemoveFile}
                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 text-white flex items-center justify-center text-xs hover:bg-red-500 cursor-pointer"
                            >
                                ✕
                            </button>
                            <p className="text-emerald-400 text-xs mt-2 text-center">✓ Screenshot selected — review it above</p>
                        </div>
                    )}
                </div>

                {/* Proceed button */}
                <div className="p-6 pt-5">
                    <button
                        onClick={handleSubmit}
                        disabled={!file || submitting}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#3861fb] to-[#2b4fcf] text-white font-semibold text-sm
                            hover:from-[#4a73ff] hover:to-[#3861fb] transition-all shadow-lg shadow-[#3861fb]/20
                            disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Sending...
                            </span>
                        ) : (
                            "Proceed — Send for Verification"
                        )}
                    </button>
                    {!file && (
                        <p className="text-[#5a5f68] text-xs text-center mt-2">Upload a screenshot to enable proceed</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main Dashboard ──
function StudentDashboardContent() {
    const { user } = useAuth();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [previewImg, setPreviewImg] = useState(null);

    // Pay Now modal state
    const [payModalPayment, setPayModalPayment] = useState(null);
    const [payModalUpi, setPayModalUpi] = useState(null);

    const fetchPayments = useCallback(async () => {
        setError(""); // Clear persistent error before trying again
        try {
            const data = await api.get("/api/student/payments");
            setPayments(data);
            setError(""); // Clear error on successful fetch
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPayments();

        // Automatically clear connection error and refetch when internet is restored
        const handleOnline = () => {
            setError("");
            fetchPayments();
        };
        window.addEventListener("online", handleOnline);

        return () => window.removeEventListener("online", handleOnline);
    }, [fetchPayments]);

    // Real-time: auto-refresh when payment status changes in Firestore
    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, "payments"),
            where("student_id", "==", user.uid)
        );
        const unsubscribe = onSnapshot(q, () => {
            fetchPayments();
        });
        return () => unsubscribe();
    }, [user?.uid, fetchPayments]);

    // Open Pay Now modal → fetch UPI link
    const openPayModal = async (payment) => {
        setPayModalPayment(payment);
        setPayModalUpi(null);
        try {
            const data = await api.get(`/api/student/upi-link?amount=${payment.amount}&month=${payment.month}&year=${payment.year}`);
            setPayModalUpi(data);
        } catch (err) {
            setError(err.message);
        }
    };

    const closePayModal = () => {
        setPayModalPayment(null);
        setPayModalUpi(null);
    };

    // Proceed: upload screenshot → sends for verification
    const handleProceed = async (paymentId, file) => {
        try {
            const formData = new FormData();
            formData.append("file", file);
            await apiFetch(`/api/student/payments/${paymentId}/upload`, {
                method: "POST",
                body: formData,
            });
            setSuccess("Verification request sent successfully! 🎉");
            closePayModal();
            fetchPayments();
        } catch (err) {
            setError(err.message);
        }
    };

    const totalDue = payments.filter((p) => p.status === "Unpaid").reduce((s, p) => s + (p.amount || 0), 0);
    const totalPaid = payments.filter((p) => p.status === "Paid").reduce((s, p) => s + (p.amount || 0), 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-[#3861fb]/30 border-t-[#3861fb] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-xl md:text-3xl font-bold text-white">Welcome, {user?.name} 👋</h1>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-8">
                <div className="rounded-xl p-3 sm:p-5 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 glass-card animate-fade-in-up">
                    <div className="flex items-center justify-between">
                        <div className="min-w-0">
                            <p className="text-[#8a8f98] text-[10px] sm:text-sm truncate font-medium">Total Paid</p>
                            <p className="text-lg sm:text-3xl font-bold text-emerald-300 mt-0.5 sm:mt-1 tracking-tight">₹{totalPaid}</p>
                        </div>
                        <span className="text-xl sm:text-3xl opacity-80 shrink-0 ml-2 drop-shadow-md">✅</span>
                    </div>
                </div>
                <div className="rounded-xl p-3 sm:p-5 bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 glass-card animate-fade-in-up" style={{ animationDelay: "80ms" }}>
                    <div className="flex items-center justify-between">
                        <div className="min-w-0">
                            <p className="text-[#8a8f98] text-[10px] sm:text-sm truncate font-medium">Due Amount</p>
                            <p className="text-lg sm:text-3xl font-bold text-red-300 mt-0.5 sm:mt-1 tracking-tight">₹{totalDue}</p>
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

            {/* Payment list */}
            <div className="space-y-4">
                {payments.map((p, idx) => (
                    <div key={p.id} className="glass-card rounded-xl p-5 animate-fade-in-up" style={{ animationDelay: `${300 + idx * 60}ms` }}>
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="text-white font-medium">{MONTHS[p.month - 1]} {p.year}</span>
                                    <StatusBadge status={p.status} />
                                </div>
                                <p className="text-[#8a8f98] text-sm">Amount: <span className="text-white font-medium">₹{p.amount}</span></p>
                            </div>

                            {/* Show receipt thumbnail for Paid / Pending */}
                            {p.screenshot_url && p.status !== "Unpaid" && (
                                <button onClick={() => setPreviewImg(p.screenshot_url)}
                                    className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-[#1a1f2e]/50 hover:border-[#3861fb]/50 transition-all cursor-pointer">
                                    <img src={p.screenshot_url} alt="Receipt" className="w-full h-full object-cover" />
                                </button>
                            )}

                            <div className="flex gap-2 shrink-0">
                                {p.status === "Paid" && (
                                    <button
                                        onClick={() => generateReceiptPDF(p, user)}
                                        className="px-4 py-2.5 rounded-lg bg-[#1a1f2e] border border-[#1a1f2e]/60 text-[#c0c4cc] text-sm font-medium
                                            hover:bg-[#252a3a] hover:text-white transition-all cursor-pointer flex items-center gap-2"
                                    >
                                        🧾 Download Receipt
                                    </button>
                                )}
                                {p.status === "Unpaid" && (
                                    <button
                                        onClick={() => openPayModal(p)}
                                        className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#3861fb] to-[#2b4fcf] text-white text-sm font-semibold
                                            hover:from-[#4a73ff] hover:to-[#3861fb] transition-all shadow-lg shadow-[#3861fb]/20 cursor-pointer"
                                    >
                                        💳 Pay Now
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {payments.length === 0 && (
                    <div className="glass-card rounded-xl p-8 text-center text-[#8a8f98]">No payment records yet.</div>
                )}
            </div>

            {/* Image preview modal */}
            {previewImg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPreviewImg(null)}>
                    <div className="relative max-w-2xl max-h-[80vh] mx-4" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setPreviewImg(null)}
                            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#1a1f2e] border border-[#1a1f2e]/60 text-white flex items-center justify-center hover:bg-[#252a3a] cursor-pointer z-10">✕</button>
                        <img src={previewImg} alt="Receipt" className="rounded-xl max-h-[80vh] object-contain border border-[#1a1f2e]/50" />
                    </div>
                </div>
            )}

            {/* Pay Now modal */}
            {payModalPayment && (
                <PayNowModal
                    payment={payModalPayment}
                    upiData={payModalUpi}
                    onClose={closePayModal}
                    onProceed={handleProceed}
                />
            )}
        </div>
    );
}

export default function StudentDashboard() {
    return (
        <ProtectedRoute allowedRoles={["student"]}>
            <DashboardLayout>
                <StudentDashboardContent />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
