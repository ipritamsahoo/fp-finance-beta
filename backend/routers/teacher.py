"""
FP Finance Teacher Router
===================
Endpoints: view batches, view payments, submit offline request.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from config import DEFAULT_FEE_AMOUNT
from database import db
from schemas import OfflineRequest
from dependencies import require_role
from utils import ts_now, serialize_doc
from notifications import notify_user, notify_admins

router = APIRouter(prefix="/api/teacher", tags=["Teacher"])


# ──────────────────────────────────────────────
# GET /api/teacher/batches
# ──────────────────────────────────────────────
@router.get("/batches")
def teacher_get_batches(user=Depends(require_role("teacher"))):
    """Get batches assigned to this teacher, with student counts."""
    batches = db.collection("batches") \
        .where("teacher_ids", "array_contains", user["uid"]) \
        .stream()

    result = []
    for batch in batches:
        b = serialize_doc(batch)
        # Count students in this batch
        students = db.collection("users") \
            .where("batch_id", "==", batch.id) \
            .where("role", "==", "student") \
            .stream()
        b["student_count"] = sum(1 for _ in students)
        result.append(b)

    return result


# ──────────────────────────────────────────────
# GET /api/teacher/payments
# ──────────────────────────────────────────────
@router.get("/payments")
def teacher_get_payments(
    batch_id: str,
    month: Optional[int] = None,
    year: Optional[int] = None,
    user=Depends(require_role("teacher")),
):
    """Get payment records for a batch, optionally filtered by month/year."""
    # Verify teacher is assigned to this batch
    batch_doc = db.collection("batches").document(batch_id).get()
    if not batch_doc.exists:
        raise HTTPException(status_code=404, detail="Batch not found")

    batch_data = batch_doc.to_dict()
    if user["uid"] not in batch_data.get("teacher_ids", []):
        raise HTTPException(status_code=403, detail="Not assigned to this batch")

    # Build query
    query = db.collection("payments").where("batch_id", "==", batch_id)
    if month:
        query = query.where("month", "==", month)
    if year:
        query = query.where("year", "==", year)

    payments = query.stream()
    results = [serialize_doc(p) for p in payments]

    # Dynamically inject the latest student names
    student_ids = {p.get("student_id") for p in results if p.get("student_id")}
    if student_ids:
        user_refs = [db.collection("users").document(sid) for sid in student_ids]
        student_names = {}
        for i in range(0, len(user_refs), 100):
            docs = db.get_all(user_refs[i:i+100])
            for doc in docs:
                if doc.exists:
                    student_names[doc.id] = doc.to_dict().get("name", "Unknown")
        for p in results:
            sid = p.get("student_id")
            if sid and sid in student_names:
                p["student_name"] = student_names[sid]

    results.sort(key=lambda x: x.get("student_name", "").lower())

    return results


# ──────────────────────────────────────────────
# POST /api/teacher/offline-request
# ──────────────────────────────────────────────
@router.post("/offline-request")
def teacher_offline_request(
    req: OfflineRequest,
    user=Depends(require_role("teacher")),
):
    """Submit an offline payment request on behalf of a student."""
    # Verify the student exists
    student_doc = db.collection("users").document(req.student_id).get()
    if not student_doc.exists:
        raise HTTPException(status_code=404, detail="Student not found")

    student = student_doc.to_dict()
    if student.get("role") != "student":
        raise HTTPException(status_code=400, detail="User is not a student")

    # Check if payment record already exists for this month
    existing = db.collection("payments") \
        .where("student_id", "==", req.student_id) \
        .where("month", "==", req.month) \
        .where("year", "==", req.year) \
        .limit(1) \
        .stream()

    existing_list = list(existing)

    if existing_list:
        # Update existing payment
        payment_ref = db.collection("payments").document(existing_list[0].id)
        current = existing_list[0].to_dict()
        if current["status"] == "Paid":
            raise HTTPException(status_code=400, detail="Payment already verified for this month")

        payment_ref.update({
            "status": "Pending_Verification",
            "mode": "offline",
            "requested_by_teacher": user["uid"],
            "requested_at": ts_now(),
            "updated_at": ts_now(),
        })
        # Notify student + admins
        student_name = student.get("name", "Student")
        teacher_name = user.get("name", "Teacher")
        notify_user(req.student_id, "Your payment is currently pending verification.", "payment_pending")
        notify_admins(f"New payment request for {student_name} (Offline) by {teacher_name}.", "new_approval")
        return {"message": "Offline request submitted", "payment_id": existing_list[0].id}
    else:
        # Create new payment record
        amount = req.amount or DEFAULT_FEE_AMOUNT
        payment_data = {
            "student_id": req.student_id,
            "student_name": student.get("name", ""),
            "batch_id": student.get("batch_id", ""),
            "month": req.month,
            "year": req.year,
            "amount": amount,
            "mode": "offline",
            "screenshot_url": None,
            "requested_by_teacher": user["uid"],
            "status": "Pending_Verification",
            "requested_at": ts_now(),
            "created_at": ts_now(),
            "updated_at": ts_now(),
        }
        _, doc_ref = db.collection("payments").add(payment_data)
        # Notify student + admins
        student_name = student.get("name", "Student")
        teacher_name = user.get("name", "Teacher")
        notify_user(req.student_id, "Your payment is currently pending verification.", "payment_pending")
        notify_admins(f"New payment request for {student_name} (Offline) by {teacher_name}.", "new_approval")
        return {"message": "Offline request submitted", "payment_id": doc_ref.id}


# ──────────────────────────────────────────────
# GET /api/teacher/distribution
# ──────────────────────────────────────────────
@router.get("/distribution")
def teacher_distribution(
    month: int,
    year: int,
    batch_id: Optional[str] = None,
    user=Depends(require_role("teacher")),
):
    """Get revenue distribution for the teacher's assigned batches only.
    Scoped: teacher can only see batches they are assigned to.
    Optional batch_id filter to view a specific batch."""

    uid = user["uid"]

    # 1. Find batches assigned to this teacher
    teacher_batches = db.collection("batches") \
        .where("teacher_ids", "array_contains", uid) \
        .stream()

    batch_map = {}  # batch_id -> batch data
    for b in teacher_batches:
        bd = b.to_dict()
        batch_map[b.id] = {
            "batch_name": bd.get("batch_name", "Unknown"),
            "teacher_ids": bd.get("teacher_ids", []),
        }

    if not batch_map:
        return {
            "month": month, "year": year,
            "total_collected": 0, "my_total": 0,
            "teacher_totals": [], "dates": [],
            "batches": [],
        }

    # Build batch list for the dropdown BEFORE filtering
    all_teacher_batches = [
        {"id": bid, "batch_name": binfo["batch_name"]}
        for bid, binfo in batch_map.items()
    ]

    # If batch_id filter is provided, verify teacher has access
    if batch_id:
        if batch_id not in batch_map:
            raise HTTPException(status_code=403, detail="Not assigned to this batch")
        batch_map = {batch_id: batch_map[batch_id]}

    # 2. Query paid payments for each batch
    all_payments = []
    for bid in batch_map:
        payments = db.collection("payments") \
            .where("status", "==", "Paid") \
            .where("month", "==", month) \
            .where("year", "==", year) \
            .where("batch_id", "==", bid) \
            .stream()
        for p in payments:
            data = serialize_doc(p)
            data["_batch_id"] = bid
            all_payments.append(data)

    # 3. Calculate teacher earnings per batch
    teacher_earnings = {}  # teacher_uid -> { name, total }
    my_total = 0

    for bid, binfo in batch_map.items():
        batch_payments = [p for p in all_payments if p.get("_batch_id") == bid]
        batch_total = sum(p.get("amount", 0) for p in batch_payments)
        teacher_ids = binfo["teacher_ids"]
        tc = len(teacher_ids)
        per_teacher = round(batch_total / tc, 2) if tc > 0 else 0

        for tid in teacher_ids:
            t_doc = db.collection("users").document(tid).get()
            t_name = t_doc.to_dict().get("name", "Unknown") if t_doc.exists else "Unknown"
            if tid not in teacher_earnings:
                teacher_earnings[tid] = {"name": t_name, "total": 0}
            teacher_earnings[tid]["total"] = round(
                teacher_earnings[tid]["total"] + per_teacher, 2
            )
            if tid == uid:
                my_total = round(my_total + per_teacher, 2)

    teacher_totals = [
        {"uid": tid, "name": info["name"], "total": info["total"]}
        for tid, info in teacher_earnings.items()
    ]
    teacher_totals.sort(key=lambda t: t["total"], reverse=True)

    total_collected = sum(p.get("amount", 0) for p in all_payments)

    # 4. Date-wise breakdown
    payments_by_date = {}
    for p in all_payments:
        updated_at = p.get("updated_at", "")
        date_key = str(updated_at)[:10] if updated_at else "unknown"
        payments_by_date.setdefault(date_key, []).append(p)

    date_results = []
    for date_str in sorted(payments_by_date.keys(), reverse=True):
        dp = payments_by_date[date_str]
        date_total = sum(x.get("amount", 0) for x in dp)

        # Per-teacher for this date
        date_teacher_earnings = {}
        date_by_batch = {}
        for x in dp:
            bid = x.get("_batch_id", x.get("batch_id", "unassigned"))
            date_by_batch.setdefault(bid, []).append(x)

        for bid, bp in date_by_batch.items():
            bt = sum(x.get("amount", 0) for x in bp)
            tids = batch_map.get(bid, {}).get("teacher_ids", [])
            tc = len(tids)
            pt = round(bt / tc, 2) if tc > 0 else 0
            for tid in tids:
                t_doc = db.collection("users").document(tid).get()
                t_name = t_doc.to_dict().get("name", "Unknown") if t_doc.exists else "Unknown"
                if tid not in date_teacher_earnings:
                    date_teacher_earnings[tid] = {"name": t_name, "total": 0}
                date_teacher_earnings[tid]["total"] = round(
                    date_teacher_earnings[tid]["total"] + pt, 2
                )

        teachers = [
            {"uid": tid, "name": info["name"], "amount": info["total"]}
            for tid, info in date_teacher_earnings.items()
        ]
        teachers.sort(key=lambda t: t["amount"], reverse=True)

        date_results.append({
            "date": date_str,
            "total": date_total,
            "payments_count": len(dp),
            "teachers": teachers,
            "payments": dp,
            "settled": False,
        })

    # 5. Check for existing settlement snapshots
    snapshot_query = db.collection("distribution_snapshots") \
        .where("month", "==", month) \
        .where("year", "==", year)
    if batch_id:
        snapshot_query = snapshot_query.where("batch_id", "==", batch_id)

    settled_dates = {}
    for snap in snapshot_query.stream():
        sd = snap.to_dict()
        settled_dates[sd["date"]] = sd

    # Overlay snapshot data onto date results
    for dr in date_results:
        if dr["date"] in settled_dates:
            snap = settled_dates[dr["date"]]
            dr["settled"] = True
            dr["settled_at"] = snap.get("settled_at", "")
            # Only show this specific teacher's earnings from the snapshot
            snapshot_teachers = snap.get("teachers", [])
            my_share = next((t for t in snapshot_teachers if t.get("uid") == uid), None)
            
            # Reconstruct the teachers array for consistency, but only showing this teacher's locked amount
            # or all teachers if the UI expects it (the UI filters it itself)
            dr["teachers"] = snapshot_teachers
            dr["total"] = snap.get("total", dr["total"])

    # Build batch list for the filter dropdown
    return {
        "month": month,
        "year": year,
        "total_collected": total_collected,
        "my_total": my_total,
        "teacher_totals": teacher_totals,
        "dates": date_results,
        "batches": all_teacher_batches,
    }
