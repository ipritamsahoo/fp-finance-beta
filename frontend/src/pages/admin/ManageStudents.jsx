import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";
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
            // Handled globally
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
                <div className="w-10 h-10 border-4 border-[#c799ff]/30 border-t-[#c799ff] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                    {/* Hide title on mobile as it's in the Sub-Page Header */}
                    <div className="hidden md:block">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#f0f0fd] tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            Manage Students <span className="text-2xl drop-shadow-md">🎓</span>
                        </h1>
                        <p className="text-[#aaaab7] text-sm mt-1 font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
                            {filtered.length} of {students.length} student(s)
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <select value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)}
                            className="px-4 py-3 rounded-xl bg-[#222532]/50 border border-[#464752]/50 hover:border-[#464752] text-[#f0f0fd] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#c799ff]/50 transition-colors">
                            <option value="">All Batches</option>
                            {batches.map((b) => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                        </select>
                        <button
                            onClick={() => { setShowForm(!showForm); cancelEdit(); cancelOverride(); }}
                            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#c799ff]/10 text-[#c799ff] border border-[#c799ff]/30 text-sm font-bold uppercase tracking-widest
                            hover:bg-[#c799ff]/20 hover:border-[#c799ff]/50 transition-all duration-300 shadow-[0_4px_15px_rgba(199,153,255,0.15)] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {showForm ? "close" : "add"}
                            </span>
                            {showForm ? "Cancel" : "Add"}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-4 rounded-xl bg-[#171924]/80 backdrop-blur-[20px] border border-[#ff6e84]/30 shadow-lg text-[#ff9dac] text-sm flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#ff6e84]">error</span>
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError("")} className="ml-2 hover:text-white transition-colors cursor-pointer">✕</button>
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-4 rounded-xl bg-[#171924]/80 backdrop-blur-[20px] border border-[#4af8e3]/30 shadow-lg text-[#dcfff8] text-sm flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#4af8e3]">check_circle</span>
                        <span className="flex-1">{success}</span>
                        <button onClick={() => setSuccess("")} className="ml-2 hover:text-white transition-colors cursor-pointer">✕</button>
                    </div>
                )}

                {/* Add Form */}
                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-[#171924]/60 backdrop-blur-[20px] border border-[#737580]/10 rounded-[2rem] p-6 sm:p-8 mb-6 animate-fade-in-up transition-colors hover:bg-[#171924]/80">
                        <h3 className="text-[#f0f0fd] font-bold mb-6 text-lg flex items-center gap-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            <span className="w-8 h-8 rounded-xl bg-[#c799ff]/10 border border-[#c799ff]/30 flex items-center justify-center text-sm font-extrabold text-[#c799ff] shadow-[0_0_10px_rgba(199,153,255,0.2)]">
                                <span className="material-symbols-outlined text-[16px]">person_add</span>
                            </span>
                            New Student
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                            <input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                                className="w-full px-4 py-3.5 rounded-2xl bg-[#222532]/50 border border-[#464752]/50 hover:border-[#464752] text-[#f0f0fd] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#c799ff]/50 transition-colors placeholder:text-[#aaaab7]/70" />
                            <input placeholder="Username or Mobile" type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required
                                className="w-full px-4 py-3.5 rounded-2xl bg-[#222532]/50 border border-[#464752]/50 hover:border-[#464752] text-[#f0f0fd] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#c799ff]/50 transition-colors placeholder:text-[#aaaab7]/70" />
                            <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6}
                                className="w-full px-4 py-3.5 rounded-2xl bg-[#222532]/50 border border-[#464752]/50 hover:border-[#464752] text-[#f0f0fd] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#c799ff]/50 transition-colors placeholder:text-[#aaaab7]/70" />
                            <select value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })} required
                                className="w-full px-4 py-3.5 rounded-2xl bg-[#222532]/50 border border-[#464752]/50 hover:border-[#464752] text-[#f0f0fd] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#c799ff]/50 transition-colors appearance-none cursor-pointer">
                                <option value="">Select Batch</option>
                                {batches.map((b) => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                            </select>
                        </div>
                        <button type="submit" disabled={formLoading}
                            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#c799ff]/10 text-[#c799ff] border border-[#c799ff]/30 text-sm font-bold uppercase tracking-widest
                            hover:bg-[#c799ff]/20 hover:border-[#c799ff]/50 transition-all duration-300 shadow-[0_4px_15px_rgba(199,153,255,0.15)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-3">
                            {formLoading ? (
                                <span className="w-5 h-5 rounded-full border-2 border-[#c799ff]/30 border-t-[#c799ff] animate-spin" />
                            ) : (
                                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                            )}
                            {formLoading ? "Adding..." : "Add Student"}
                        </button>
                    </form>
                )}

                {/* Edit Form Modal */}
                {editingStudent && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto">
                        <form onSubmit={handleEditSubmit} className="bg-[#13151f]/90 backdrop-blur-[20px] rounded-[2rem] p-6 sm:p-8 w-full max-w-lg border border-[#737580]/20 shadow-2xl relative animate-fade-in-up m-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[#f0f0fd] font-bold text-xl flex items-center gap-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                    <span className="material-symbols-outlined text-[#c799ff]">edit</span>
                                    Edit Student
                                </h3>
                                <button type="button" onClick={cancelEdit} className="text-[#aaaab7] hover:text-[#ff6e84] transition-colors cursor-pointer p-2 rounded-full hover:bg-white/5 flex items-center justify-center">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="space-y-5 mb-8">
                                <div>
                                    <label className="block text-[#aaaab7] text-[13px] font-bold tracking-wide uppercase mb-2">Full Name</label>
                                    <input placeholder="Full Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full px-4 py-3.5 rounded-2xl bg-[#222532]/50 border border-[#464752]/50 hover:border-[#464752] text-[#f0f0fd] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#c799ff]/50 transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-[#aaaab7] text-[13px] font-bold tracking-wide uppercase mb-2">Username or Mobile</label>
                                    <input placeholder="Username or Mobile" type="text" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                        className="w-full px-4 py-3.5 rounded-2xl bg-[#222532]/50 border border-[#464752]/50 hover:border-[#464752] text-[#f0f0fd] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#c799ff]/50 transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-[#aaaab7] text-[13px] font-bold tracking-wide uppercase mb-2">New Password (Optional)</label>
                                    <input placeholder="Leave blank to keep current" type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} minLength={editForm.password ? 6 : undefined}
                                        className="w-full px-4 py-3.5 rounded-2xl bg-[#222532]/50 border border-[#464752]/50 hover:border-[#464752] text-[#f0f0fd] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#c799ff]/50 transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-[#aaaab7] text-[13px] font-bold tracking-wide uppercase mb-2">Batch</label>
                                    <select value={editForm.batch_id} onChange={(e) => setEditForm({ ...editForm, batch_id: e.target.value })}
                                        className="w-full px-4 py-3.5 rounded-2xl bg-[#222532]/50 border border-[#464752]/50 hover:border-[#464752] text-[#f0f0fd] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#c799ff]/50 transition-colors appearance-none cursor-pointer">
                                        <option value="">Select Batch</option>
                                        {batches.map((b) => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-4 pt-6 border-t border-[#464752]/30">
                                <button type="button" onClick={cancelEdit} className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest text-[#aaaab7] hover:text-[#f0f0fd] hover:bg-white/5 transition-all cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" disabled={editLoading}
                                    className="px-6 py-3 rounded-xl bg-[#c799ff]/10 text-[#c799ff] border border-[#c799ff]/30 text-sm font-bold uppercase tracking-widest
                                    hover:bg-[#c799ff]/20 hover:border-[#c799ff]/50 transition-all duration-300 shadow-[0_4px_15px_rgba(199,153,255,0.15)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
                                    {editLoading ? (
                                        <span className="w-5 h-5 rounded-full border-2 border-[#c799ff]/30 border-t-[#c799ff] animate-spin" />
                                    ) : (
                                        <span className="material-symbols-outlined text-[18px]">save</span>
                                    )}
                                    {editLoading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Fee Override Form Modal */}
                {overrideStudent && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto">
                        <form onSubmit={handleOverrideSubmit} className="bg-[#13151f]/90 backdrop-blur-[20px] rounded-[2rem] p-6 sm:p-8 w-full max-w-lg border border-[#f5c542]/20 shadow-2xl relative animate-fade-in-up m-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[#f0f0fd] font-bold text-xl flex items-center gap-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                    <span className="material-symbols-outlined text-[#f5c542]">payments</span>
                                    Override: {overrideStudent.name}
                                </h3>
                                <button type="button" onClick={cancelOverride} className="text-[#aaaab7] hover:text-[#ff6e84] transition-colors cursor-pointer p-2 rounded-full hover:bg-white/5 flex items-center justify-center">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="flex gap-3 mb-6">
                                <button type="button" onClick={() => setOverrideType("permanent")}
                                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest border transition-all duration-300 cursor-pointer
                                    ${overrideType === "permanent" ? "bg-[#c799ff]/10 border-[#c799ff]/50 text-[#c799ff] shadow-[0_0_15px_rgba(199,153,255,0.2)]" : "bg-[#222532]/50 border-[#464752]/50 text-[#aaaab7] hover:bg-[#222532]/80"}`}>
                                    All-Time
                                </button>
                                <button type="button" onClick={() => setOverrideType("monthly")}
                                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest border transition-all duration-300 cursor-pointer
                                    ${overrideType === "monthly" ? "bg-[#4af8e3]/10 border-[#4af8e3]/50 text-[#4af8e3] shadow-[0_0_15px_rgba(74,248,227,0.2)]" : "bg-[#222532]/50 border-[#464752]/50 text-[#aaaab7] hover:bg-[#222532]/80"}`}>
                                    Specific Month
                                </button>
                            </div>
                            <div className="space-y-5 mb-8">
                                <div>
                                    <label className="block text-[#aaaab7] text-[13px] font-bold tracking-wide uppercase mb-2">Custom Fee (₹)</label>
                                    <input type="number" value={overrideAmount} onChange={(e) => setOverrideAmount(e.target.value)} placeholder="Leave blank to reset"
                                        className="w-full px-4 py-3.5 rounded-2xl bg-[#222532]/50 border border-[#464752]/50 hover:border-[#464752] text-[#f0f0fd] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f5c542]/50 transition-colors placeholder:text-[#aaaab7]/50" />
                                </div>
                                {overrideType === "monthly" && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[#aaaab7] text-[13px] font-bold tracking-wide uppercase mb-2">Month</label>
                                            <div className="relative">
                                                <select value={overrideMonth} onChange={(e) => setOverrideMonth(Number(e.target.value))}
                                                    className="w-full px-4 py-3.5 rounded-2xl bg-[#222532]/50 border border-[#464752]/50 hover:border-[#464752] text-[#f0f0fd] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f5c542]/50 transition-colors appearance-none cursor-pointer">
                                                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                                </select>
                                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#aaaab7]">expand_more</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[#aaaab7] text-[13px] font-bold tracking-wide uppercase mb-2">Year</label>
                                            <div className="relative">
                                                <select value={overrideYear} onChange={(e) => setOverrideYear(Number(e.target.value))}
                                                    className="w-full px-4 py-3.5 rounded-2xl bg-[#222532]/50 border border-[#464752]/50 hover:border-[#464752] text-[#f0f0fd] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f5c542]/50 transition-colors appearance-none cursor-pointer">
                                                    {getYearOptions().map((y) => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#aaaab7]">expand_more</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-4 pt-6 border-t border-[#464752]/30">
                                <button type="button" onClick={cancelOverride} className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest text-[#aaaab7] hover:text-[#f0f0fd] hover:bg-white/5 transition-all cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" disabled={overrideLoading}
                                    className="px-6 py-3 rounded-xl bg-[#f5c542]/10 text-[#f5c542] border border-[#f5c542]/30 text-sm font-bold uppercase tracking-widest
                                    hover:bg-[#f5c542]/20 hover:border-[#f5c542]/50 transition-all duration-300 shadow-[0_4px_15px_rgba(245,197,66,0.15)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
                                    {overrideLoading ? (
                                        <span className="w-5 h-5 rounded-full border-2 border-[#f5c542]/30 border-t-[#f5c542] animate-spin" />
                                    ) : (
                                        <span className="material-symbols-outlined text-[18px]">save</span>
                                    )}
                                    {overrideLoading ? "Saving..." : "Set Fee Override"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Mobile: Card layout */}
                <div className="space-y-4 md:hidden">
                    {filtered.map((s, idx) => (
                        <div key={s.uid || s.id} className="bg-[#171924]/60 backdrop-blur-[20px] border border-[#737580]/10 rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-full bg-[#c799ff]/10 flex items-center justify-center text-[#c799ff] font-bold text-lg border border-[#c799ff]/30 shadow-[0_0_10px_rgba(199,153,255,0.2)]">
                                        {s.name.charAt(0).toUpperCase()}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[#f0f0fd] font-bold text-base truncate tracking-wide" style={{ fontFamily: "'Manrope', sans-serif" }}>{s.name}</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 ml-13">
                                    <span className="px-3 py-1 rounded-full bg-[#c799ff]/10 text-[#c799ff] text-[11px] border border-[#c799ff]/30 font-bold uppercase tracking-widest whitespace-nowrap">
                                        {s.batch_name || "No Batch"}
                                    </span>
                                    {s.custom_fee != null && (
                                        <span className="px-3 py-1 rounded-full bg-[#f5c542]/10 text-[#f5c542] text-[11px] border border-[#f5c542]/30 font-bold uppercase tracking-widest whitespace-nowrap">
                                            ₹{s.custom_fee}/mo
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2 justify-end w-full border-t border-[#464752]/30 pt-4">
                                    <button onClick={() => setDevicesStudent(s)}
                                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[#aaaab7] hover:bg-[#4af8e3]/10 hover:border-[#4af8e3]/30 hover:text-[#4af8e3] transition-all cursor-pointer flex-1 flex justify-center">
                                        <span className="material-symbols-outlined text-[20px]">devices</span>
                                    </button>
                                    <button onClick={() => startOverride(s)}
                                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[#aaaab7] hover:bg-[#f5c542]/10 hover:border-[#f5c542]/30 hover:text-[#f5c542] transition-all cursor-pointer flex-1 flex justify-center">
                                        <span className="material-symbols-outlined text-[20px]">payments</span>
                                    </button>
                                    <button onClick={() => startEdit(s)}
                                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[#aaaab7] hover:bg-[#c799ff]/10 hover:border-[#c799ff]/30 hover:text-[#c799ff] transition-all cursor-pointer flex-1 flex justify-center">
                                        <span className="material-symbols-outlined text-[20px]">edit</span>
                                    </button>
                                    <button onClick={() => handleDelete(s.uid || s.id)} disabled={deleting === (s.uid || s.id)}
                                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[#aaaab7] hover:bg-[#ff6e84]/10 hover:border-[#ff6e84]/30 hover:text-[#ff6e84] transition-all disabled:opacity-50 cursor-pointer flex-1 flex justify-center">
                                        {deleting === (s.uid || s.id) ? (
                                            <span className="w-5 h-5 rounded-full border-2 border-[#ff6e84]/30 border-t-[#ff6e84] animate-spin" />
                                        ) : (
                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="bg-[#171924]/60 backdrop-blur-[20px] rounded-[2rem] p-10 text-center text-[#aaaab7] border border-[#737580]/10 flex flex-col items-center justify-center gap-4">
                            <span className="material-symbols-outlined text-4xl text-[#464752]">group</span>
                            <p className="font-medium text-lg">No students found.</p>
                        </div>
                    )}
                </div>

                {/* Desktop: Table */}
                <div className="hidden md:block bg-[#171924]/60 backdrop-blur-[20px] border border-[#737580]/10 rounded-[2rem] overflow-hidden shadow-lg animate-fade-in-up">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full">
                            <thead className="bg-[#222532]/50 border-b border-[#464752]/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#aaaab7] uppercase tracking-widest whitespace-nowrap">Student Details</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#aaaab7] uppercase tracking-widest whitespace-nowrap">Batch</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-[#aaaab7] uppercase tracking-widest whitespace-nowrap">All time Custom Fee</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-[#aaaab7] uppercase tracking-widest whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#464752]/30">
                                {filtered.map((s) => (
                                    <tr key={s.uid || s.id} className="hover:bg-[#222532]/30 transition-colors group">
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <span className="w-10 h-10 rounded-xl bg-[#c799ff]/10 flex items-center justify-center text-[#c799ff] font-bold text-lg border border-[#c799ff]/30 shadow-[0_0_10px_rgba(199,153,255,0.2)]">
                                                    {s.name.charAt(0).toUpperCase()}
                                                </span>
                                                <div>
                                                    <p className="text-[#f0f0fd] font-bold tracking-wide">{s.name}</p>
                                                    <p className="text-[#aaaab7] text-xs mt-0.5">{s.username || "—"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="px-3 py-1 rounded-full bg-[#c799ff]/10 text-[#c799ff] text-[11px] border border-[#c799ff]/30 font-bold uppercase tracking-widest whitespace-nowrap">
                                                {s.batch_name || "None"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            {s.custom_fee != null ? (
                                                <span className="px-3 py-1 rounded-full bg-[#f5c542]/10 text-[#f5c542] text-[11px] border border-[#f5c542]/30 font-bold uppercase tracking-widest whitespace-nowrap shadow-[0_0_10px_rgba(245,197,66,0.1)]">
                                                    ₹{s.custom_fee}
                                                </span>
                                            ) : (
                                                <span className="text-[#aaaab7] text-xs font-bold tracking-widest uppercase">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex justify-end gap-2 outline-none">
                                                <button onClick={() => setDevicesStudent(s)}
                                                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[#aaaab7] hover:text-[#4af8e3] hover:bg-[#4af8e3]/10 hover:border-[#4af8e3]/30 transition-all cursor-pointer flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[16px]">devices</span>
                                                    <span className="text-xs font-bold tracking-wide uppercase">Devices</span>
                                                </button>
                                                <button onClick={() => startOverride(s)}
                                                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[#aaaab7] hover:text-[#f5c542] hover:bg-[#f5c542]/10 hover:border-[#f5c542]/30 transition-all cursor-pointer flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[16px]">payments</span>
                                                    <span className="text-xs font-bold tracking-wide uppercase">Fee</span>
                                                </button>
                                                <button onClick={() => startEdit(s)}
                                                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[#aaaab7] hover:text-[#c799ff] hover:bg-[#c799ff]/10 hover:border-[#c799ff]/30 transition-all cursor-pointer flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                                    <span className="text-xs font-bold tracking-wide uppercase">Edit</span>
                                                </button>
                                                <button onClick={() => handleDelete(s.uid || s.id)} disabled={deleting === (s.uid || s.id)}
                                                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[#aaaab7] hover:text-[#ff6e84] hover:bg-[#ff6e84]/10 hover:border-[#ff6e84]/30 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2">
                                                    {deleting === (s.uid || s.id) ? (
                                                        <span className="w-4 h-4 rounded-full border-2 border-[#ff6e84]/30 border-t-[#ff6e84] animate-spin" />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                                    )}
                                                    <span className="text-xs font-bold tracking-wide uppercase">Remove</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8">
                                            <div className="flex flex-col items-center justify-center gap-3 text-[#aaaab7]">
                                                <span className="material-symbols-outlined text-3xl">group</span>
                                                <p className="font-medium">No students found.</p>
                                            </div>
                                        </td>
                                    </tr>
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
        </div>
    );
}

export default function ManageStudents() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <AdminLayout>
                <StudentsContent />
            </AdminLayout>
        </ProtectedRoute>
    );
}
