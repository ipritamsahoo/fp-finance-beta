import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const friendlyError = (err) => {
        const code = err?.code || "";
        const msg = err?.message || "";
        if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found" || msg.includes("INVALID_LOGIN_CREDENTIALS"))
            return "Invalid username or password. Please try again.";
        if (code === "auth/too-many-requests")
            return "Too many failed attempts. Please try again later.";
        if (code === "auth/user-disabled")
            return "This account has been disabled. Contact your teacher.";
        if (code === "auth/network-request-failed")
            return "Network error. Please check your internet connection.";
        if (msg.includes("User profile not found"))
            return "Account not found. Please contact your admin.";
        return "Something went wrong. Please try again.";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await login(username, password);
            setTimeout(() => navigate("/"), 500);
        } catch (err) {
            setError(friendlyError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex items-center justify-center relative overflow-hidden px-4 py-6" style={{ paddingBottom: `max(1.5rem, env(safe-area-inset-bottom))` }}>
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a12] via-[#0d1025]/50 to-[#0a0a12]" />
            <div className="absolute top-1/4 -left-20 sm:-left-32 w-64 sm:w-96 h-64 sm:h-96 bg-[#3861fb]/15 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 -right-20 sm:-right-32 w-64 sm:w-96 h-64 sm:h-96 bg-[#f5c542]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

            {/* Login card */}
            <div className="relative z-10 w-full max-w-md animate-fade-in-up">
                <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-2xl shadow-[#3861fb]/10">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-6 sm:mb-8">
                        <img src="/logo.png" alt="FP Finance Logo" className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl shadow-lg shadow-[#3861fb]/30 mb-3 sm:mb-4 object-cover" />
                        <h1 className="text-2xl font-bold text-white">FP Finance</h1>
                        <p className="text-[#8a8f98] text-sm mt-1">Sign in to your account</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-6 p-4 rounded-2xl bg-[#ff6e84]/10 border border-[#ff6e84]/30 text-[#ff9dac] text-[13px] font-medium flex items-center gap-3 animate-fade-in-scale">
                            <span className="material-symbols-outlined text-[20px] text-[#ff6e84]">error</span>
                            <span className="flex-1">{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                        <div>
                            <label className="block text-[#c0c4cc] text-sm font-medium mb-1.5">Username or Mobile</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                placeholder="e.g. ramdey or 9876543210"
                                className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white placeholder-[#4a4f5a] focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50 focus:border-[#3861fb]/50 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[#c0c4cc] text-sm font-medium mb-1.5">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-[#0f1320]/60 border border-[#1a1f2e]/50 text-white placeholder-[#4a4f5a] focus:outline-none focus:ring-2 focus:ring-[#3861fb]/50 focus:border-[#3861fb]/50 transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-[#3861fb] to-[#2b4fcf] text-white font-semibold
                hover:from-[#4a73ff] hover:to-[#3861fb] transition-all duration-200 shadow-lg shadow-[#3861fb]/25
                disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </span>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>


                </div>
            </div>
        </div>
    );
}
