import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { compressImage } from "@/lib/imageCompress";
import ProfilePicture from "./ProfilePicture";

/**
 * Profile picture upload modal.
 * Shows current pic, allows uploading a new one (with compression), or removing.
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: function
 */
export default function ProfilePicUpload({ isOpen, onClose }) {
    const { user, updateProfilePic } = useAuth();
    const [preview, setPreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState(""); // "compressing" | "uploading" | "removing" | ""
    const [error, setError] = useState("");
    const fileRef = useRef(null);

    if (!isOpen) return null;

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setError("Please select an image file");
            return;
        }

        setError("");
        setSelectedFile(file);

        // Show preview
        const reader = new FileReader();
        reader.onload = (ev) => setPreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        setUploading(true);
        setError("");

        try {
            // Step 1: Compress
            setStatus("compressing");
            const compressed = await compressImage(selectedFile, 150, 512);

            // Step 2: Upload
            setStatus("uploading");
            const formData = new FormData();
            formData.append("file", compressed, "profile.jpg");

            const data = await api.upload("/api/auth/profile-pic", formData);

            // Step 3: Update context + cache
            await updateProfilePic(data.profile_pic_url, data.pic_version);

            setStatus("");
            setPreview(null);
            setSelectedFile(null);
            onClose();
        } catch (err) {
            setError(err.message || "Upload failed");
            setStatus("");
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = async () => {
        if (!window.confirm("Remove your profile picture?")) return;
        setUploading(true);
        setError("");
        setStatus("removing");

        try {
            await api.delete("/api/auth/profile-pic");
            await updateProfilePic(null, null);
            setPreview(null);
            setSelectedFile(null);
            onClose();
        } catch (err) {
            setError(err.message || "Failed to remove");
        } finally {
            setStatus("");
            setUploading(false);
        }
    };

    const handleClose = () => {
        if (uploading) return;
        setPreview(null);
        setSelectedFile(null);
        setError("");
        setStatus("");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={handleClose}>
            <div
                className="glass-card rounded-2xl border border-[#1a1f2e]/60 w-full max-w-sm p-6 animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-white font-semibold text-lg mb-4 text-center">Profile Picture</h3>

                {/* Current / Preview */}
                <div className="flex flex-col items-center mb-5">
                    <div className="relative group">
                        {preview ? (
                            <img src={preview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-2 border-[#3861fb]/40 shadow-lg" />
                        ) : (
                            <ProfilePicture size={96} className="border-2 border-[#1a1f2e] shadow-lg" />
                        )}

                        {/* Camera overlay */}
                        <button
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                                <circle cx="12" cy="13" r="3" />
                            </svg>
                        </button>
                    </div>

                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                </div>

                {/* Status indicator */}
                {status && (
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="w-4 h-4 border-2 border-[#3861fb] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[#8a8f98] text-sm capitalize">{status}...</span>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <p className="text-red-400 text-xs text-center mb-4">{error}</p>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-2">
                    {selectedFile ? (
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#3861fb] to-[#2b4fcf] text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-[#3861fb]/30 disabled:opacity-50 cursor-pointer"
                        >
                            {uploading ? "Processing..." : "Upload Photo"}
                        </button>
                    ) : (
                        <button
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#3861fb] to-[#2b4fcf] text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-[#3861fb]/30 disabled:opacity-50 cursor-pointer"
                        >
                            Choose Photo
                        </button>
                    )}

                    {user?.profilePicUrl && !selectedFile && (
                        <button
                            onClick={handleRemove}
                            disabled={uploading}
                            className="w-full py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            Remove Photo
                        </button>
                    )}

                    <button
                        onClick={handleClose}
                        disabled={uploading}
                        className="w-full py-2 text-[#8a8f98] text-sm hover:text-white transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
