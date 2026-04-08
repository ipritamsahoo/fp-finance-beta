import asyncio
from datetime import datetime, timedelta
from database import db
from notifications import notify_user
from utils import IST

def send_daily_due_reminders():
    """Send a notification to any student who has an 'Unpaid' fee."""
    try:
        # Query all Unpaid payments
        unpaid_payments = db.collection("payments").where("status", "==", "Unpaid").stream()
        
        # student_id -> list of (month, year)
        student_dues = {}
        MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", 
                      "July", "August", "September", "October", "November", "December"]
        
        for p in unpaid_payments:
            data = p.to_dict()
            uid = data.get("student_id")
            m = data.get("month")
            y = data.get("year")
            if uid and m:
                if uid not in student_dues:
                    student_dues[uid] = []
                student_dues[uid].append((m, y))
        
        for student_id, dues in student_dues.items():
            # Sort by year then month
            dues.sort(key=lambda x: (x[1], x[0]))
            
            # Format month string
            if len(dues) == 1:
                m, y = dues[0]
                month_text = f"{MONTH_NAMES[m]} {y}"
            else:
                # If multiple months, list them
                month_text = ", ".join([MONTH_NAMES[d[0]] for d in dues])

            notify_user(
                uid=student_id,
                message=f"Your fee for {month_text} is still pending. Please complete the payment via the app.",
                notif_type="due_reminder",
                title="Payment Reminder 🕒"
            )
                
        print(f"🔔 [Scheduler] Sent daily due reminders to {len(student_dues)} students.")
    except Exception as e:
        print(f"❌ [Scheduler] Error sending daily due reminders: {e}")

async def run_scheduler():
    """Background task for testing: runs every 20 seconds."""
    print("🧪 [Scheduler] TEST MODE ENABLED: Sending reminders every 20 seconds!")
    
    while True:
        now = datetime.now(IST)
        target = now.replace(hour=10, minute=0, second=0, microsecond=0)
        if now >= target:
            target += timedelta(days=1)
        wait_seconds = (target - now).total_seconds()
        print(f"⏳ [Scheduler] Next due reminder scheduled in {wait_seconds / 3600:.2f} hours (at {target.strftime('%d-%b-%Y %H:%M %p')} IST).")
        await asyncio.sleep(wait_seconds)
        await asyncio.to_thread(send_daily_due_reminders)

    
