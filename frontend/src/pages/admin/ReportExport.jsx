import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { api, apiFetch } from "@/lib/api";
import { getYearOptions } from "@/lib/yearOptions";
import { auth } from "@/lib/firebase";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function ReportExportContent() {
    const now = new Date();
    const [batches, setBatches] = useState([]);
    const [batchId, setBatchId] = useState("");
    const [year, setYear] = useState(now.getFullYear());
    const [selectedMonths, setSelectedMonths] = useState([now.getMonth() + 1]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const yearOptions = getYearOptions();

    // Fetch batches
    useEffect(() => {
        api.get("/api/admin/batches")
            .then((data) => {
                setBatches(data);
                if (data.length > 0 && !batchId) {
                    setBatchId(data[0].id);
                }
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const toggleMonth = (m) => {
        setSelectedMonths((prev) =>
            prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)
        );
    };

    const selectAllMonths = () => {
        if (selectedMonths.length === 12) {
            setSelectedMonths([]);
        } else {
            setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        }
    };

    const handleExport = async () => {
        if (!batchId) { setError("Please select a batch."); return; }
        if (selectedMonths.length === 0) { setError("Please select at least one month."); return; }

        setExporting(true);
        setError("");
        setSuccess("");

        try {
            // Get auth token
            let token = null;
            if (auth.currentUser) {
                token = await auth.currentUser.getIdToken();
            } else {
                token = localStorage.getItem("idToken");
            }

            const monthsParam = selectedMonths.join(",");
            const url = `${API_BASE}/api/admin/report-export?batch_id=${batchId}&year=${year}&months=${monthsParam}`;

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: "Export failed" }));
                throw new Error(err.detail || `HTTP ${res.status}`);
            }

            // Download the PDF
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);

            // Extract filename from Content-Disposition header
            const disposition = res.headers.get("Content-Disposition");
            let filename = "report.pdf";
            if (disposition) {
                const match = disposition.match(/filename=(.+)/);
                if (match) filename = match[1].replace(/"/g, "");
            }

            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);

            const batchName = batches.find((b) => b.id === batchId)?.batch_name || "Batch";
            const monthNames = selectedMonths.map((m) => MONTHS[m - 1]).join(", ");
            setSuccess(`Report exported: ${batchName} — ${monthNames} ${year}`);
        } catch (err) {
            setError(err.message || "Failed to export report.");
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-[#3861fb]/30 border-t-[#3861fb] rounded-full animate-spin" />
            </div>
        );
    }

    const selectedBatch = batches.find((b) => b.id === batchId);

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Report Export 📊</h1>
                <p className="text-[#8a8f98] text-sm mt-1">
                    Export Collection & Distribution report as PDF
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm animate-fade-in-up">
                    {error} <button onClick={() => setError("")} className="ml-2 cursor-pointer">✕</button>
                </div>
            )}

            {/* Success */}
            {success && (
                <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm animate-fade-in-up">
                    <div className="flex items-start gap-2">
                        <span className="text-lg">✅</span>
                        <span>{success}</span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                {/* Step 1: Select Batch */}
                <div className="glass-card rounded-xl p-5 animate-fade-in-up">
                    <h3 className="text-white font-semibold mb-4">
                        Select Batch
                    </h3>
                    <select
                        value={batchId}
                        onChange={(e) => setBatchId(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50"
                    >
                        <option value="">Select Batch</option>
                        {batches.map((b) => (
                            <option key={b.id} value={b.id}>{b.batch_name}</option>
                        ))}
                    </select>
                </div>

                {/* Step 2: Select Year */}
                <div className="glass-card rounded-xl p-5 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
                    <h3 className="text-white font-semibold mb-4">
                        Select Year
                    </h3>
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50"
                    >
                        {yearOptions.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Step 3: Select Month(s) */}
            <div className="glass-card rounded-xl p-5 mb-5 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
                <h3 className="text-white font-semibold mb-1">
                    Select Month(s)
                </h3>
                <p className="text-[#5a5f68] text-xs mb-4">You can select multiple months — each month will get a separate page in the PDF</p>

                <div className="flex flex-wrap gap-2 mb-3">
                    {MONTHS.map((m, i) => {
                        const monthNum = i + 1;
                        const isSelected = selectedMonths.includes(monthNum);
                        return (
                            <button
                                key={monthNum}
                                onClick={() => toggleMonth(monthNum)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                                    ${isSelected
                                        ? "bg-gradient-to-r from-emerald-500/20 to-green-500/10 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                                        : "bg-[#0f1320]/40 border border-[#1a1f2e]/40 text-[#8a8f98] hover:text-white hover:bg-[#1a1f2e]/50"
                                    }`}
                            >
                                {isSelected && <span className="mr-1">✓</span>}
                                {m.slice(0, 3)}
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={selectAllMonths}
                    className="text-xs text-[#8a8f98] hover:text-white transition-colors cursor-pointer underline underline-offset-2"
                >
                    {selectedMonths.length === 12 ? "Deselect All" : "Select All Months"}
                </button>

                {selectedMonths.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {selectedMonths.map((m) => (
                            <span key={m} className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-medium">
                                {MONTHS[m - 1]}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Export Button */}
            <div className="animate-fade-in-up" style={{ animationDelay: "240ms" }}>
                <button
                    onClick={handleExport}
                    disabled={exporting || !batchId || selectedMonths.length === 0}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-white text-sm font-semibold transition-all duration-300
                        bg-gradient-to-r from-[#3861fb] to-[#2b4fcf] hover:from-[#4a73ff] hover:to-[#3861fb]
                        shadow-lg shadow-[#3861fb]/20 hover:shadow-[#3861fb]/40
                        disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
                        active:scale-[0.98]"
                >
                    {exporting ? (
                        <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Generating PDF...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            📄 Export PDF Report
                        </span>
                    )}
                </button>
            </div>


        </div>
    );
}

export default function ReportExport() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout>
                <ReportExportContent />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
