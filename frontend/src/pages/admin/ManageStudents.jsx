import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import UserDevicesModal from "@/components/UserDevicesModal";
import { api } from "@/lib/api";
import { getYearOptions } from "@/lib/yearOptions";


const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function StudentsContent() {
    const [students, setStudents] = useState([]);
    const [batches, setBatches] = useState([]);
    const [filterBatch, setFilterBatch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [form, setForm] = useState({ name: "", username: "", password: "", batch_id: "" });
    const [formLoading, setFormLoading] = useState(false);

    // Edit state
    const [editingStudent, setEditingStudent] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", username: "", batch_id: "", password: "" });
    const [editLoading, setEditLoading] = useState(false);

    // Fee override state
    const [overrideStudent, setOverrideStudent] = useState(null);
    const [overrideType, setOverrideType] = useState("permanent");
    const [overrideAmount, setOverrideAmount] = useState("");
    const [overrideMonth, setOverrideMonth] = useState(new Date().getMonth() + 1);
    const [overrideYear, setOverrideYear] = useState(new Date().getFullYear());
    const [overrideLoading, setOverrideLoading] = useState(false);

    // Devices modal state
    const [devicesStudent, setDevicesStudent] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const [s, b] = await Promise.all([
                api.get("/api/admin/students"),
                api.get("/api/admin/batches"),
            ]);
            setStudents(s);
            setBatches(b);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setError("");
        try {
            await api.post("/api/admin/students", form);
            setSuccess("Student added!");
            setForm({ name: "", username: "", password: "", batch_id: "" });
            setShowForm(false);
            fetchData();
        } catch (err) {
            setError(err.message);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (uid) => {
        if (!confirm("Delete this student? This is irreversible.")) return;
        setDeleting(uid);
        try {
            await api.delete(`/api/admin/students/${uid}`);
            setSuccess("Student deleted.");
            fetchData();
        } catch (err) {
            setError(err.message);
        } finally {
            setDeleting(null);
        }
    };



    const startEdit = (student) => {
        setEditingStudent(student.uid || student.id);
        setEditForm({
            name: student.name || "",
            username: student.username || "",
            batch_id: student.batch_id || "",
            password: "",
        });
        setShowForm(false);
        setOverrideStudent(null);
    };

    const cancelEdit = () => {
        setEditingStudent(null);
        setEditForm({ name: "", username: "", batch_id: "", password: "" });
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setEditLoading(true);
        setError("");
        try {
            const payload = {};
            if (editForm.name) payload.name = editForm.name;
            if (editForm.username) payload.username = editForm.username;
            if (editForm.batch_id) payload.batch_id = editForm.batch_id;
            if (editForm.password && editForm.password.trim()) payload.password = editForm.password;

            await api.put(`/api/admin/students/${editingStudent}`, payload);
            setSuccess("Student updated!");
            cancelEdit();
            fetchData();
        } catch (err) {
            setError(err.message);
        } finally {
            setEditLoading(false);
        }
    };

    // Fee override handlers
    const startOverride = (student) => {
        setOverrideStudent(student);
        setOverrideAmount(student.custom_fee != null ? String(student.custom_fee) : "");
        setOverrideType("permanent");
        cancelEdit();
        setShowForm(false);
    };

    const cancelOverride = () => {
        setOverrideStudent(null);
        setOverrideAmount("");
    };

    const handleOverrideSubmit = async (e) => {
        e.preventDefault();
        setOverrideLoading(true);
        setError("");
        try {
            const uid = overrideStudent.uid || overrideStudent.id;
            if (overrideType === "permanent") {
                if (overrideAmount === "") {
                    // Clear custom fee using the student update endpoint
                    await api.put(`/api/admin/students/${uid}`, {
                        clear_custom_fee: true,
                    });
                } else {
                    await api.post("/api/admin/fee-override", {
                        student_id: uid,
                        mode: "all-time",
                        amount: parseFloat(overrideAmount),
                    });
                }
                setSuccess(overrideAmount === "" ? "Custom fee removed." : `Custom fee set to ₹${overrideAmount}.`);
            } else {
                await api.post("/api/admin/fee-override", {
                    student_id: uid,
                    mode: "specific-month",
                    amount: parseFloat(overrideAmount),
                    month: overrideMonth,
                    year: overrideYear,
                });
                setSuccess(`Fee for ${MONTHS[overrideMonth - 1]} ${overrideYear} updated to ₹${overrideAmount}.`);
            }
            cancelOverride();
            fetchData();
        } catch (err) {
            setError(err.message);
        } finally {
            setOverrideLoading(false);
        }
    };

    const filtered = (filterBatch ? students.filter((s) => s.batch_id === filterBatch) : [...students]).sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-[#3861fb]/30 border-t-[#3861fb] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <>
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Manage Students 🎓</h1>
                        <p className="text-[#8a8f98] text-sm mt-1">{filtered.length} of {students.length} student(s)</p>
                    </div>
                    <div className="flex gap-2">
                        <select value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)}
                            className="px-3 py-2.5 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50">
                            <option value="">All Batches</option>
                            {batches.map((b) => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                        </select>
                        <button
                            onClick={() => { setShowForm(!showForm); cancelEdit(); cancelOverride(); }}
                            className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#3861fb] to-[#2b4fcf] text-white text-sm font-medium
                            hover:from-[#4a73ff] hover:to-[#3861fb] transition-all shadow-lg cursor-pointer whitespace-nowrap"
                        >
                            {showForm ? "✕ Cancel" : "➕ Add"}
                        </button>
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

                {/* Add Form */}
                {showForm && (
                    <form onSubmit={handleSubmit} className="glass-card rounded-xl p-4 sm:p-5 mb-6 animate-fade-in-up">
                        <h3 className="text-white font-semibold mb-4">New Student</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                            <input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                                className="w-full px-3 py-3 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50" />
                            <input placeholder="Username or Mobile" type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required
                                className="w-full px-3 py-3 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50" />
                            <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6}
                                className="w-full px-3 py-3 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50" />
                            <select value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })} required
                                className="w-full px-3 py-3 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50">
                                <option value="">Select Batch</option>
                                {batches.map((b) => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                            </select>
                        </div>
                        <button type="submit" disabled={formLoading}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#3861fb] to-[#2b4fcf] text-white text-sm font-medium
                            hover:from-[#4a73ff] hover:to-[#3861fb] transition-all disabled:opacity-50 cursor-pointer">
                            {formLoading ? "Adding..." : "Add Student"}
                        </button>
                    </form>
                )}

                {/* Edit Form Modal */}
                {editingStudent && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
                        <form onSubmit={handleEditSubmit} className="glass-card rounded-xl p-5 sm:p-6 w-full max-w-lg border border-amber-500/30 shadow-2xl relative animate-fade-in-up m-auto">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-white font-semibold text-lg">✏️ Edit Student</h3>
                                <button type="button" onClick={cancelEdit} className="text-[#8a8f98] hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-white/10">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-[#8a8f98] text-xs mb-1">Full Name</label>
                                    <input placeholder="Full Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg bg-[#0f1320]/80 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                                </div>
                                <div>
                                    <label className="block text-[#8a8f98] text-xs mb-1">Username or Mobile</label>
                                    <input placeholder="Username or Mobile" type="text" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                        className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg bg-[#0f1320]/80 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                                </div>
                                <div>
                                    <label className="block text-[#8a8f98] text-xs mb-1">New Password (Optional)</label>
                                    <input placeholder="Leave blank to keep current" type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} minLength={editForm.password ? 6 : undefined}
                                        className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg bg-[#0f1320]/80 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                                </div>
                                <div>
                                    <label className="block text-[#8a8f98] text-xs mb-1">Batch</label>
                                    <select value={editForm.batch_id} onChange={(e) => setEditForm({ ...editForm, batch_id: e.target.value })}
                                        className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg bg-[#0f1320]/80 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                                        <option value="">Select Batch</option>
                                        {batches.map((b) => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-[#1a1f2e]/50">
                                <button type="button" onClick={cancelEdit} className="px-5 py-2.5 rounded-lg text-sm font-medium text-[#8a8f98] hover:text-white transition-colors cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" disabled={editLoading}
                                    className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-medium
                                    hover:from-amber-500 hover:to-orange-500 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-500/20">
                                    {editLoading ? "Saving..." : "💾 Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Fee Override Form Modal */}
                {overrideStudent && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
                        <form onSubmit={handleOverrideSubmit} className="glass-card rounded-xl p-5 sm:p-6 w-full max-w-lg border border-[#f5c542]/30 shadow-2xl relative animate-fade-in-up m-auto">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-white font-semibold text-lg">💰 Fee Override: {overrideStudent.name}</h3>
                                <button type="button" onClick={cancelOverride} className="text-[#8a8f98] hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-white/10">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex gap-2 mb-5">
                                <button type="button" onClick={() => setOverrideType("permanent")}
                                    className={`flex-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-all cursor-pointer
                                    ${overrideType === "permanent" ? "bg-violet-500/20 border-violet-500/50 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.3)]" : "bg-[#0f1320]/60 border-[#1a1f2e]/50 text-[#8a8f98] hover:bg-white/5"}`}>
                                    🔒 All-Time
                                </button>
                                <button type="button" onClick={() => setOverrideType("monthly")}
                                    className={`flex-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-all cursor-pointer
                                    ${overrideType === "monthly" ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]" : "bg-[#0f1320]/60 border-[#1a1f2e]/50 text-[#8a8f98] hover:bg-white/5"}`}>
                                    📅 Specific Month
                                </button>
                            </div>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-[#8a8f98] text-xs mb-1">Custom Fee (₹)</label>
                                    <input type="number" value={overrideAmount} onChange={(e) => setOverrideAmount(e.target.value)} placeholder="Leave blank to reset"
                                        className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg bg-[#0f1320]/80 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#f5c542]/50" />
                                </div>
                                {overrideType === "monthly" && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[#8a8f98] text-xs mb-1">Month</label>
                                            <select value={overrideMonth} onChange={(e) => setOverrideMonth(Number(e.target.value))}
                                                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg bg-[#0f1320]/80 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#f5c542]/50">
                                                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[#8a8f98] text-xs mb-1">Year</label>
                                            <select value={overrideYear} onChange={(e) => setOverrideYear(Number(e.target.value))}
                                                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg bg-[#0f1320]/80 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#f5c542]/50">
                                                {getYearOptions().map((y) => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-[#1a1f2e]/50">
                                <button type="button" onClick={cancelOverride} className="px-5 py-2.5 rounded-lg text-sm font-medium text-[#8a8f98] hover:text-white transition-colors cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" disabled={overrideLoading}
                                    className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#f5c542] to-amber-600 text-slate-900 text-sm font-bold
                                    hover:from-[#f5d062] hover:to-amber-500 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-500/20">
                                    {overrideLoading ? "Saving..." : "Set Fee Override"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Mobile: Card layout */}
                <div className="space-y-3 md:hidden">
                    {filtered.map((s, idx) => (
                        <div key={s.uid || s.id} className="glass-card rounded-xl p-4 animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    <p className="text-white font-medium text-sm truncate">{s.name}</p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <button onClick={() => setDevicesStudent(s)}
                                        className="px-2 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs cursor-pointer">📱</button>
                                    <button onClick={() => startOverride(s)}
                                        className="px-2 py-1.5 rounded-lg bg-[#f5c542]/20 border border-[#f5c542]/30 text-[#f5c542] text-xs cursor-pointer">💰</button>
                                    <button onClick={() => startEdit(s)}
                                        className="px-2 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs cursor-pointer">✏️</button>

                                    <button onClick={() => handleDelete(s.uid || s.id)} disabled={deleting === (s.uid || s.id)}
                                        className="px-2 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-xs disabled:opacity-50 cursor-pointer">🗑️</button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs border border-blue-500/30">
                                    {s.batch_name || "No Batch"}
                                </span>
                                {s.custom_fee != null && (
                                    <span className="px-2 py-0.5 rounded-full bg-[#f5c542]/20 text-[#f5c542] text-xs border border-[#f5c542]/30 font-medium">
                                        ₹{s.custom_fee}/mo
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="glass-card rounded-xl p-8 text-center text-[#8a8f98] text-sm">No students found.</div>
                    )}
                </div>

                {/* Desktop: Table */}
                <div className="hidden md:block glass-card rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#0f1320]/40">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">Name</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">Batch</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">All time Custom Fee</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1a1f2e]/30">
                                {filtered.map((s) => (
                                    <tr key={s.uid || s.id} className="hover:bg-[#0f1320]/20 transition-colors">
                                        <td className="px-5 py-3.5 text-sm text-white font-medium">
                                            {s.name}
                                        </td>
                                        <td className="px-5 py-3.5 text-sm">
                                            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs border border-blue-500/30">
                                                {s.batch_name || "None"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {s.custom_fee != null ? (
                                                <span className="px-2 py-0.5 rounded-full bg-[#f5c542]/20 text-[#f5c542] text-xs border border-[#f5c542]/30 font-medium">
                                                    ₹{s.custom_fee}
                                                </span>
                                            ) : (
                                                <span className="text-[#5a5f68] text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setDevicesStudent(s)}
                                                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-medium
                                                    hover:bg-cyan-500/30 transition-all cursor-pointer">
                                                    📱 Devices
                                                </button>
                                                <button onClick={() => startOverride(s)}
                                                    className="px-3 py-1.5 rounded-lg bg-[#f5c542]/20 border border-[#f5c542]/30 text-[#f5c542] text-xs font-medium
                                                    hover:bg-[#f5c542]/30 transition-all cursor-pointer">
                                                    💰 Fee
                                                </button>
                                                <button onClick={() => startEdit(s)}
                                                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium
                                                    hover:bg-amber-500/30 transition-all cursor-pointer">
                                                    ✏️ Edit
                                                </button>

                                                <button onClick={() => handleDelete(s.uid || s.id)} disabled={deleting === (s.uid || s.id)}
                                                    className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-medium
                                                    hover:bg-red-500/30 transition-all disabled:opacity-50 cursor-pointer">
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={4} className="px-5 py-8 text-center text-[#8a8f98]">No students found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Devices Modal */}
            {
                devicesStudent && (
                    <UserDevicesModal
                        user={devicesStudent}
                        onClose={() => setDevicesStudent(null)}
                        onSessionDeleted={fetchData}
                    />
                )
            }
        </>
    );
}

export default function ManageStudents() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout>
                <StudentsContent />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
