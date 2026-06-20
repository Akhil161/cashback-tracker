import json, math

card_id = "sbi_cashback_2620"

card = {
    "id": card_id,
    "bankName": "SBI Cashback",
    "last4": "2620",
    "rewardType": "cashback",
    "rewardPercent": 5,
    "roundingMode": "floor"          # ← floor rounding applied
}

def cb(amount):
    return math.floor(amount * 5 / 100)   # 5% floor

def make_id(n):
    return f"txn_{n:03d}_{card_id}"

# ── ALL 25 BILLED transactions — DreamPlug/CRED now hasCashback=True ──
# (status='billed' is the default)
billed = [
    # date           merchant                      category        amount
    ("2026-05-20", "CRED via DreamPlug",           "Other",         950.00),
    ("2026-05-20", "MakeMyTrip / GoIbibo",         "Travel",        625.61),
    ("2026-05-20", "MakeMyTrip / GoIbibo",         "Travel",       1061.40),
    ("2026-05-20", "Amazon",                       "Online",        304.00),
    ("2026-05-21", "Zepto",                        "Groceries",     365.00),
    ("2026-05-28", "Porter",                       "Travel",        500.00),
    ("2026-06-01", "Zepto",                        "Groceries",     208.00),
    ("2026-06-05", "Swiggy",                       "Food & Dining",1078.00),
    ("2026-06-08", "Swiggy",                       "Food & Dining", 262.00),
    ("2026-06-08", "Swiggy",                       "Food & Dining",1411.00),
    ("2026-06-09", "Blinkit",                      "Groceries",     173.00),
    ("2026-06-10", "MakeMyTrip / GoIbibo",         "Travel",        440.37),
    ("2026-06-10", "MakeMyTrip / GoIbibo",         "Travel",        626.85),
    ("2026-06-10", "Blinkit",                      "Groceries",     181.00),
    ("2026-06-10", "Uber",                         "Travel",        118.79),
    ("2026-06-11", "Blinkit",                      "Groceries",     250.00),
    ("2026-06-11", "MakeMyTrip / GoIbibo",         "Travel",       1512.00),
    ("2026-06-11", "Blinkit",                      "Groceries",     164.00),
    ("2026-06-12", "CRED via DreamPlug",           "Other",         950.00),
    ("2026-06-13", "CRED via DreamPlug",           "Other",         980.00),
    ("2026-06-14", "Uber",                         "Travel",        427.51),
    ("2026-06-15", "Blinkit",                      "Groceries",      84.00),
    ("2026-06-16", "CRED via DreamPlug",           "Other",         980.00),
    ("2026-06-16", "Amazon",                       "Online",        553.00),
    ("2026-06-18", "CRED via DreamPlug",           "Other",         980.00),
]

# ── 2 UNBILLED transactions from SBI app screenshot ──
unbilled = [
    ("2026-06-19", "Amazon",  "Online", 1004.00),
    ("2026-06-19", "Amazon",  "Online",  490.00),
]

transactions = []
for i, (date, merchant, category, amount) in enumerate(billed, 1):
    earned = cb(amount)
    transactions.append({
        "id": make_id(i),
        "cardId": card_id,
        "amount": amount,
        "merchant": merchant,
        "category": category,
        "date": date,
        "notes": "",
        "hasCashback": True,
        "billingStatus": "billed",
        "rewardEarned": earned,
        "rewardValue": earned
    })

for i, (date, merchant, category, amount) in enumerate(unbilled, len(billed)+1):
    earned = cb(amount)
    transactions.append({
        "id": make_id(i),
        "cardId": card_id,
        "amount": amount,
        "merchant": merchant,
        "category": category,
        "date": date,
        "notes": "ASSPL 560055 IN — unbilled",
        "hasCashback": True,
        "billingStatus": "unbilled",
        "rewardEarned": earned,
        "rewardValue": earned
    })

# ── Cashback figures from SBI app ──
billed_auto_calc  = sum(t["rewardEarned"] for t in transactions if t["billingStatus"] == "billed")
unbilled_auto_calc= sum(t["rewardEarned"] for t in transactions if t["billingStatus"] == "unbilled")
stmt_actual       = 663    # SBI statement — this billing cycle
year_actual       = 5572   # SBI app — 2026 year total
lifetime          = 42765  # SBI app — all time

# Annual record = year total − this statement's actual (other months Jan–May cycles)
annual_prev = year_actual - stmt_actual   # 4909

previous_records = [
    {
        "id": "prev_sbi_2026_annual",
        "cardId": card_id,
        "recordType": "annual",
        "monthKey": None,
        "year": 2026,
        "rewardAmount": float(annual_prev),
        "rewardValue":  float(annual_prev),
        "notes": f"2026 cashback from Jan–May statement cycles (SBI app year total ₹{year_actual} − this stmt ₹{stmt_actual}). Lifetime total: ₹{lifetime}",
        "createdAt": "2026-06-19T00:00:00.000Z"
    }
]

data = {
    "version": 2,
    "exportedAt": "2026-06-19T00:00:00.000Z",
    "cards": [card],
    "transactions": transactions,
    "previousRecords": previous_records
}

out = "/sessions/modest-wizardly-ride/mnt/outputs/cashback-tracker/assets/sbi_import.json"
with open(out, "w") as f:
    json.dump(data, f, indent=2)

# ── Report ──
print("═"*56)
print("  SBI CASHBACK IMPORT  (5% Floor · All merchants ✓)")
print("═"*56)
cred_txns = [t for t in transactions if "DreamPlug" in t["merchant"] and t["billingStatus"]=="billed"]
print(f"  Billed transactions : {len(billed)}  (incl. {len(cred_txns)} CRED/DreamPlug)")
print(f"  Unbilled transactions: {len(unbilled)}  (Amazon, Jun 19)")
print()
print(f"  Billed auto-calc CB : ₹{billed_auto_calc}  (5% floor each txn)")
print(f"  CRED/DreamPlug CB   : ₹{sum(t['rewardEarned'] for t in cred_txns)}  (was ₹0 before)")
print(f"  Unbilled pending CB : ₹{unbilled_auto_calc}  (⏳ not counted in total)")
print()
print(f"  SBI statement actual: ₹{stmt_actual}  (official credited)")
print(f"  Annual 2026 record  : ₹{annual_prev}  (Jan–May cycles)")
print(f"  ──────────────────────────────────────────────")
print(f"  Year total in app   : ₹{billed_auto_calc + annual_prev}  (auto + prev record)")
print(f"  SBI year total      : ₹{year_actual}")
print(f"  Lifetime (note)     : ₹{lifetime}")
print("═"*56)
