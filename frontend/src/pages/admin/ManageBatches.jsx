import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";
import { api } from "@/lib/api";
import { getCache, setCache } from "@/lib/memoryCache";
import { GenericListSkeleton } from "@/components/Skeletons";

function BatchesContent() {
    const cacheKeyBatches = "admin_batches";
    const cacheKeyTeachers = "admin_teachers";
    const cachedBatches = getCache(cacheKeyBatches);
    const cachedTeachers = getCache(cacheKeyTeachers);
    
    const [batches, setBatches] = useState(cachedBatches || []);
    const [teachers, setTeachers] = useState(cachedTeachers || []);
    const [loading, setLoading] = useState(!cachedBatches || !cachedTeachers);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [form, setForm] = useState({ batch_name: "", teacher_ids: [], batch_fee: "" });
    const [formLoading, setFormLoading] = useState(false);

    const fetchData = useCallback(async () => {
        if (!getCache("admin_batches") || !getCache("admin_teachers")) {
            if (!loading) setLoading(true);
        }
        
        try {
            const [b, t] = await Promise.all([
                api.get("/api/admin/batches"),
                api.get("/api/admin/teachers"),
            ]);
            
            if (JSON.stringify(getCache("admin_batches")) !== JSON.stringify(b)) {
                setBatches(b);
                setCache("admin_batches", b);
            }
            if (JSON.stringify(getCache("admin_teachers")) !== JSON.stringify(t)) {
                setTeachers(t);
                setCache("admin_teachers", t);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            if (loading) setLoading(false);
        }
    }, [loading]);

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
            <div className="animate-fade-in p-6">
                <GenericListSkeleton />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                {/* Hide title on mobile as it's in the Sub-Page Header */}
                <div className="hidden md:block">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#f0f0fd] tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
                        Manage Batches <span className="text-2xl drop-shadow-md">📋</span>
                    </h1>
                    <p className="text-[#aaaab7] text-sm mt-1 font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {batches.length} batch(es)
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ batch_name: "", teacher_ids: [], batch_fee: "" }); }}
                    className="mt-4 md:mt-0 px-6 py-3 rounded-xl bg-[#c799ff]/10 text-[#c799ff] border border-[#c799ff]/30 text-sm font-bold uppercase tracking-widest
                    hover:bg-[#c799ff]/20 hover:border-[#c799ff]/50 transition-all duration-300 shadow-[0_4px_15px_rgba(199,153,255,0.15)] cursor-pointer flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined text-[18px]">
                        {showForm ? "close" : "add"}
                    </span>
                    {showForm ? "Cancel" : "Create Batch"}
                </button>
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

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto">
                    <form onSubmit={handleSubmit} className="bg-[#13151f]/90 backdrop-blur-[20px] rounded-[2rem] p-6 sm:p-8 w-full max-w-lg border border-[#737580]/20 shadow-2xl relative animate-fade-in-up m-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[#f0f0fd] font-bold text-xl flex items-center gap-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
                                <span className={`material-symbols-outlined ${editId ? "text-[#c799ff]" : "text-[#4af8e3]"}`}>
                                    {editId ? "edit" : "add_circle"}
                                </span>
                                {editId ? "Edit Batch" : "New Batch"}
                            </h3>
                            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm({ batch_name: "", teacher_ids: [], batch_fee: "" }); }} className="text-[#aaaab7] hover:text-[#ff6e84] transition-colors cursor-pointer p-2 rounded-full hover:bg-white/5 flex items-center justify-center">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                            <div>
                                <label className="block text-[#aaaab7] text-[13px] font-bold tracking-wide uppercase mb-2">Batch Name</label>
                                <input
                                    placeholder="e.g. Batch A - Class 10"
                                    value={form.batch_name}
                                    onChange={(e) => setForm({ ...form, batch_name: e.target.value })}
                                    required
                                    className="w-full px-4 py-3.5 rounded-2xl bg-[#222532]/50 border border-[#464752]/50 hover:border-[#464752] text-[#f0f0fd] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#c799ff]/50 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[#aaaab7] text-[13px] font-bold tracking-wide uppercase mb-2">Batch Fee (optional)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#aaaab7] text-lg font-bold">₹</span>
                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        value={form.batch_fee}
                                        onChange={(e) => setForm({ ...form, batch_fee: e.target.value })}
                                        min="0"
                                        step="any"
                                        className="w-full pl-8 pr-4 py-3.5 rounded-2xl bg-[#222532]/50 border border-[#464752]/50 hover:border-[#464752] text-[#f0f0fd] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#c799ff]/50 transition-colors
                                            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mb-8">
                            <label className="block text-[#aaaab7] text-[13px] font-bold tracking-wide uppercase mb-3">Assign Teachers</label>
                            <div className="flex flex-wrap gap-2">
                                {teachers.map((t) => (
                                    <button
                                        key={t.uid || t.id}
                                        type="button"
                                        onClick={() => toggleTeacher(t.uid || t.id)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide border transition-all duration-300 cursor-pointer
                                            ${form.teacher_ids.includes(t.uid || t.id)
                                                ? "bg-[#c799ff]/10 border-[#c799ff]/30 text-[#c799ff] shadow-[0_0_10px_rgba(199,153,255,0.2)]"
                                                : "bg-[#222532]/50 border-[#464752]/50 text-[#aaaab7] hover:border-[#464752]"}`}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                                {teachers.length === 0 && <span className="text-[#ff9dac] text-xs font-medium">No teachers available. Add teachers first.</span>}
                            </div>
                        </div>
                        <div className="flex justify-end gap-4 pt-6 border-t border-[#464752]/30">
                            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm({ batch_name: "", teacher_ids: [], batch_fee: "" }); }} className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest text-[#aaaab7] hover:text-[#f0f0fd] hover:bg-white/5 transition-all cursor-pointer">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={formLoading}
                                className="px-6 py-3 rounded-xl bg-[#c799ff]/10 text-[#c799ff] border border-[#c799ff]/30 text-sm font-bold uppercase tracking-widest
                                hover:bg-[#c799ff]/20 hover:border-[#c799ff]/50 transition-all duration-300 shadow-[0_4px_15px_rgba(199,153,255,0.15)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                            >
                                {formLoading ? (
                                    <span className="w-5 h-5 rounded-full border-2 border-[#c799ff]/30 border-t-[#c799ff] animate-spin" />
                                ) : (
                                    <span className="material-symbols-outlined text-[18px]">{editId ? "save" : "add"}</span>
                                )}
                                {formLoading ? "Saving..." : editId ? "Save Changes" : "Create Batch"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Batch cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {batches.map((batch, idx) => (
                    <div key={batch.id} className="bg-[#171924]/60 backdrop-blur-[20px] border border-[#737580]/10 rounded-[2rem] p-6 animate-fade-in-up transition-colors hover:bg-[#171924]/80 flex flex-col" style={{ animationDelay: `${idx * 80}ms` }}>
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-[#f0f0fd] font-bold text-lg leading-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>{batch.batch_name}</h3>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => handleEdit(batch)}
                                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-[#aaaab7] hover:text-[#c799ff] hover:bg-[#c799ff]/10 hover:border-[#c799ff]/30 transition-all flex items-center justify-center cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button
                                    onClick={() => handleDelete(batch.id)}
                                    disabled={deleting === batch.id}
                                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-[#aaaab7] hover:text-[#ff6e84] hover:bg-[#ff6e84]/10 hover:border-[#ff6e84]/30 transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer"
                                >
                                    {deleting === batch.id ? (
                                        <span className="w-4 h-4 rounded-full border-2 border-[#ff6e84]/30 border-t-[#ff6e84] animate-spin" />
                                    ) : (
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-4 text-sm mt-auto">
                            <div className="flex items-center gap-3">
                                <p className="text-[#aaaab7] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#4af8e3] text-lg">school</span>
                                    <span className="text-[#f0f0fd] font-bold">{batch.student_count || 0}</span> students
                                </p>
                                {batch.batch_fee != null && (
                                    <span className="px-3 py-1 rounded-full bg-[#4af8e3]/10 text-[#4af8e3] text-xs border border-[#4af8e3]/30 font-bold tracking-widest uppercase">
                                        ₹{batch.batch_fee}/mo
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(batch.teacher_names || []).map((name, i) => (
                                    <span key={i} className="px-3 py-1 rounded-lg bg-[#c799ff]/10 text-[#c799ff] text-[11px] border border-[#c799ff]/30 font-bold uppercase tracking-widest whitespace-nowrap">
                                        {name}
                                    </span>
                                ))}
                                {(!batch.teacher_names || batch.teacher_names.length === 0) && (
                                    <span className="text-[#ff9dac] text-xs font-medium italic">No teachers assigned</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {batches.length === 0 && (
                    <div className="col-span-full bg-[#171924]/60 backdrop-blur-[20px] rounded-[2rem] p-10 text-center text-[#aaaab7] border border-[#737580]/10 flex flex-col items-center justify-center gap-4">
                        <span className="material-symbols-outlined text-4xl text-[#464752]">inbox</span>
                        <p className="font-medium text-lg">No batches created yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ManageBatches() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <AdminLayout>
                <BatchesContent />
            </AdminLayout>
        </ProtectedRoute>
    );
}
