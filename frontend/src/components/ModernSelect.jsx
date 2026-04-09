import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export default function ModernSelect({ icon, value, onChange, options, placeholder = "Select...", className = "" }) {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);
    const [dropdownPos, setDropdownPos] = useState({ top: "auto", bottom: "auto", left: 0, width: 0 });

    // Find the current selected option to show its label
    const selectedOption = options.find(opt => {
        const optVal = opt.value !== undefined ? opt.value : opt.id !== undefined ? opt.id : opt;
        return String(optVal) === String(value);
    });

    const getLabel = (opt) => {
        if (typeof opt !== "object") return String(opt);
        return opt.label || opt.batch_name || opt.name || String(opt.value ?? opt.id ?? "");
    };

    const getValue = (opt) => {
        if (typeof opt !== "object") return opt;
        return opt.value !== undefined ? opt.value : opt.id;
    };

    const displayLabel = selectedOption ? getLabel(selectedOption) : placeholder;

    const updatePosition = useCallback(() => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const openUpwards = spaceBelow < 300 && spaceAbove > spaceBelow;

            const margin = 16;
            const screenWidth = window.innerWidth;
            const dropdownWidth = Math.max(rect.width, 200);
            const finalWidth = Math.min(dropdownWidth, screenWidth - margin * 2);

            let left = rect.left;
            if (left + finalWidth > screenWidth - margin) {
                left = screenWidth - finalWidth - margin;
            }
            if (left < margin) {
                left = margin;
            }

            setDropdownPos({
                top: openUpwards ? "auto" : rect.bottom + 8,
                bottom: openUpwards ? window.innerHeight - rect.top + 8 : "auto",
                left,
                width: finalWidth,
            });
        }
    }, []);

    const handleToggle = () => {
        if (!isOpen) {
            updatePosition();
        }
        setIsOpen(prev => !prev);
    };

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event) => {
            if (
                buttonRef.current && !buttonRef.current.contains(event.target) &&
                dropdownRef.current && !dropdownRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);
        // Removed scroll listener to prevent menu from closing when scrolling options

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [isOpen]);

    const dropdown = isOpen ? createPortal(
        <div
            ref={dropdownRef}
            style={{
                position: "fixed",
                top: dropdownPos.top,
                bottom: dropdownPos.bottom,
                left: dropdownPos.left,
                width: dropdownPos.width,
                zIndex: 99999,
            }}
        >
            <div
                style={{
                    background: "rgb(26, 28, 40)", // Solid background to prevent backdrop-filter layer clipping bug
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "20px",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        maxHeight: "280px",
                        overflowY: "auto",
                        padding: "6px 0",
                        pointerEvents: "auto",
                    }}
                    className="custom-scrollbar"
                >
                    {options.length === 0 ? (
                        <div style={{ padding: "12px 20px", color: "#737580", fontSize: "13px", fontStyle: "italic" }}>
                            No options available
                        </div>
                    ) : options.map((opt, idx) => {
                        const val = getValue(opt);
                        const label = getLabel(opt);
                        const isSelected = String(value) === String(val);

                        return (
                            <div
                                key={idx}
                                onClick={() => {
                                    onChange({ target: { value: val } });
                                    setIsOpen(false);
                                }}
                                style={{
                                    padding: "14px 20px",
                                    fontSize: "14px",
                                    fontWeight: isSelected ? 700 : 600,
                                    color: isSelected ? "#c799ff" : "#f0f0fd",
                                    backgroundColor: isSelected ? "rgba(199, 153, 255, 0.08)" : "transparent",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    transition: "background-color 0.15s ease",
                                    userSelect: "none",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = isSelected
                                        ? "rgba(199, 153, 255, 0.12)"
                                        : "rgba(255, 255, 255, 0.06)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = isSelected
                                        ? "rgba(199, 153, 255, 0.08)"
                                        : "transparent";
                                }}
                            >
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "12px" }}>
                                    {label}
                                </span>
                                {isSelected && (
                                    <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#c799ff", flexShrink: 0 }}>
                                        check_circle
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={handleToggle}
                className={className || "flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-[#f0f0fd] cursor-pointer hover:bg-white/10 transition-all min-w-[120px]"}
            >
                {icon && <span className="material-symbols-outlined text-[#aaaab7] text-base">{icon}</span>}
                <span className="flex-1 text-left truncate pr-2 font-semibold">{displayLabel}</span>
                <span className={`material-symbols-outlined text-[#aaaab7] text-sm transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                    expand_more
                </span>
            </button>
            {dropdown}
        </>
    );
}
