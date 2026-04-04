import { auth } from "./firebase";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Make an authenticated request to the FastAPI backend.
 */
export async function apiFetch(endpoint, options = {}) {
    let token = null;
    if (auth.currentUser) {
        // getIdToken() returns the cached token. If it expires in <5 mins, it automatically refreshes it first.
        token = await auth.currentUser.getIdToken();
        localStorage.setItem("idToken", token); // Keep localStorage updated for redundancy
    } else {
        token = localStorage.getItem("idToken");
    }

    const headers = {
        ...options.headers,
    };

    // Don't set Content-Type for FormData (browser sets it automatically with boundary)
    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    let res;
    try {
        res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
        });
    } catch (err) {
        // Intercept network-level failures. Give it 1.5s and try once more.
        // This handles "reconnect jitter" where OS says online but DNS/connection isn't ready.
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            res = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers,
            });
        } catch (retryErr) {
            throw new Error("No Connection/ Check your internet connection, try again");
        }
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
    }

    return res.json();
}

/**
 * Shorthand helpers
 */
export const api = {
    get: (url) => apiFetch(url),
    post: (url, data) =>
        apiFetch(url, { method: "POST", body: JSON.stringify(data) }),
    put: (url, data) =>
        apiFetch(url, { method: "PUT", body: JSON.stringify(data) }),
    delete: (url, data) =>
        apiFetch(url, { method: "DELETE", ...(data ? { body: JSON.stringify(data) } : {}) }),
    upload: (url, formData) =>
        apiFetch(url, { method: "POST", body: formData }),
};
