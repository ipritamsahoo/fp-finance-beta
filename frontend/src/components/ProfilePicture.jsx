import { useAuth } from "@/context/AuthContext";

/**
 * Reusable profile picture component.
 * Shows cached image or falls back to gradient circle with user initial.
 *
 * Props:
 *  - size: number (pixel size, default 36)
 *  - picUrl: optional override URL (for showing other users' pics)
 *  - name: optional override name (for other users)
 *  - className: additional CSS classes
 */
export default function ProfilePicture({ size = 36, picUrl, name, className = "" }) {
    const { user } = useAuth();

    const displayUrl = picUrl ?? user?.profilePicDataUrl ?? user?.profilePicUrl;
    const displayName = name ?? user?.name ?? "U";
    const initial = displayName.charAt(0).toUpperCase() || "U";

    const sizeStyle = { width: size, height: size, minWidth: size, minHeight: size };

    if (displayUrl) {
        return (
            <img
                src={displayUrl}
                alt={displayName}
                className={`rounded-full object-cover ${className}`}
                style={sizeStyle}
                onError={(e) => {
                    // Fallback to initial on image load error
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                }}
            />
        );
    }

    return (
        <div
            className={`rounded-full bg-gradient-to-tr from-[#3861fb] to-[#2b4fcf] flex items-center justify-center text-white font-bold shadow-sm ${className}`}
            style={{ ...sizeStyle, fontSize: size * 0.4 }}
        >
            {initial}
        </div>
    );
}
