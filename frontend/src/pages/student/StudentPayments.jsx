import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import ProtectedRoute from "@/components/ProtectedRoute";
import StudentLayout from "@/components/StudentLayout";
import { api, apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { generateReceiptPDF } from "@/lib/pdfUtils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isMobile() {
    if (typeof navigator === "undefined") return false;
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
        || ("ontouchstart" in window && window.innerWidth < 768);
}

// ── Status Badge ──
function StatusBadge({ status }) {
    const config = {
        Paid: {
            bg: "bg-[#006a60]/40",
            text: "text-[#33e9d5]",
            border: "border-[#4af8e3]/20",
            label: "Paid",
        },
        Unpaid: {
            bg: "bg-[#ff6e84]/15",
            text: "text-[#ff6e84]",
            border: "border-[#ff6e84]/20",
            label: "Unpaid",
        },
        Pending_Verification: {
            bg: "bg-[#3b82f6]/15",
            text: "text-[#3b82f6]",
            border: "border-[#3b82f6]/20",
            label: "Pending",
        },
    };
    const c = config[status] || config.Unpaid;
    return (
        <div className={`${c.bg} ${c.text} ${c.border} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border`}>
            {c.label}
        </div>
    );
}

// ── Pay Now Modal (reused from Dashboard) ──
function PayNowModal({ payment, upiData, onClose, onProceed }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [upiNotice, setUpiNotice] = useState(false);

    const handleFileChange = (e) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
    };

    const handleRemoveFile = () => {
        if (preview) URL.revokeObjectURL(preview);
        setFile(null);
        setPreview(null);
    };

    const handleSubmit = async () => {
        if (!file) return;
        setSubmitting(true);
        try { await onProceed(payment.id, file); }
        finally { setSubmitting(false); }
    };

    useEffect(() => {
        return () => { if (preview) URL.revokeObjectURL(preview); };
    }, [preview]);

    if (!payment) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="relative bg-[#0c0e17] border border-white/10 rounded-[32px] w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-in-scale"
                onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 text-[#aaaab7] flex items-center justify-center hover:bg-white/10 hover:text-white cursor-pointer z-10 transition-colors">
                    <span className="material-symbols-outlined text-lg">close</span>
                </button>

                <div className="p-6 pb-0 text-center">
                    <h3 className="text-[#f0f0fd] font-extrabold text-xl" style={{ fontFamily: "'Manrope', sans-serif" }}>Pay Now</h3>
                    <p className="text-[#aaaab7] text-sm mt-1">{MONTHS[payment.month - 1]} {payment.year}</p>
                    <div className="mt-3 inline-flex items-baseline gap-1">
                        <span className="text-[#aaaab7] text-sm">₹</span>
                        <span className="text-[#f0f0fd] font-bold text-3xl" style={{ fontFamily: "'Manrope', sans-serif" }}>{payment.amount}</span>
                    </div>
                </div>

                <div className="mx-6 my-4 border-t border-white/5" />

                <div className="px-6">
                    <p className="text-[#f0f0fd] text-sm font-semibold mb-3 flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#3b82f6]/20 text-[#3b82f6] text-xs font-bold">1</span>
                        Make Payment
                    </p>
                    {upiData && (
                        <div className="text-center mb-4">
                            <div className="inline-block p-3 bg-white rounded-xl mb-3">
                                <QRCodeSVG value={upiData.upi_link} size={180} level="H" includeMargin={false} />
                            </div>
                            <p className="text-[#737580] text-xs">Scan with any UPI app</p>
                        </div>
                    )}
                    {isMobile() && upiData && (
                        <button onClick={() => setUpiNotice(true)}
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] text-sm font-medium hover:bg-[#3b82f6]/20 transition-all mb-2 cursor-pointer">
                            <span className="material-symbols-outlined text-lg">credit_card</span> Open UPI App
                        </button>
                    )}
                    {upiNotice && (
                        <div className="mb-4 p-3 rounded-2xl bg-[#ff6e84]/10 border border-[#ff6e84]/20 text-[#ff9dac] text-xs leading-relaxed">
                            <span className="font-semibold">⚠️ This service is currently unavailable!</span><br />
                            Pay either via QR code or pay <span className="font-semibold text-[#ff6e84]">Mr. Soumya Sengupta</span> directly through your UPI app, then upload a screenshot here for verification.
                            <button onClick={() => setUpiNotice(false)} className="ml-2 text-[#ff6e84] hover:text-[#ff9dac] cursor-pointer">✕</button>
                        </div>
                    )}
                    {!upiData && (
                        <div className="flex items-center justify-center py-6">
                            <div className="w-6 h-6 border-3 border-[#3b82f6]/30 border-t-[#3b82f6] rounded-full animate-spin" />
                            <span className="text-[#aaaab7] text-sm ml-3">Loading payment info...</span>
                        </div>
                    )}
                </div>

                <div className="mx-6 my-4 border-t border-white/5" />

                <div className="px-6">
                    <p className="text-[#f0f0fd] text-sm font-semibold mb-3 flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#3b82f6]/20 text-[#3b82f6] text-xs font-bold">2</span>
                        Upload Payment Screenshot
                    </p>
                    {!preview ? (
                        <label className="flex flex-col items-center justify-center w-full py-8 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] hover:border-[#3b82f6]/30 hover:bg-white/[0.04] transition-all cursor-pointer">
                            <span className="material-symbols-outlined text-4xl text-[#aaaab7] mb-2">cloud_upload</span>
                            <span className="text-[#aaaab7] text-sm">Tap to upload screenshot</span>
                            <span className="text-[#737580] text-xs mt-1">PNG, JPG up to 5MB</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </label>
                    ) : (
                        <div className="relative">
                            <img src={preview} alt="Preview" className="w-full rounded-2xl border border-white/10 max-h-48 object-contain bg-white/[0.02]" />
                            <button onClick={handleRemoveFile}
                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#ff6e84]/80 text-white flex items-center justify-center hover:bg-[#ff6e84] cursor-pointer">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                            <p className="text-[#4af8e3] text-xs mt-2 text-center flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                Screenshot selected
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-6 pt-5">
                    <button onClick={handleSubmit} disabled={!file || submitting}
                        className="w-full py-3 rounded-full bg-[#3b82f6] text-white font-bold text-sm hover:bg-[#2563eb] transition-all shadow-[0_4px_20px_rgba(59,130,246,0.4)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95">
                        {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...
                            </span>
                        ) : "Proceed — Send for Verification"}
                    </button>
                    {!file && <p className="text-[#737580] text-xs text-center mt-2">Upload a screenshot to enable proceed</p>}
                </div>
            </div>
        </div>
    );
}

// ── Main Payments Content ──
function StudentPaymentsContent() {
    const { user } = useAuth();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [previewImg, setPreviewImg] = useState(null);

    // Pay Now modal
    const [payModalPayment, setPayModalPayment] = useState(null);
    const [payModalUpi, setPayModalUpi] = useState(null);

    const fetchPayments = useCallback(async () => {
        setError("");
        try {
            const data = await api.get("/api/student/payments");
            setPayments(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPayments();
        const handleOnline = () => { setError(""); fetchPayments(); };
        window.addEventListener("online", handleOnline);
        return () => window.removeEventListener("online", handleOnline);
    }, [fetchPayments]);

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(collection(db, "payments"), where("student_id", "==", user.uid));
        const unsubscribe = onSnapshot(q, () => fetchPayments());
        return () => unsubscribe();
    }, [user?.uid, fetchPayments]);

    const openPayModal = async (payment) => {
        setPayModalPayment(payment);
        setPayModalUpi(null);
        try {
            const data = await api.get(`/api/student/upi-link?amount=${payment.amount}&month=${payment.month}&year=${payment.year}`);
            setPayModalUpi(data);
        } catch (err) { setError(err.message); }
    };

    const closePayModal = () => { setPayModalPayment(null); setPayModalUpi(null); };

    const handleProceed = async (paymentId, file) => {
        try {
            const formData = new FormData();
            formData.append("file", file);
            await apiFetch(`/api/student/payments/${paymentId}/upload`, { method: "POST", body: formData });
            setSuccess("Verification request sent successfully! 🎉");
            closePayModal();
            fetchPayments();
        } catch (err) { setError(err.message); }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-[#3b82f6]/30 border-t-[#3b82f6] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="mb-8 animate-fade-in-scale">
                <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-[#f0f0fd]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    History
                </h1>
                <p className="text-[#aaaab7] text-sm tracking-wide">Track your digital liquidity flow</p>
            </div>

            {/* Alerts */}
            {error && (
                <div className="p-3 rounded-2xl bg-[#ff6e84]/10 border border-[#ff6e84]/20 text-[#ff9dac] text-sm flex items-center justify-between animate-fade-in-scale">
                    <span>{error}</span>
                    <button onClick={() => setError("")} className="ml-2 cursor-pointer text-[#ff6e84] hover:text-white">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            )}
            {success && (
                <div className="p-3 rounded-2xl bg-[#4af8e3]/10 border border-[#4af8e3]/20 text-[#4af8e3] text-sm flex items-center justify-between animate-fade-in-scale">
                    <span>{success}</span>
                    <button onClick={() => setSuccess("")} className="ml-2 cursor-pointer text-[#4af8e3] hover:text-white">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            )}

            {/* Payment List */}
            <div className="space-y-4">
                {payments.filter(p => p.status === "Paid").map((p, idx) => (
                    <div key={p.id} className="relative group animate-fade-in-scale" style={{ animationDelay: `${idx * 80}ms` }}>
                        {/* Subtle glow behind card */}
                        <div className="absolute inset-0 bg-white/[0.03] blur-sm rounded-3xl -z-10 group-hover:bg-white/[0.06] transition-all" />

                        <div className="bg-[#1c1f2b]/60 backdrop-blur-2xl p-6 rounded-3xl border border-[#464752]/10 shadow-2xl flex flex-col gap-4">
                            {/* Top row: Billing info + Amount + Status */}
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <span className="text-[#aaaab7] text-xs uppercase tracking-widest">Billing Cycle</span>
                                    <h3 className="text-xl font-bold text-[#f0f0fd]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                        {MONTHS[p.month - 1]} {p.year}
                                    </h3>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-2xl font-extrabold text-[#f0f0fd]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                        ₹{p.amount}
                                    </span>
                                    <StatusBadge status={p.status} />
                                </div>
                            </div>

                            {/* Action button */}
                            {p.status === "Paid" && (
                                <button
                                    onClick={() => generateReceiptPDF(p, user)}
                                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-full bg-white/5 border border-[#464752]/20 hover:bg-white/10 transition-colors active:scale-[0.98] cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[20px]">description</span>
                                    <span className="text-sm font-semibold">Download Receipt</span>
                                </button>
                            )}

                            {p.status === "Unpaid" && (
                                <button
                                    onClick={() => openPayModal(p)}
                                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-full bg-[#3b82f6] text-white font-bold text-sm shadow-[0_4px_20px_rgba(59,130,246,0.4)] active:scale-95 transition-transform cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[20px]">credit_card</span>
                                    Pay Now — ₹{p.amount}
                                </button>
                            )}

                            {p.status === "Pending_Verification" && (
                                <div className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20">
                                    <span className="material-symbols-outlined text-[20px] text-[#3b82f6]" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_top</span>
                                    <span className="text-sm font-semibold text-[#3b82f6]">Verification Pending</span>
                                    {p.screenshot_url && (
                                        <button
                                            onClick={() => setPreviewImg(p.screenshot_url)}
                                            className="ml-auto text-[#aaaab7] hover:text-white transition-colors cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-lg">visibility</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {payments.filter(p => p.status === "Paid").length === 0 && (
                    <div className="glass-card-student rounded-[32px] p-8 text-center text-[#aaaab7] animate-fade-in-scale">
                        <span className="material-symbols-outlined text-5xl text-[#737580] mb-3 block">receipt_long</span>
                        <p className="text-lg font-medium">No payment records yet</p>
                        <p className="text-sm text-[#737580] mt-1">Your payment history will appear here</p>
                    </div>
                )}
            </div>

            {/* Decorative dots at bottom */}
            {payments.length > 0 && (
                <div className="py-6 flex justify-center opacity-30">
                    <div className="w-1 h-1 rounded-full bg-[#737580] mx-1" />
                    <div className="w-1 h-1 rounded-full bg-[#737580] mx-1" />
                    <div className="w-1 h-1 rounded-full bg-[#737580] mx-1" />
                </div>
            )}

            {/* Image preview modal */}
            {previewImg && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPreviewImg(null)}>
                    <div className="relative max-w-2xl max-h-[80vh] mx-4" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setPreviewImg(null)}
                            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center hover:bg-white/20 cursor-pointer z-10">
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                        <img src={previewImg} alt="Receipt" className="rounded-2xl max-h-[80vh] object-contain border border-white/10" />
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

export default function StudentPayments() {
    return (
        <ProtectedRoute allowedRoles={["student"]}>
            <StudentLayout>
                <StudentPaymentsContent />
            </StudentLayout>
        </ProtectedRoute>
    );
}
