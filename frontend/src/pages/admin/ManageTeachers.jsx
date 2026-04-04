import { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import UserDevicesModal from "@/components/UserDevicesModal";
import { api } from "@/lib/api";

function TeachersContent() {
    const [teachers, setTeachers] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [form, setForm] = useState({ name: "", username: "", password: "", batch_ids: [] });
    const [formLoading, setFormLoading] = useState(false);

    // Edit state
    const [editingTeacher, setEditingTeacher] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", username: "", batch_ids: [], password: "" });
    const [editLoading, setEditLoading] = useState(false);

    // Devices modal state
    const [devicesTeacher, setDevicesTeacher] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const [t, b] = await Promise.all([
                api.get("/api/admin/teachers"),
                api.get("/api/admin/batches"),
            ]);
            setTeachers(t);
            setBatches(b);
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
            await api.post("/api/admin/teachers", form);
            setSuccess("Teacher added successfully!");
            setForm({ name: "", username: "", password: "", batch_ids: [] });
            setShowForm(false);
            fetchData();
        } catch (err) {
            setError(err.message);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (uid) => {
        if (!confirm("Are you sure you want to remove this teacher?")) return;
        setDeleting(uid);
        try {
            await api.delete(`/api/admin/teachers/${uid}`);
            setSuccess("Teacher removed.");
            fetchData();
        } catch (err) {
            setError(err.message);
        } finally {
            setDeleting(null);
        }
    };



    const toggleBatch = (batchId) => {
        setForm((prev) => ({
            ...prev,
            batch_ids: prev.batch_ids.includes(batchId)
                ? prev.batch_ids.filter((id) => id !== batchId)
                : [...prev.batch_ids, batchId],
        }));
    };

    const toggleEditBatch = (batchId) => {
        setEditForm((prev) => ({
            ...prev,
            batch_ids: prev.batch_ids.includes(batchId)
                ? prev.batch_ids.filter((id) => id !== batchId)
                : [...prev.batch_ids, batchId],
        }));
    };

    const startEdit = (teacher) => {
        setEditingTeacher(teacher.uid || teacher.id);
        setEditForm({
            name: teacher.name || "",
            username: teacher.username || "",
            batch_ids: (teacher.assigned_batches || []).map((b) => b.id),
            password: "",
        });
        setShowForm(false);
    };

    const cancelEdit = () => {
        setEditingTeacher(null);
        setEditForm({ name: "", username: "", batch_ids: [], password: "" });
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setEditLoading(true);
        setError("");
        try {
            const payload = {};
            if (editForm.name) payload.name = editForm.name;
            if (editForm.username) payload.username = editForm.username;
            payload.batch_ids = editForm.batch_ids;
            if (editForm.password && editForm.password.trim()) payload.password = editForm.password;

            await api.put(`/api/admin/teachers/${editingTeacher}`, payload);
            setSuccess("Teacher updated successfully!");
            cancelEdit();
            fetchData();
        } catch (err) {
            setError(err.message);
        } finally {
            setEditLoading(false);
        }
    };

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
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Manage Teachers 👨‍🏫</h1>
                        <p className="text-[#8a8f98] text-sm mt-1">{teachers.length} teacher(s)</p>
                    </div>
                    <button
                        onClick={() => { setShowForm(!showForm); cancelEdit(); }}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#3861fb] to-[#2b4fcf] text-white text-sm font-medium
                        hover:from-[#4a73ff] hover:to-[#3861fb] transition-all shadow-lg cursor-pointer"
                    >
                        {showForm ? "✕ Cancel" : "➕ Add Teacher"}
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

                {/* Add Form */}
                {showForm && (
                    <form onSubmit={handleSubmit} className="glass-card rounded-xl p-4 sm:p-5 mb-6 animate-fade-in-up">
                        <h3 className="text-white font-semibold mb-4">New Teacher</h3>
                        <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4 mb-4">
                            <input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                                className="w-full px-3 py-3 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50" />
                            <input placeholder="Username or Mobile" type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required
                                className="w-full px-3 py-3 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50" />
                            <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6}
                                className="w-full px-3 py-3 rounded-lg bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50" />
                        </div>
                        <div className="mb-4">
                            <label className="block text-[#8a8f98] text-sm mb-2">Assign to Batches</label>
                            <div className="flex flex-wrap gap-2">
                                {batches.map((b) => (
                                    <button key={b.id} type="button" onClick={() => toggleBatch(b.id)}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer
                                        ${form.batch_ids.includes(b.id)
                                                ? "bg-[#3861fb]/20 border-[#3861fb]/50 text-[#7b9cff]"
                                                : "bg-[#0f1320]/60 border-[#1a1f2e]/50 text-[#8a8f98] active:text-white"}`}>
                                        {b.batch_name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button type="submit" disabled={formLoading}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#3861fb] to-[#2b4fcf] text-white text-sm font-medium
                            hover:from-[#4a73ff] hover:to-[#3861fb] transition-all disabled:opacity-50 cursor-pointer">
                            {formLoading ? "Adding..." : "Add Teacher"}
                        </button>
                    </form>
                )}

                {/* Edit Form Modal */}
                {editingTeacher && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
                        <form onSubmit={handleEditSubmit} className="glass-card rounded-xl p-5 sm:p-6 w-full max-w-lg border border-amber-500/30 shadow-2xl relative animate-fade-in-up m-auto">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-white font-semibold text-lg">✏️ Edit Teacher</h3>
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
                                    <input placeholder="Leave blank to keep current password" type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} minLength={editForm.password ? 6 : undefined}
                                        className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg bg-[#0f1320]/80 border border-[#1a1f2e]/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                                </div>
                                <div>
                                    <label className="block text-[#8a8f98] text-xs mb-2">Assigned Batches</label>
                                    <div className="flex flex-wrap gap-2">
                                        {batches.map((b) => (
                                            <button key={b.id} type="button" onClick={() => toggleEditBatch(b.id)}
                                                className={`px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer
                                                ${editForm.batch_ids.includes(b.id)
                                                        ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                                                        : "bg-[#0f1320]/60 border-[#1a1f2e]/50 text-[#8a8f98] hover:bg-white/5"}`}>
                                                {b.batch_name}
                                            </button>
                                        ))}
                                    </div>
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

                {/* Mobile: Card layout */}
                <div className="space-y-3 md:hidden">
                    {teachers.map((t, idx) => (
                        <div key={t.uid || t.id} className="glass-card rounded-xl p-4 animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2.5">
                                        <p className="text-white font-medium text-sm truncate">{t.name}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {(t.assigned_batches || []).map((b) => (
                                            <span key={b.id} className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs border border-blue-500/30">
                                                {b.batch_name}
                                            </span>
                                        ))}
                                        {(!t.assigned_batches || t.assigned_batches.length === 0) && (
                                            <span className="text-[#5a5f68] text-xs">No batches</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                    <button onClick={() => setDevicesTeacher(t)}
                                        className="px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-medium
                                        active:bg-cyan-500/30 cursor-pointer">
                                        📱
                                    </button>
                                    <button onClick={() => startEdit(t)}
                                        className="px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium
                                        active:bg-amber-500/30 cursor-pointer">
                                        ✏️
                                    </button>
                                    <button onClick={() => handleDelete(t.uid || t.id)} disabled={deleting === (t.uid || t.id)}
                                        className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-medium
                                        active:bg-red-500/30 disabled:opacity-50 cursor-pointer">
                                        {deleting === (t.uid || t.id) ? "..." : "🗑️"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {teachers.length === 0 && (
                        <div className="glass-card rounded-xl p-8 text-center text-[#8a8f98] text-sm">No teachers found.</div>
                    )}
                </div>

                {/* Desktop: Table */}
                <div className="hidden md:block glass-card rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#0f1320]/40">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">Name</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">Batches</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1a1f2e]/30">
                                {teachers.map((t) => (
                                    <tr key={t.uid || t.id} className="hover:bg-[#0f1320]/20 transition-colors">
                                        <td className="px-5 py-3.5 text-sm text-white">
                                            {t.name}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex flex-wrap gap-1">
                                                {(t.assigned_batches || []).map((b) => (
                                                    <span key={b.id} className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs border border-blue-500/30">
                                                        {b.batch_name}
                                                    </span>
                                                ))}
                                                {(!t.assigned_batches || t.assigned_batches.length === 0) && (
                                                    <span className="text-[#5a5f68] text-xs">No batches</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setDevicesTeacher(t)}
                                                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-medium
                                                    hover:bg-cyan-500/30 transition-all cursor-pointer">
                                                    📱 Devices
                                                </button>
                                                <button onClick={() => startEdit(t)}
                                                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium
                                                    hover:bg-amber-500/30 transition-all cursor-pointer">
                                                    ✏️ Edit
                                                </button>
                                                <button onClick={() => handleDelete(t.uid || t.id)} disabled={deleting === (t.uid || t.id)}
                                                    className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-medium
                                                    hover:bg-red-500/30 transition-all disabled:opacity-50 cursor-pointer">
                                                    {deleting === (t.uid || t.id) ? "..." : "🗑️ Remove"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {teachers.length === 0 && (
                                    <tr><td colSpan={3} className="px-5 py-8 text-center text-[#8a8f98]">No teachers found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Devices Modal */}
            {
                devicesTeacher && (
                    <UserDevicesModal
                        user={devicesTeacher}
                        onClose={() => setDevicesTeacher(null)}
                        onSessionDeleted={fetchData}
                    />
                )
            }
        </>
    );
}

export default function ManageTeachers() {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout>
                <TeachersContent />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
