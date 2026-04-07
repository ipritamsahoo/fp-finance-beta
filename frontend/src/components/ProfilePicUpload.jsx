import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { compressImage } from "@/lib/imageCompress";
import ProfilePicture from "./ProfilePicture";

/**
 * Profile picture upload modal with 1:1 circular crop & preview.
 * Steps: "select" → "crop" → "preview"
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: function
 */
export default function ProfilePicUpload({ isOpen, onClose }) {
    const { user, updateProfilePic } = useAuth();

    // ── Step state ──
    const [step, setStep] = useState("select"); // "select" | "crop" | "preview"
    const [rawImage, setRawImage] = useState(null); // original dataURL
    const [croppedBlob, setCroppedBlob] = useState(null);
    const [croppedPreview, setCroppedPreview] = useState(null);

    // ── Upload state ──
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");
    const fileRef = useRef(null);

    // ── Crop state ──
    const canvasRef = useRef(null);
    const imgRef = useRef(null);
    const containerRef = useRef(null);

    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startOff: { x: 0, y: 0 } });
    const pinchRef = useRef({ active: false, startDist: 0, startZoom: 1 });

    // Reset all state
    const resetAll = useCallback(() => {
        setStep("select");
        setRawImage(null);
        setCroppedBlob(null);
        setCroppedPreview(null);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setError("");
        setStatus("");
        setUploading(false);
    }, []);

    if (!isOpen) return null;

    // ── Step 1: File Select ──
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("Please select an image file");
            return;
        }
        setError("");
        const reader = new FileReader();
        reader.onload = (ev) => {
            setRawImage(ev.target.result);
            setZoom(1);
            setOffset({ x: 0, y: 0 });
            setStep("crop");
        };
        reader.readAsDataURL(file);
        // Reset file input so same file can be re-selected
        e.target.value = "";
    };

    // ── Step 2: Crop Canvas ──
    const drawCropCanvas = () => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img) return;

        const ctx = canvas.getContext("2d");
        const size = canvas.width;
        const circleR = size / 2 - 16; // circle radius with padding

        ctx.clearRect(0, 0, size, size);

        // Draw image centered + offset + zoom
        const imgAspect = img.naturalWidth / img.naturalHeight;
        let drawW, drawH;
        if (imgAspect > 1) {
            drawH = size * zoom;
            drawW = drawH * imgAspect;
        } else {
            drawW = size * zoom;
            drawH = drawW / imgAspect;
        }

        const dx = (size - drawW) / 2 + offset.x;
        const dy = (size - drawH) / 2 + offset.y;

        ctx.drawImage(img, dx, dy, drawW, drawH);

        // Dark overlay outside circle
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.beginPath();
        ctx.rect(0, 0, size, size);
        ctx.arc(size / 2, size / 2, circleR, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.restore();

        // Circle border
        ctx.save();
        ctx.strokeStyle = "rgba(59, 130, 246, 0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, circleR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    };

    // ── Mouse/Touch handlers for Pan ──
    const handlePointerDown = (e) => {
        if (e.touches && e.touches.length === 2) {
            // Pinch start
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchRef.current = { active: true, startDist: Math.hypot(dx, dy), startZoom: zoom };
            return;
        }
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        dragRef.current = { dragging: true, startX: clientX, startY: clientY, startOff: { ...offset } };
    };

    const handlePointerMove = (e) => {
        if (e.touches && e.touches.length === 2 && pinchRef.current.active) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            const scale = dist / pinchRef.current.startDist;
            setZoom(Math.max(0.5, Math.min(5, pinchRef.current.startZoom * scale)));
            return;
        }
        if (!dragRef.current.dragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        setOffset({
            x: dragRef.current.startOff.x + (clientX - dragRef.current.startX),
            y: dragRef.current.startOff.y + (clientY - dragRef.current.startY),
        });
    };

    const handlePointerUp = () => {
        dragRef.current.dragging = false;
        pinchRef.current.active = false;
    };

    // ── Generate Cropped Image ──
    const handleCrop = () => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img) return;

        const size = canvas.width;
        const circleR = size / 2 - 16;

        // Create a new canvas for the cropped output (1:1 square)
        const outSize = 512;
        const outCanvas = document.createElement("canvas");
        outCanvas.width = outSize;
        outCanvas.height = outSize;
        const outCtx = outCanvas.getContext("2d");

        // Replicate the same image draw transform
        const imgAspect = img.naturalWidth / img.naturalHeight;
        let drawW, drawH;
        if (imgAspect > 1) {
            drawH = size * zoom;
            drawW = drawH * imgAspect;
        } else {
            drawW = size * zoom;
            drawH = drawW / imgAspect;
        }

        const dx = (size - drawW) / 2 + offset.x;
        const dy = (size - drawH) / 2 + offset.y;

        // Map from circle region in the display canvas to the output canvas
        const cropX = size / 2 - circleR;
        const cropY = size / 2 - circleR;
        const cropSize = circleR * 2;
        const scaleRatio = outSize / cropSize;

        outCtx.drawImage(
            img,
            0, 0, img.naturalWidth, img.naturalHeight,
            (dx - cropX) * scaleRatio,
            (dy - cropY) * scaleRatio,
            drawW * scaleRatio,
            drawH * scaleRatio
        );

        outCanvas.toBlob(
            (blob) => {
                if (!blob) {
                    setError("Crop failed");
                    return;
                }
                setCroppedBlob(blob);
                setCroppedPreview(URL.createObjectURL(blob));
                setStep("preview");
            },
            "image/jpeg",
            0.92
        );
    };

    // ── Step 3: Upload ──
    const handleUpload = async () => {
        if (!croppedBlob) return;
        setUploading(true);
        setError("");

        try {
            setStatus("compressing");
            const compressed = await compressImage(
                new File([croppedBlob], "profile.jpg", { type: "image/jpeg" }),
                150, 512
            );

            setStatus("uploading");
            const formData = new FormData();
            formData.append("file", compressed, "profile.jpg");

            const data = await api.upload("/api/auth/profile-pic", formData);

            await updateProfilePic(data.profile_pic_url, data.pic_version);

            setStatus("");
            resetAll();
            onClose();
        } catch (err) {
            setError(err.message || "Upload failed");
            setStatus("");
        } finally {
            setUploading(false);
        }
    };

    // ── Remove ──
    const handleRemove = async () => {
        setUploading(true);
        setError("");
        setStatus("removing");
        try {
            await api.delete("/api/auth/profile-pic");
            await updateProfilePic(null, null);
            resetAll();
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
        resetAll();
        onClose();
    };

    // ── RENDER ──
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4" onClick={handleClose}>
            <div
                className="relative w-full max-w-sm bg-[#0c0e17]/95 backdrop-blur-3xl border border-[#464752]/50 rounded-[2rem] shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden animate-[modalIn_0.3s_ease-out]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ═══ STEP: SELECT ═══ */}
                {step === "select" && (
                    <div className="p-6 space-y-5">
                        <h3 className="text-white font-extrabold text-lg text-center tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            Profile Picture
                        </h3>

                        {/* Current Picture */}
                        <div className="flex flex-col items-center">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-tr from-[#3b82f6] to-[#4af8e3] rounded-full blur-sm opacity-30" />
                                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/10">
                                    <ProfilePicture size={96} />
                                </div>

                                <button
                                    onClick={() => fileRef.current?.click()}
                                    className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-white text-[28px]">photo_camera</span>
                                </button>
                            </div>
                        </div>

                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

                        {error && <p className="text-[#ff9dac] text-xs text-center">{error}</p>}

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => fileRef.current?.click()}
                                className="w-full py-3 rounded-2xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 text-[#3b82f6] text-sm font-bold hover:bg-[#3b82f6]/25 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                                Choose Photo
                            </button>

                            {user?.profilePicUrl && (
                                <button
                                    onClick={handleRemove}
                                    disabled={uploading}
                                    className="w-full py-3 rounded-2xl bg-[#ff6e84]/10 border border-[#ff6e84]/30 text-[#ff6e84] text-sm font-bold hover:bg-[#ff6e84]/20 transition-all disabled:opacity-50 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                    Remove Photo
                                </button>
                            )}

                            <button
                                onClick={handleClose}
                                className="w-full py-2.5 text-[#aaaab7] text-sm hover:text-white transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>

                        {status && (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
                                <span className="text-[#aaaab7] text-sm capitalize">{status}...</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ STEP: CROP ═══ */}
                {step === "crop" && (
                    <CropStep
                        rawImage={rawImage}
                        canvasRef={canvasRef}
                        imgRef={imgRef}
                        containerRef={containerRef}
                        zoom={zoom}
                        setZoom={setZoom}
                        offset={offset}
                        drawCropCanvas={drawCropCanvas}
                        handlePointerDown={handlePointerDown}
                        handlePointerMove={handlePointerMove}
                        handlePointerUp={handlePointerUp}
                        handleCrop={handleCrop}
                        onBack={() => { setStep("select"); setRawImage(null); }}
                    />
                )}

                {/* ═══ STEP: PREVIEW ═══ */}
                {step === "preview" && (
                    <div className="p-6 space-y-5">
                        <h3 className="text-white font-extrabold text-lg text-center tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            Preview
                        </h3>

                        <div className="flex flex-col items-center">
                            <div className="relative">
                                <div className="absolute -inset-2 bg-gradient-to-tr from-[#3b82f6] to-[#4af8e3] rounded-full blur-md opacity-30" />
                                <img
                                    src={croppedPreview}
                                    alt="Cropped preview"
                                    className="relative w-32 h-32 rounded-full object-cover border-2 border-white/15 shadow-2xl"
                                />
                            </div>
                            <p className="text-[#aaaab7] text-xs mt-3">This is how your profile photo will look</p>
                        </div>

                        {error && <p className="text-[#ff9dac] text-xs text-center">{error}</p>}

                        {status && (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
                                <span className="text-[#aaaab7] text-sm capitalize">{status}...</span>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setCroppedBlob(null); setCroppedPreview(null); setStep("crop"); }}
                                disabled={uploading}
                                className="flex-1 py-3 rounded-2xl bg-white/5 border border-[#464752]/50 text-[#aaaab7] text-sm font-bold hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                            >
                                Re-crop
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="flex-1 py-3 rounded-2xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 text-[#3b82f6] text-sm font-bold hover:bg-[#3b82f6]/25 transition-all disabled:opacity-50 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                                {uploading ? "Processing..." : "Upload"}
                            </button>
                        </div>

                        <button
                            onClick={handleClose}
                            disabled={uploading}
                            className="w-full py-2 text-[#aaaab7] text-sm hover:text-white transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Crop sub-component — separated to properly handle useEffect for canvas drawing.
 */
function CropStep({
    rawImage, canvasRef, imgRef, containerRef,
    zoom, setZoom, offset,
    drawCropCanvas,
    handlePointerDown, handlePointerMove, handlePointerUp,
    handleCrop, onBack,
}) {
    const [imgLoaded, setImgLoaded] = useState(false);

    // Draw canvas whenever zoom/offset/image changes
    useEffect(() => {
        if (imgLoaded) drawCropCanvas();
    }, [zoom, offset, imgLoaded, drawCropCanvas]);

    // Resize canvas to container
    useEffect(() => {
        const resize = () => {
            const container = containerRef.current;
            const canvas = canvasRef.current;
            if (!container || !canvas) return;
            const w = container.clientWidth;
            canvas.width = w;
            canvas.height = w;
            if (imgLoaded) drawCropCanvas();
        };
        resize();
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, [imgLoaded, drawCropCanvas, containerRef, canvasRef]);

    return (
        <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-[#aaaab7] hover:text-white hover:bg-white/10 transition-all cursor-pointer active:scale-90"
                >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <h3 className="text-white font-extrabold text-lg tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    Crop Photo
                </h3>
                <div className="w-9" /> {/* Spacer */}
            </div>

            <p className="text-[#aaaab7] text-xs text-center -mt-2">Drag to reposition • Pinch or slide to zoom</p>

            {/* Hidden image to load source */}
            <img
                ref={imgRef}
                src={rawImage}
                alt=""
                className="hidden"
                onLoad={() => setImgLoaded(true)}
            />

            {/* Canvas crop area */}
            <div
                ref={containerRef}
                className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black/30 cursor-grab active:cursor-grabbing touch-none select-none"
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
            >
                <canvas ref={canvasRef} className="w-full h-full" />
            </div>

            {/* Zoom slider */}
            <div className="flex items-center gap-3 px-2">
                <span className="material-symbols-outlined text-[18px] text-[#aaaab7]">zoom_out</span>
                <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-[#464752]/50 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3b82f6]
                        [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(59,130,246,0.4)] [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20"
                />
                <span className="material-symbols-outlined text-[18px] text-[#aaaab7]">zoom_in</span>
            </div>

            {/* Crop button */}
            <button
                onClick={handleCrop}
                className="w-full py-3 rounded-2xl bg-[#3b82f6]/15 border border-[#3b82f6]/30 text-[#3b82f6] text-sm font-bold hover:bg-[#3b82f6]/25 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
            >
                <span className="material-symbols-outlined text-[18px]">crop</span>
                Crop & Preview
            </button>
        </div>
    );
}
