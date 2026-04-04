import uuid
from typing import Optional

import cloudinary.uploader
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from config import ADMIN_UPI_VPA, DEFAULT_FEE_AMOUNT
from database import db
from dependencies import require_role
from utils import ts_now, serialize_doc
from notifications import notify_user, notify_admins

router = APIRouter(prefix="/api/student", tags=["Student"])


# ──────────────────────────────────────────────
# GET /api/student/payments
# ──────────────────────────────────────────────
@router.get("/payments")
async def student_get_payments(user=Depends(require_role("student"))):
    """Get all payments for the logged-in student."""
    try:
        payments = db.collection("payments") \
            .where("student_id", "==", user["uid"]) \
            .stream()

        result = [serialize_doc(p) for p in payments]

        # Overlay with current user name
        name = user.get("name", "Unknown")
        for p in result:
            p["student_name"] = name

        # Resolve teacher names for offline payments
        teacher_uids = {p["requested_by_teacher"] for p in result if p.get("requested_by_teacher")}
        teacher_names = {}
        for tid in teacher_uids:
            t_doc = db.collection("users").document(tid).get()
            if t_doc.exists:
                teacher_names[tid] = t_doc.to_dict().get("name", "Unknown")
        for p in result:
            tid = p.get("requested_by_teacher")
            if tid and tid in teacher_names:
                p["offline_teacher_name"] = teacher_names[tid]

        # Sort in Python to avoid composite index requirement
        result.sort(key=lambda x: (x.get("year", 0), x.get("month", 0)), reverse=True)
        return result
    except Exception as e:
        print(f"Error fetching student payments: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch payments: {str(e)}")


# ──────────────────────────────────────────────
# POST /api/student/payments/{payment_id}/upload
# ──────────────────────────────────────────────
@router.post("/payments/{payment_id}/upload")
async def student_upload_screenshot(
    payment_id: str,
    file: UploadFile = File(...),
    user=Depends(require_role("student")),
):
    """Upload payment screenshot to Cloudinary and set status to Pending_Verification."""
    # Verify the payment belongs to this student
    payment_ref = db.collection("payments").document(payment_id)
    payment_doc = payment_ref.get()

    if not payment_doc.exists:
        raise HTTPException(status_code=404, detail="Payment not found")

    payment = payment_doc.to_dict()
    if payment["student_id"] != user["uid"]:
        raise HTTPException(status_code=403, detail="Not your payment record")

    if payment["status"] == "Paid":
        raise HTTPException(status_code=400, detail="Payment already verified")

    # Upload to Cloudinary
    contents = await file.read()
    try:
        upload_result = cloudinary.uploader.upload(
            contents,
            folder="payment_screenshots",
            public_id=f"{payment_id}_{uuid.uuid4().hex[:8]}",
            resource_type="image",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload screenshot: {str(e)}")

    screenshot_url = upload_result["secure_url"]
    screenshot_public_id = upload_result["public_id"]

    # Update payment in Firestore
    payment_ref.update({
        "screenshot_url": screenshot_url,
        "screenshot_public_id": screenshot_public_id,
        "status": "Pending_Verification",
        "mode": "online",
        "updated_at": ts_now(),
    })

    # Notify student + admins
    student_name = user.get("name", "Student")
    notify_user(user["uid"], "Your payment is currently pending verification.", "payment_pending")
    notify_admins(f"New payment request from {student_name} (Online).", "new_approval")

    return {"message": "Screenshot uploaded", "screenshot_url": screenshot_url}


# ──────────────────────────────────────────────
# GET /api/student/upi-link
# ──────────────────────────────────────────────
@router.get("/upi-link")
async def student_get_upi_link(
    amount: Optional[float] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    user=Depends(require_role("student")),
):
    """Generate UPI deep link for payment."""
    pay_amount = amount or DEFAULT_FEE_AMOUNT
    am_str = str(int(pay_amount)) if pay_amount == int(pay_amount) else f"{pay_amount:.2f}"

    upi_link = f"upi://pay?pa={ADMIN_UPI_VPA}&pn=Soumya%20Sengupta&am={am_str}&cu=INR"

    return {"upi_link": upi_link, "amount": pay_amount, "vpa": ADMIN_UPI_VPA}

