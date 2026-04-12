import contextvars
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

_read_count_state = contextvars.ContextVar("_read_count_state", default=None)
_is_patched = False

def increment_reads(amount=1):
    state = _read_count_state.get()
    if state is not None:
        state[0] += amount

def get_read_count():
    state = _read_count_state.get()
    return state[0] if state is not None else 0

def reset_read_count():
    _read_count_state.set([0])

def patch_firestore_reads():
    global _is_patched
    if _is_patched:
        return
    _is_patched = True

    try:
        from google.cloud.firestore_v1.document import DocumentReference
        from google.cloud.firestore_v1.query import Query
        from google.cloud.firestore_v1.aggregation import AggregationQuery
        from google.cloud.firestore_v1.client import Client

        # 1. DocumentReference.get
        original_doc_get = DocumentReference.get
        def patched_doc_get(self, *args, **kwargs):
            increment_reads(1)
            return original_doc_get(self, *args, **kwargs)
        DocumentReference.get = patched_doc_get

        # 2. Query.stream
        original_query_stream = Query.stream
        def patched_query_stream(self, *args, **kwargs):
            generator = original_query_stream(self, *args, **kwargs)
            for doc in generator:
                increment_reads(1)
                yield doc
        Query.stream = patched_query_stream

        # 3. Query.get
        # In cloud-firestore python SDK, Query.get internally uses .stream().
        # So we skip patching it to avoid double counting.

        # 4. AggregationQuery.get
        original_agg_get = AggregationQuery.get
        def patched_agg_get(self, *args, **kwargs):
            increment_reads(1)
            return original_agg_get(self, *args, **kwargs)
        AggregationQuery.get = patched_agg_get

        # 5. Client.get_all
        original_get_all = Client.get_all
        def patched_get_all(self, references, *args, **kwargs):
            generator = original_get_all(self, references, *args, **kwargs)
            for doc in generator:
                increment_reads(1)
                yield doc
        Client.get_all = patched_get_all

        print("[*] Firestore patched for read logging.")
    except ImportError as e:
        print(f"Could not patch firestore: {e}")

class ReadLoggerMiddleware(BaseHTTPMiddleware):
    # Mapping of API paths to human-readable names
    # Note: These are prefix or exact matches
    ACTION_MAP = {
        # Admin Actions
        ("GET", "/api/admin/stats"): "Dashboard Stats",
        ("GET", "/api/admin/pending"): "Fetch Pending Payments",
        ("PUT", "/api/admin/approve"): "Approve Payment",
        ("PUT", "/api/admin/reject"): "Reject Payment",
        ("DELETE", "/api/admin/users/"): "Delete User Session",
        ("DELETE", "/api/admin/user/"): "Delete User Profile Pic",
        ("GET", "/api/admin/batches"): "Fetch Batches",
        ("POST", "/api/admin/batches"): "Create Batch",
        ("PUT", "/api/admin/batches"): "Update Batch",
        ("DELETE", "/api/admin/batches"): "Delete Batch",
        ("GET", "/api/admin/students"): "Fetch Students",
        ("POST", "/api/admin/students"): "Add Student",
        ("PUT", "/api/admin/students/status"): "Update Student Status",
        ("PUT", "/api/admin/students"): "Update Student",
        ("GET", "/api/admin/teachers"): "Fetch Teachers",
        ("POST", "/api/admin/teachers"): "Add Teacher",
        ("PUT", "/api/admin/teachers"): "Update Teacher",
        ("DELETE", "/api/admin/teachers"): "Delete Teacher",
        ("POST", "/api/admin/generate-monthly"): "Generate Monthly Fees",
        ("POST", "/api/admin/undo-monthly"): "Undo Monthly Generation",
        ("POST", "/api/admin/fee-override"): "Override Student Fee",
        ("GET", "/api/admin/payments"): "Fetch All Payments",
        ("GET", "/api/admin/distribution"): "Fetch Revenue Distribution",
        ("POST", "/api/admin/settle-distribution"): "Settle Distribution",
        ("GET", "/api/admin/backup"): "Export PDF Backup",
        ("GET", "/api/admin/report-export"): "Export Collection & Distribution Report",
        ("POST", "/api/admin/seed"): "Seed Default Admin",

        # Teacher Actions
        ("GET",  "/api/teacher/batches"):          "Teacher: View My Batches",
        ("GET",  "/api/teacher/all-payments"):     "Teacher: Fetch Data Table (Optimized)",
        ("GET",  "/api/teacher/payments"):         "Teacher: View Batch Payments (Dashboard)",
        ("GET",  "/api/teacher/student-dues/"):    "Teacher: View Student Dues",
        ("POST", "/api/teacher/offline-request"):  "Teacher: Submit Offline Cash",
        ("GET",  "/api/teacher/distribution"):     "Teacher: View Revenue Distribution",

        # Student Actions
        ("GET",   "/api/student/payments"):                         "Student: My Payments",
        ("POST",  "/api/student/payments/"):                        "Student: Upload Screenshot",
        ("POST",  "/api/student/payments/"):                        "Student: Acknowledge Rejection",
        ("GET",   "/api/student/upi-link"):                         "Student: Get UPI Deep-Link",
        ("GET",   "/api/student/leaderboard"):                      "Student: Fetch Leaderboard",
        ("PATCH", "/api/student/badge-celebrated"):                 "Student: Dismiss Badge Animation",
    }

    def get_action_name(self, method: str, path: str) -> str:
        # Check exact or prefix match
        for (m, p), name in self.ACTION_MAP.items():
            if method == m and path.startswith(p):
                return name
        return "Unknown Action"

    async def dispatch(self, request: Request, call_next):
        # Ignore OPTIONS preflight completely for logging
        if request.method == "OPTIONS":
            return await call_next(request)

        # Log for Admin, Teacher, Student
        path = request.url.path
        if path.startswith("/api/admin") or path.startswith("/api/teacher") or path.startswith("/api/student"):
            reset_read_count()
            response = await call_next(request)
            
            reads = get_read_count()
            action = self.get_action_name(request.method, path)
            
            # Use role context for prefixing
            prefix = "ADMIN"
            if path.startswith("/api/teacher"): prefix = "TEACHER"
            elif path.startswith("/api/student"): prefix = "STUDENT"

            print(f"=====================================")
            print(f"[{prefix} READ LOG: {action}]")
            print(f"{request.method} {path} -> {reads} Firestore Reads")
            print(f"=====================================")
            
            return response
        else:
            return await call_next(request)
