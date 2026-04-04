import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";

function BatchesContent() {
    const [batches, setBatches] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [form, setForm] = useState({ batch_name: "", teacher_ids: [], batch_fee: "" });
    const [formLoading, setFormLoading] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [b, t] = await Promise.all([
                api.get("/api/admin/batches"),
                api.get("/api/admin/teachers"),
            ]);
            setBatches(b);
            setTeachers(t);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setError("");
        try {
            const payload = {
                batch_name: form.batch_name,
                teacher_ids: form.teacher_ids,
                batch_fee: form.batch_fee !== "" ? parseFloat(form.batch_fee) : null,
            };
            if (editId) {
                await api.put(`/api/admin/batches/${editId}`, payload);
                setSuccess("Batch updated!");
            } else {
                await api.post("/api/admin/batches", payload);
                setSuccess("Batch created!");
            }
            setForm({ batch_name: "", teacher_ids: [], batch_fee: "" });
            setShowForm(false);
            setEditId(null);
            fetchData();
        } catch (err) {
            setError(err.message);
        } finally {
            setFormLoading(false);
        }
    };

    const handleEdit = (batch) => {
        setForm({ batch_name: batch.batch_name, teacher_ids: batch.teacher_ids || [], batch_fee: batch.batch_fee != null ? String(batch.batch_fee) : "" });
        setEditId(batch.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this batch?")) return;
        setDeleting(id);
        try {
            await api.delete(`/api/admin/batches/${id}`);
            setSuccess("Batch deleted.");
            fetchData();
        } catch (err) {
            setError(err.message);
        } finally {
            setDeleting(null);
        }
    };

    const toggleTeacher = (tid) => {
        setForm((prev) => ({
            ...prev,
            teacher_ids: prev.teacher_ids.includes(tid)
                ? prev.teacher_ids.filter((id) => id !== tid)
                : [...prev.teacher_ids, tid],
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-[#3861fb]/30 border-t-[#3861fb] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">Manage Batches 📋</h1>
                    <p className="text-[#8a8f98] mt-1">{batches.length} batch(es)</p>
                </div>
                <button
                    onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ batch_name: "", teacher_ids: [], batch_fee: "" }); }}
                    className="mt-4 md:mt-0 px-4 py-2 rounded-lg bg-gradient-to-r from-[#3861fb] to-[#2b4fcf] text-white text-sm font-medium
            hover:from-[#4a73ff] hover:to-[#3861fb] transition-all shadow-lg cursor-pointer"
                >
                    {showForm ? "✕ Cancel" : "➕ Create Batch"}
                </button>
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

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
                    <form onSubmit={handleSubmit} className="glass-card rounded-xl p-5 sm:p-6 w-full max-w-lg border border-[#3861fb]/30 shadow-2xl relative animate-fade-in-up m-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-white font-semibold text-lg">{editId ? "✏️ Edit Batch" : "➕ New Batch"}</h3>
                            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm({ batch_name: "", teacher_ids: [], batch_fee: "" }); }} className="text-[#8a8f98] hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-white/10">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                            <div>
                                <label className="block text-[#8a8f98] text-xs mb-1">Batch Name</label>
                                <input
                                    placeholder="e.g. Batch A - Class 10"
                                    value={form.batch_name}
                                    onChange={(e) => setForm({ ...form, batch_name: e.target.value })}
                                    required
                                    className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg bg-[#0f1320]/80 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50"
                                />
                            </div>
                            <div>
                                <label className="block text-[#8a8f98] text-xs mb-1">Batch Fee (optional)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8f98] text-sm font-medium">₹</span>
                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        value={form.batch_fee}
                                        onChange={(e) => setForm({ ...form, batch_fee: e.target.value })}
                                        min="0"
                                        step="any"
                                        className="w-full pl-7 pr-3 py-2.5 sm:py-3 rounded-lg bg-[#0f1320]/80 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50
                                            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mb-6">
                            <label className="block text-[#8a8f98] text-xs mb-2">Assign Teachers</label>
                            <div className="flex flex-wrap gap-2">
                                {teachers.map((t) => (
                                    <button
                                        key={t.uid || t.id}
                                        type="button"
                                        onClick={() => toggleTeacher(t.uid || t.id)}
                                        className={`px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer
                                            ${form.teacher_ids.includes(t.uid || t.id)
                                                ? "bg-[#3861fb]/20 border-[#3861fb]/50 text-[#7b9cff] shadow-[0_0_8px_rgba(56,97,251,0.2)]"
                                                : "bg-[#0f1320]/60 border-[#1a1f2e]/50 text-[#8a8f98] hover:bg-white/5"}`}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                                {teachers.length === 0 && <span className="text-[#5a5f68] text-xs">No teachers available. Add teachers first.</span>}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-[#1a1f2e]/50">
                            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm({ batch_name: "", teacher_ids: [], batch_fee: "" }); }} className="px-5 py-2.5 rounded-lg text-sm font-medium text-[#8a8f98] hover:text-white transition-colors cursor-pointer">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={formLoading}
                                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#3861fb] to-[#2b4fcf] text-white text-sm font-medium
                                hover:from-[#4a73ff] hover:to-[#3861fb] transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-[#3861fb]/20"
                            >
                                {formLoading ? "Saving..." : editId ? "💾 Save Changes" : "➕ Create Batch"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Batch cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {batches.map((batch, idx) => (
                    <div key={batch.id} className="glass-card rounded-xl p-5 animate-fade-in-up" style={{ animationDelay: `${idx * 80}ms` }}>
                        <div className="flex items-start justify-between mb-3">
                            <h3 className="text-white font-semibold">{batch.batch_name}</h3>
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => handleEdit(batch)}
                                    className="w-8 h-8 rounded-lg bg-[#1a1f2e]/50 text-[#8a8f98] hover:text-white hover:bg-[#1a1f2e] transition-all flex items-center justify-center text-xs cursor-pointer"
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={() => handleDelete(batch.id)}
                                    disabled={deleting === batch.id}
                                    className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center text-xs disabled:opacity-50 cursor-pointer"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-3">
                                <p className="text-[#8a8f98]">
                                    🎓 <span className="text-white font-medium">{batch.student_count || 0}</span> students
                                </p>
                                {batch.batch_fee != null && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30 font-medium">
                                        ₹{batch.batch_fee}/mo
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {(batch.teacher_names || []).map((name, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs border border-blue-500/30">
                                        {name}
                                    </span>
                                ))}
                                {(!batch.teacher_names || batch.teacher_names.length === 0) && (
                                    <span className="text-[#5a5f68] text-xs">No teachers assigned</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {batches.length === 0 && (
                    <div className="col-span-full glass-card rounded-xl p-8 text-center text-[#8a8f98]">
                        No batches created yet.
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ManageBatches() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout>
                <BatchesContent />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
