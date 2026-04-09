import { useState, useEffect, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import ProtectedRoute from "@/components/ProtectedRoute";
import StudentLayout from "@/components/StudentLayout";
import AnimatedGreeting from "@/components/AnimatedGreeting";
import PaymentProgressTracker from "@/components/PaymentProgressTracker";
import BadgeCelebrationOverlay from "@/components/BadgeCelebrationOverlay";
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

// ── Pay Now Modal (Nebula Theme) ──
function PayNowModal({ payment, upiData, onClose, onProceed }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [upiNotice, setUpiNotice] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    const handleFileChange = (e) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        setFile(selected);
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

    useEffect(() => {
        return () => { if (preview) URL.revokeObjectURL(preview); };
    }, [preview]);

    if (!payment) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-[#0c0e17] flex flex-col sm:bg-black/80 sm:backdrop-blur-sm sm:items-center sm:justify-center" onClick={onClose} style={{ transform: "translateZ(0)", isolation: "isolate" }}>
            <div
                className="relative bg-[#0c0e17] w-full h-full sm:h-auto sm:max-h-[85dvh] sm:max-w-md sm:rounded-[28px] sm:border sm:border-white/10 sm:shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col animate-fade-in-scale"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Header Bar ── */}
                <div className="flex items-center gap-3 px-4 h-16 border-b border-white/5 shrink-0 bg-gradient-to-r from-[#0c0e17] via-[#111427] to-[#0c0e17]">
                    <button onClick={onClose}
                        className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-[#aaaab7] active:scale-90 transition-all cursor-pointer">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="flex-1 flex items-center justify-between">
                        <div>
                            <h3 className="text-[#f0f0fd] font-bold text-lg leading-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>Secure Checkout</h3>
                            <p className="text-[#4af8e3] text-[11px] font-medium tracking-wide flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px] material-symbols-filled">verified</span> 100% SECURE
                            </p>
                        </div>
                        <div className="text-right">
                            <h3 className="text-[#f0f0fd] font-extrabold text-xl leading-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>₹{payment.amount}</h3>
                            <p className="text-[#aaaab7] text-[11px] uppercase tracking-wider">{MONTHS[payment.month - 1]} {payment.year}</p>
                        </div>
                    </div>
                </div>

                {/* ── Scrollable Content ── */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4">

                {/* Divider */}
                <div className="mb-4 border-t border-white/5" />

                {/* Step 1: Make Payment */}
                <div>
                    <p className="text-[#f0f0fd] text-sm font-semibold mb-3 flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#3b82f6]/20 text-[#3b82f6] text-xs font-bold">1</span>
                        Make Payment
                    </p>

                    {upiData && (
                        <div className="text-center mb-5 mt-2">
                            <div className="relative inline-block mx-auto">
                                {/* Glowing backdrop */}
                                <div className="absolute -inset-1 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] rounded-[1.25rem] blur opacity-40"></div>
                                {/* QR Container */}
                                <div className="relative p-3.5 bg-white rounded-2xl shadow-xl flex flex-col items-center border border-white/20">
                                    <QRCodeSVG value={upiData.upi_link} size={160} level="H" includeMargin={false} />
                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 w-full justify-center">
                                        <span className="text-[11px] font-extrabold text-gray-400 tracking-wider">BHIM UPI</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[#737580] text-[13px] mt-4 font-medium">Scan with any UPI app to pay</p>
                        </div>
                    )}

                    {isMobile() && upiData && (
                        <button
                            onClick={() => setUpiNotice(true)}
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#3b82f6] text-sm font-medium hover:bg-[#3b82f6]/20 transition-all mb-2 cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-lg">credit_card</span>
                            Open UPI App
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

                {/* Divider */}
                <div className="my-4 border-t border-white/5" />

                {/* Step 2: Upload Screenshot */}
                <div>
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
                            <div className="relative group p-1 bg-white/[0.02] rounded-2xl border border-white/10 hover:border-[#3b82f6]/30 transition-all cursor-zoom-in" onClick={() => setShowPreviewModal(true)}>
                                <img
                                    src={preview}
                                    alt="Payment screenshot preview"
                                    className="w-full h-auto max-h-48 object-cover rounded-xl"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl pointer-events-none">
                                    <span className="material-symbols-outlined text-white text-3xl">zoom_in</span>
                                </div>
                            </div>
                            <button
                                onClick={handleRemoveFile}
                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#ff6e84]/80 text-white flex items-center justify-center text-xs hover:bg-[#ff6e84] cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                            <p className="text-[#4af8e3] text-xs mt-2 text-center flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-sm material-symbols-filled">check_circle</span>
                                Screenshot selected — review it above
                            </p>
                        </div>
                    )}
                </div>
                </div>

                {/* ── Sticky Proceed Button ── */}
                <div className="p-5 pt-3 border-t border-white/5 bg-[#0c0e17] shrink-0">
                    <button
                        onClick={handleSubmit}
                        disabled={!file || submitting}
                        className="w-full py-3 rounded-full bg-[#3b82f6] text-white font-bold text-sm
                            hover:bg-[#2563eb] transition-all shadow-[0_4px_20px_rgba(59,130,246,0.4)]
                            disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
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
                        <p className="text-[#737580] text-xs text-center mt-1.5">Upload a screenshot to enable proceed</p>
                    )}
                </div>

                {/* ── Fullscreen Image Preview Modal ── */}
                {showPreviewModal && preview && (
                    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col animate-fade-in" onClick={() => setShowPreviewModal(false)} style={{ transform: "translateZ(0)", isolation: "isolate" }}>
                        <div className="flex justify-end p-5">
                            <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer hover:bg-white/20 active:scale-90 transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
                            <img src={preview} alt="Fullscreen Preview" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Dashboard Content ──
function StudentDashboardContent() {
    const { user, refreshUser } = useAuth();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState("");
    const [previewImg, setPreviewImg] = useState(null);
    const [showBadgeCelebration, setShowBadgeCelebration] = useState(() => 
        !!(user?.badgeAnimationPending && user?.currentBadge)
    );

    // Persist seen approvals across sessions to guarantee the student sees the animation
    const [seenApprovals, setSeenApprovals] = useState(() => {
        try {
            // Need user.uid, but we are initializing state synchronously. We will handle user.uid changes via a useEffect if needed.
            // Actually, we can just do it without user.uid globally, or initialize inside useEffect.
            return new Set(JSON.parse(localStorage.getItem(`fp_seen_approvals`) || "[]"));
        } catch {
            return new Set();
        }
    });

    const [isVisible, setIsVisible] = useState(document.visibilityState === "visible");

    useEffect(() => {
        const handleVisibilityChange = () => setIsVisible(document.visibilityState === "visible");
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    // Pay Now modal state
    const [payModalPayment, setPayModalPayment] = useState(null);
    const [payModalUpi, setPayModalUpi] = useState(null);

    useEffect(() => {
        if (user?.uid) {
            // Load user-specific seen approvals from localStorage once we have user context
            try {
                const stored = localStorage.getItem(`fp_seen_approvals_${user.uid}`);
                if (stored) {
                    setSeenApprovals(new Set(JSON.parse(stored)));
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
    }, [user?.uid]);

    const fetchPayments = useCallback(async () => {
        try {
            const data = await api.get("/api/student/payments");
            setPayments(data);
        } catch (err) {
            // GlobalErrorModal handles systemic errors automatically via lib/api.js
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPayments();
        const handleOnline = () => {
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

    // Handle manual dismissal of "Paid" payments
    const handleDismissPaid = useCallback((paymentId) => {
        if (!user?.uid) return;
        setSeenApprovals(prev => {
            const newSet = new Set(prev);
            newSet.add(paymentId);
            localStorage.setItem(`fp_seen_approvals_${user.uid}`, JSON.stringify([...newSet]));
            return newSet;
        });
    }, [user?.uid]);

    // Open Pay Now modal → fetch UPI link
    const openPayModal = async (payment) => {
        setPayModalPayment(payment);
        setPayModalUpi(null);
        try {
            const data = await api.get(`/api/student/upi-link?amount=${payment.amount}&month=${payment.month}&year=${payment.year}`);
            setPayModalUpi(data);
        } catch (err) {
            // Handled globally
        }
    };

    const closePayModal = () => {
        setPayModalPayment(null);
        setPayModalUpi(null);
    };

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
    const actionPayments = payments.filter((p) => 
        p.status === "Unpaid" || 
        p.status === "Pending_Verification" ||
        (p.status === "Paid" && !seenApprovals.has(p.id))
    );
    const paidProgress = totalPaid > 0 && (totalPaid + totalDue) > 0 ? (totalPaid / (totalPaid + totalDue)) * 100 : (totalDue === 0 && totalPaid > 0 ? 100 : 0);

    // Badge celebration trigger (must be before any early returns — Rules of Hooks)
    useEffect(() => {
        console.log("[BADGE_CELEB] user.badgeAnimationPending =", user?.badgeAnimationPending, "| user.currentBadge =", user?.currentBadge, "| showBadgeCelebration =", showBadgeCelebration);
        if (user?.badgeAnimationPending && user?.currentBadge) {
            console.log("[BADGE_CELEB] ✅ Triggering celebration!");
            setShowBadgeCelebration(true);
        }
    }, [user?.badgeAnimationPending, user?.currentBadge]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-[#3b82f6]/30 border-t-[#3b82f6] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Badge Celebration Overlay */}
            {showBadgeCelebration && user?.currentBadge && (
                <BadgeCelebrationOverlay
                    badgeTier={user.currentBadge}
                    user={user}
                    onComplete={() => {
                        setShowBadgeCelebration(false);
                        refreshUser();
                    }}
                />
            )}
            {/* ── Welcome Section ── */}
            <section className="space-y-1 animate-fade-in-scale">
                <h1
                    className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#f0f0fd]"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                    <AnimatedGreeting name={user?.name || "Student"} />
                </h1>
            </section>

            {/* ── Alerts ── */}
            {success && (
                <div className="p-3 rounded-2xl bg-[#4af8e3]/10 border border-[#4af8e3]/20 text-[#4af8e3] text-sm flex items-center justify-between animate-fade-in-scale">
                    <span>{success}</span>
                    <button onClick={() => setSuccess("")} className="ml-2 cursor-pointer text-[#4af8e3] hover:text-white">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            )}

            {/* ── Summary Cards ── */}
            <section className="grid grid-cols-1 gap-4">
                {/* Total Paid Card */}
                <div className="glass-card-student rounded-[32px] p-6 relative overflow-hidden group animate-fade-in-scale" style={{ animationDelay: "100ms" }}>
                    <div className="absolute top-0 right-0 p-4 opacity-15 group-hover:opacity-30 transition-opacity">
                        <span className="material-symbols-outlined text-6xl text-[#aaaab7]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#4af8e3]">payments</span>
                            <span className="text-[#aaaab7] font-medium">Total Paid</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-[#f0f0fd]" style={{ fontFamily: "'Manrope', sans-serif" }}>₹{totalPaid.toLocaleString("en-IN")}</span>
                            <span className="text-[#4af8e3] text-xs font-bold uppercase tracking-wider">
                                {totalDue === 0 && totalPaid > 0 ? "Settled" : "Partial"}
                            </span>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#4af8e3] to-[#006a60] rounded-full transition-all duration-700"
                                style={{ width: `${paidProgress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Due Amount Card */}
                <div className="glass-card-student rounded-[32px] p-6 relative overflow-hidden group animate-fade-in-scale" style={{ animationDelay: "200ms" }}>
                    <div className="absolute top-0 right-0 p-4 opacity-15 group-hover:opacity-30 transition-opacity">
                        <span className="material-symbols-outlined text-6xl text-[#aaaab7]">hourglass_empty</span>
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#3b82f6]">info</span>
                            <span className="text-[#aaaab7] font-medium">Due Amount</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-[#f0f0fd]" style={{ fontFamily: "'Manrope', sans-serif" }}>₹{totalDue.toLocaleString("en-IN")}</span>
                            <span className="text-[#3b82f6] text-xs font-bold uppercase tracking-wider">
                                {totalDue === 0 ? "No Action Needed" : `${actionPayments.filter(p => p.status === "Unpaid").length} Pending`}
                            </span>
                        </div>
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#3b82f6] to-[#1e40af] rounded-full transition-all duration-700"
                                style={{ width: totalDue > 0 ? "100%" : "0%" }}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Action Required Section ── */}
            {actionPayments.length > 0 && (
                <section className="space-y-4 animate-fade-in-scale" style={{ animationDelay: "300ms" }}>
                    <div className="flex items-center">
                        <h2 className="text-2xl font-extrabold tracking-tight text-[#f0f0fd]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            Action Required
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {actionPayments.map((p, idx) => (
                            <div key={p.id}
                                className="glass-card-student rounded-[32px] animate-fade-in-scale"
                                style={{ animationDelay: `${400 + idx * 100}ms` }}
                            >
                                {p.status === "Unpaid" ? (
                                    /* ── Unpaid: Original horizontal layout with Pay Now ── */
                                    <div className="p-5 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center border bg-[#ff6e84]/10 border-[#ff6e84]/20">
                                                <span className="material-symbols-outlined text-[#ff6e84]">calendar_today</span>
                                            </div>
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-bold text-[#f0f0fd]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                                    {MONTHS[p.month - 1]} {p.year}
                                                </h3>
                                                <span className="inline-block px-2 py-0.5 bg-[#ff6e84]/10 text-[#ff6e84] text-[10px] font-bold uppercase rounded">
                                                    UNPAID
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => openPayModal(p)}
                                            className="px-6 py-2.5 bg-[#3b82f6] text-white rounded-full font-bold text-sm shadow-[0_4px_20px_rgba(59,130,246,0.4)] active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
                                        >
                                            Pay Now
                                        </button>
                                    </div>
                                ) : (
                                    /* ── Pending Verification / Paid: Vertical layout with Progress Tracker ── */
                                    <div className="p-5 space-y-3 relative">
                                        {p.status === "Paid" && (
                                            <button
                                                onClick={() => handleDismissPaid(p.id)}
                                                className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-[#ff6e84]/20 hover:border-[#ff6e84]/40 hover:text-[#ff6e84] text-[#aaaab7] transition-colors cursor-pointer z-10"
                                                title="Dismiss"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                        )}
                                        <div className="flex items-center gap-3 pr-8">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-[#4af8e3]/10 border-[#4af8e3]/20">
                                                <span className="material-symbols-outlined text-[#4af8e3] text-lg">history</span>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-[#f0f0fd]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                                    {MONTHS[p.month - 1]} {p.year}
                                                </h3>
                                                <span className="text-[10px] font-semibold text-[#4af8e3]/70 uppercase tracking-wider">
                                                    ₹{p.amount?.toLocaleString("en-IN")} • {p.status === "Paid" ? "Approved" : "In Progress"}
                                                </span>
                                            </div>
                                        </div>
                                        <PaymentProgressTracker
                                            status={p.status}
                                            mode={p.mode}
                                            month={MONTHS[p.month - 1]}
                                            year={p.year}
                                            paused={showBadgeCelebration}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}



            {/* No payments */}
            {payments.length === 0 && (
                <div className="glass-card-student rounded-[32px] p-8 text-center text-[#aaaab7] animate-fade-in-scale">
                    <span className="material-symbols-outlined text-5xl text-[#737580] mb-3 block">receipt_long</span>
                    <p className="text-lg font-medium">No payment records yet</p>
                    <p className="text-sm text-[#737580] mt-1">Your payment history will appear here</p>
                </div>
            )}

            {/* ── Image Preview Modal ── */}
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

            {/* ── Pay Now Modal ── */}
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
            <StudentLayout>
                <StudentDashboardContent />
            </StudentLayout>
        </ProtectedRoute>
    );
}
