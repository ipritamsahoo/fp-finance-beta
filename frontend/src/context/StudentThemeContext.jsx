import { createContext, useContext, useState, useEffect } from "react";

const StudentThemeContext = createContext({ theme: "dark", toggleTheme: () => {} });

export function StudentThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem("fp_student_theme") || "dark";
        } catch {
            return "dark";
        }
    });

    useEffect(() => {
        try { localStorage.setItem("fp_student_theme", theme); } catch {}
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

    return (
        <StudentThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </StudentThemeContext.Provider>
    );
}

export function useStudentTheme() {
    return useContext(StudentThemeContext);
}
