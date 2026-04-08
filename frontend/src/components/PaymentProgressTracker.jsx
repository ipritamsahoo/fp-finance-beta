import { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";

const STAGES = [
    { key: "requested", label: "Requested", sub: "Receipt Uploaded", icon: "check" },
    { key: "verifying", label: "Verifying", sub: "Admin Review", icon: "hourglass_top" },
    { key: "approved", label: "Approved", sub: "Payment Settled", icon: "check_circle" },
];

// ── Confetti Burst ─────────────────────────────────────────
function createConfetti(container) {
    if (!container) return;
    const colors = ["#4af8e3", "#20B2AA", "#3b82f6", "#c799ff", "#fff", "#ff9dac"];
    const particles = [];

    for (let i = 0; i < 28; i++) {
        const dot = document.createElement("span");
        dot.className = "confetti-particle";
        dot.style.background = colors[Math.floor(Math.random() * colors.length)];
        dot.style.width = `${3 + Math.random() * 5}px`;
        dot.style.height = dot.style.width;
        container.appendChild(dot);
        particles.push(dot);
    }

    gsap.fromTo(
        particles,
        { x: 0, y: 0, scale: 1, opacity: 1 },
        {
            x: () => (Math.random() - 0.5) * 120,
            y: () => (Math.random() - 0.5) * 90,
            scale: () => Math.random() * 0.5,
            opacity: 0,
            duration: 0.9,
            ease: "power2.out",
            stagger: { each: 0.015, from: "center" },
            onComplete: () => {
                particles.forEach((p) => p.remove());
            },
        }
    );
}

// ── Main Component ─────────────────────────────────────────
export default function PaymentProgressTracker({ status, month, year }) {
    const trackFillRef = useRef(null);
    const nodesRef = useRef([]);
    const confettiAnchorRef = useRef(null);
    const containerRef = useRef(null);
    const pulseAnimRef = useRef(null);

    // Which step are we at?
    const activeStep =
        status === "Paid" ? 2 : status === "Pending_Verification" ? 1 : 0;

    const setNodeRef = useCallback((el, idx) => {
        nodesRef.current[idx] = el;
    }, []);

    // Determine target fill width based on status
    const targetFill = activeStep >= 2 ? "100%" : activeStep >= 1 ? "50%" : "0%";

    useEffect(() => {
        const fill = trackFillRef.current;
        const nodes = nodesRef.current;
        if (!fill) return;

        // Kill any existing pulse animation
        if (pulseAnimRef.current) {
            pulseAnimRef.current.kill();
            pulseAnimRef.current = null;
        }

        // Set initial state
        gsap.set(fill, { width: "0%" });

        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

        if (activeStep >= 1) {
            // ── Stage B: Animate to 50% (Verifying) ──
            tl.to(fill, { width: "50%", duration: 1.2, ease: "power2.out" });

            // Activate node 0 (Requested) immediately
            if (nodes[0]) {
                tl.to(
                    nodes[0],
                    { scale: 1.15, duration: 0.3, ease: "back.out(2)" },
                    0.1
                );
                tl.to(nodes[0], { scale: 1, duration: 0.2 }, 0.4);
            }

            // Activate node 1 (Verifying) at 50%
            if (nodes[1]) {
                tl.to(
                    nodes[1],
                    { scale: 1.15, duration: 0.3, ease: "back.out(2)" },
                    0.9
                );
                tl.to(nodes[1], { scale: 1, duration: 0.2 }, 1.2);

                // Start pulsing glow on Verifying node
                if (activeStep === 1) {
                    tl.call(() => {
                        pulseAnimRef.current = gsap.to(nodes[1], {
                            boxShadow:
                                "0 0 18px 6px rgba(74,248,227,0.45), 0 0 40px 12px rgba(74,248,227,0.15)",
                            duration: 1.2,
                            yoyo: true,
                            repeat: -1,
                            ease: "sine.inOut",
                        });
                    }, null, 1.4);
                }
            }
        }

        if (activeStep >= 2) {
            // ── Stage C: Continue from 50% to 100% (Approved) ──
            tl.to(fill, {
                width: "100%",
                duration: 1.0,
                ease: "power2.out",
            });

            // Pop the Approved node
            if (nodes[2]) {
                tl.to(
                    nodes[2],
                    { scale: 1.3, duration: 0.35, ease: "back.out(3)" },
                    "-=0.3"
                );
                tl.to(nodes[2], { scale: 1, duration: 0.25 });
            }

            // Confetti
            tl.call(() => {
                createConfetti(confettiAnchorRef.current);
            }, null, "-=0.2");
        }

        return () => {
            tl.kill();
            if (pulseAnimRef.current) {
                pulseAnimRef.current.kill();
            }
            // Ensure fill stays at target on cleanup (prevents React flash)
            if (fill) gsap.set(fill, { width: targetFill });
        };
    }, [activeStep, targetFill]);

    // Don't render tracker for Unpaid
    if (status === "Unpaid") return null;

    return (
        <div ref={containerRef} className="w-full mt-1">
            {/* ── Glassmorphism Tracker Container ── */}
            <div className="glass-tracker rounded-2xl sm:rounded-3xl px-4 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-7">
                {/* ── Track ── */}
                <div className="relative flex items-center justify-between w-full">
                    {/* Background track line (contains the fill as a child) */}
                    <div className="absolute top-[18px] sm:top-[22px] left-[16.66%] right-[16.66%] h-[3px] bg-[#2a2d3a] rounded-full overflow-hidden">
                        {/* Animated fill line — width % is now relative to the track */}
                        <div
                            ref={trackFillRef}
                            className="h-full rounded-full"
                            style={{
                                background: "linear-gradient(90deg, #4af8e3, #20B2AA, #1E90FF)",
                            }}
                        />
                    </div>

                    {/* ── Nodes ── */}
                    {STAGES.map((stage, idx) => {
                        const isActive = idx <= activeStep;
                        const isCurrent = idx === activeStep;
                        const isApprovedDone = idx === 2 && activeStep >= 2;

                        return (
                            <div
                                key={stage.key}
                                className="flex flex-col items-center z-10 relative"
                                style={{ flex: "0 0 auto", width: "33.33%" }}
                            >
                                {/* Node circle */}
                                <div
                                    ref={(el) => setNodeRef(el, idx)}
                                    className={`
                                        w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center
                                        border-2 transition-colors duration-500 relative
                                        ${isActive
                                            ? "bg-gradient-to-br from-[#4af8e3] to-[#20B2AA] border-[#4af8e3]/50 shadow-[0_0_12px_3px_rgba(74,248,227,0.3)]"
                                            : "bg-[#1a1d2e] border-[#2a2d3a]"
                                        }
                                        ${isCurrent && idx === 1 ? "tracker-node-pulse" : ""}
                                        ${isApprovedDone ? "!bg-gradient-to-br !from-[#20B2AA] !to-[#008B8B] !border-[#4af8e3]" : ""}
                                    `}
                                >
                                    {isActive ? (
                                        <span className="material-symbols-outlined text-white text-base sm:text-lg material-symbols-filled drop-shadow-md">
                                            {idx === 1 && activeStep === 1 ? "hourglass_top" : "check"}
                                        </span>
                                    ) : (
                                        <span className="material-symbols-outlined text-[#464752] text-base sm:text-lg">
                                            {stage.icon}
                                        </span>
                                    )}

                                    {/* Confetti anchor (on Approved node) */}
                                    {idx === 2 && (
                                        <div
                                            ref={confettiAnchorRef}
                                            className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible"
                                        />
                                    )}
                                </div>

                                {/* Labels */}
                                <span
                                    className={`mt-2 text-[10px] sm:text-xs font-bold tracking-wide leading-tight text-center
                                        ${isActive ? "text-[#4af8e3]" : "text-[#464752]"}
                                    `}
                                >
                                    {stage.label}
                                </span>
                                <span
                                    className={`text-[8px] sm:text-[10px] leading-tight text-center mt-0.5
                                        ${isActive ? "text-[#4af8e3]/60" : "text-[#363848]"}
                                    `}
                                >
                                    {stage.sub}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Status Message ── */}
            {status === "Pending_Verification" && (
                <div className="mt-3 flex items-start gap-2 px-1">
                    <span className="material-symbols-outlined text-[#4af8e3]/70 text-sm mt-0.5 shrink-0">info</span>
                    <p className="text-[11px] sm:text-xs text-[#aaaab7] leading-relaxed">
                        Your payment for{" "}
                        <span className="font-semibold text-[#f0f0fd]">
                            {month} {year}
                        </span>{" "}
                        is undergoing verification. Track progress above.
                    </p>
                </div>
            )}

            {status === "Paid" && (
                <div className="mt-3 flex items-start gap-2 px-1">
                    <span className="material-symbols-outlined text-[#4af8e3] text-sm mt-0.5 shrink-0 material-symbols-filled">verified</span>
                    <p className="text-[11px] sm:text-xs text-[#4af8e3] leading-relaxed font-medium">
                        Payment for{" "}
                        <span className="font-bold text-[#f0f0fd]">
                            {month} {year}
                        </span>{" "}
                        has been verified and settled!
                    </p>
                </div>
            )}
        </div>
    );
}
