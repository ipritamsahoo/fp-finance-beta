import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { getYearOptions } from "@/lib/yearOptions";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function FeeOverrideContent() {
    const now = new Date();
    const [students, setStudents] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [filterBatch, setFilterBatch] = useState("");

    // Form state
    const [studentId, setStudentId] = useState("");
    const [mode, setMode] = useState("all-time");
    const [amount, setAmount] = useState("");
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());

    const yearOptions = getYearOptions();

    const fetchStudents = useCallback(async () => {
        try {
            const [s, b] = await Promise.all([
                api.get("/api/admin/students" + (filterBatch ? `?batch_id=${filterBatch}` : "")),
                api.get("/api/admin/batches"),
            ]);
            setStudents(s);
            setBatches(b);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [filterBatch]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    // Get selected student info
    const selectedStudent = students.find((s) => (s.uid || s.id) === studentId);
    const selectedBatch = selectedStudent?.batch_id
        ? batches.find((b) => b.id === selectedStudent.batch_id)
        : null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!studentId) { setError("Please select a student."); return; }
        if (!amount || parseFloat(amount) < 0) { setError("Please enter a valid amount."); return; }

        setSubmitting(true);
        setError("");
        setSuccess("");

        try {
            const payload = {
                student_id: studentId,
                mode,
                amount: parseFloat(amount),
            };
            if (mode === "specific-month") {
                payload.month = month;
                payload.year = year;
            }
            const res = await api.post("/api/admin/fee-override", payload);
            setSuccess(res.message || "Fee override applied successfully!");
            fetchStudents(); // refresh student data
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setStudentId("");
        setMode("all-time");
        setAmount("");
        setMonth(now.getMonth() + 1);
        setYear(now.getFullYear());
        setError("");
        setSuccess("");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Fee Override ⚡</h1>
                <p className="text-slate-400 text-sm mt-1">
                    Adjust fees permanently or for a specific month
                </p>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm animate-fade-in-up">
                    {error} <button onClick={() => setError("")} className="ml-2 cursor-pointer">✕</button>
                </div>
            )}
            {success && (
                <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm animate-fade-in-up">
                    <div className="flex items-start gap-2">
                        <span className="text-lg">✅</span>
                        <span>{success}</span>
                    </div>
                    <button onClick={resetForm}
                        className="mt-3 px-4 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium
                            hover:bg-emerald-500/30 transition-all cursor-pointer">
                        🔄 Apply Another Override
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Step 1: Select Student */}
                <div className="glass-card rounded-xl p-5 animate-fade-in-up">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-500/30 border border-indigo-500/50 flex items-center justify-center text-xs font-bold text-indigo-300">1</span>
                        Select Student
                    </h3>
                    <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                        <select value={filterBatch} onChange={(e) => { setFilterBatch(e.target.value); setStudentId(""); setLoading(true); }}
                            className="w-full px-3 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                            <option value="">All Batches</option>
                            {batches.map((b) => (<option key={b.id} value={b.id}>{b.batch_name}</option>))}
                        </select>
                        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required
                            className="w-full px-3 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                            <option value="">Select Student</option>
                            {students.map((s) => (
                                <option key={s.uid || s.id} value={s.uid || s.id}>
                                    {s.name} {s.custom_fee != null ? `(Custom: ₹${s.custom_fee})` : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Selected student info card */}
                    {selectedStudent && (
                        <div className="mt-4 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                            <div className="flex flex-wrap gap-2 items-center text-sm">
                                <span className="text-white font-medium">{selectedStudent.name}</span>
                                <span className="text-slate-500">•</span>
                                <span className="text-slate-400">{selectedStudent.email}</span>
                                {selectedBatch && (
                                    <>
                                        <span className="text-slate-500">•</span>
                                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs border border-indigo-500/30">
                                            {selectedBatch.batch_name}
                                        </span>
                                    </>
                                )}
                                {selectedStudent.custom_fee != null && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs border border-amber-500/30 font-medium">
                                        Custom: ₹{selectedStudent.custom_fee}
                                    </span>
                                )}
                                {selectedBatch?.batch_fee != null && (
                                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs border border-blue-500/30">
                                        Batch: ₹{selectedBatch.batch_fee}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Step 2: Choose Mode */}
                <div className="glass-card rounded-xl p-5 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-500/30 border border-indigo-500/50 flex items-center justify-center text-xs font-bold text-indigo-300">2</span>
                        Override Mode
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button type="button" onClick={() => setMode("all-time")}
                            className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${mode === "all-time"
                                ? "border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/10"
                                : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50"
                                }`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">🔒</span>
                                <span className={`font-semibold text-sm ${mode === "all-time" ? "text-violet-300" : "text-slate-300"}`}>
                                    All-Time Override
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Permanently changes the student's fee. Updates all unpaid records and applies to all future months.
                            </p>
                        </button>
                        <button type="button" onClick={() => setMode("specific-month")}
                            className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${mode === "specific-month"
                                ? "border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                                : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50"
                                }`}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">📅</span>
                                <span className={`font-semibold text-sm ${mode === "specific-month" ? "text-cyan-300" : "text-slate-300"}`}>
                                    Specific Month Only
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                One-time adjustment for a single month. Does not change the student's profile or affect other months.
                            </p>
                        </button>
                    </div>
                </div>

                {/* Step 3: Amount + Month/Year (conditional) */}
                <div className="glass-card rounded-xl p-5 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-500/30 border border-indigo-500/50 flex items-center justify-center text-xs font-bold text-indigo-300">3</span>
                        {mode === "specific-month" ? "Target & Amount" : "New Amount"}
                    </h3>
                    <div className={`space-y-3 sm:space-y-0 sm:grid sm:gap-4 ${mode === "specific-month" ? "sm:grid-cols-3" : "sm:grid-cols-1 sm:max-w-sm"}`}>
                        {mode === "specific-month" && (
                            <>
                                <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                                    className="w-full px-3 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
                                    {MONTHS.map((m, i) => (<option key={i} value={i + 1}>{m}</option>))}
                                </select>
                                <select value={year} onChange={(e) => setYear(Number(e.target.value))}
                                    className="w-full px-3 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
                                    {yearOptions.map((y) => (<option key={y} value={y}>{y}</option>))}
                                </select>
                            </>
                        )}
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₹</span>
                            <input type="number" placeholder="Amount" value={amount}
                                onChange={(e) => setAmount(e.target.value)} required min="0" step="any"
                                className="w-full pl-7 pr-3 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white text-sm focus:outline-none focus:ring-2
                                    focus:ring-indigo-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
                    <button type="submit" disabled={submitting}
                        className={`flex-1 sm:flex-none px-8 py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-lg ${mode === "all-time"
                            ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-violet-500/20"
                            : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20"
                            }`}>
                        {submitting ? "Applying..." : mode === "all-time" ? "⚡ Apply Permanent Override" : "📅 Apply Month Override"}
                    </button>
                    <button type="button" onClick={resetForm}
                        className="px-6 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300 text-sm font-medium
                            hover:bg-slate-700/50 transition-all cursor-pointer">
                        Reset
                    </button>
                </div>
            </form>

            {/* Info Panel */}
            <div className="mt-8 glass-card rounded-xl p-5 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
                <h3 className="text-white font-semibold mb-3 text-sm">ℹ️ How Fee Override Works</h3>
                <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
                    <div className="flex gap-2">
                        <span className="text-violet-400 shrink-0">🔒</span>
                        <p><strong className="text-violet-300">All-Time:</strong> Sets a permanent custom fee on the student's profile. All current unpaid months are updated, and all future billing will use this rate.</p>
                    </div>
                    <div className="flex gap-2">
                        <span className="text-cyan-400 shrink-0">📅</span>
                        <p><strong className="text-cyan-300">Specific Month:</strong> A one-time correction for a single month (e.g., half-month fees). It does not affect the profile, other months, or future billing.</p>
                    </div>
                    <div className="flex gap-2">
                        <span className="text-emerald-400 shrink-0">🛡️</span>
                        <p><strong className="text-emerald-300">Safety:</strong> Paid records are never modified by either mode. To revert a permanent override, clear the custom fee from the Manage Students page.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function FeeOverride() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout>
                <FeeOverrideContent />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
