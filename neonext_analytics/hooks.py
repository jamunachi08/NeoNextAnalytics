app_name = "neonext_analytics"
app_title = "NeoNext Analytics"
app_publisher = "Your Company"
app_description = "ERPNext data visualization dashboard, native Frappe app"
app_email = "dev@yourcompany.com"
app_license = "MIT"

# version-15 / version-16 compatible
required_apps = ["frappe", "erpnext"]

# -----------------------------------------------------------------------------
# Desk assets
# -----------------------------------------------------------------------------
# A small CSS file that styles the KPI cards. The dashboard page itself loads
# its own JS via the page folder, so no app_include_js is needed here.
app_include_css = "/assets/neonext_analytics/css/neonext.css"

# -----------------------------------------------------------------------------
# Fixtures — ship the custom role with the app so reinstalls recreate it
# -----------------------------------------------------------------------------
fixtures = [
    {"dt": "Role", "filters": [["role_name", "in", ["NeoNext Viewer"]]]},
]

# -----------------------------------------------------------------------------
# NOTE: There is deliberately NO api_key / api_secret / external ERPNext URL
# anywhere in this app. A native Frappe app runs *inside* ERPNext and reads
# data directly through frappe.get_list / frappe.db. It automatically inherits:
#   - the logged-in user's session  (no separate login)
#   - the ERPNext permission model  (users see only what they may see)
#   - CSRF protection on every whitelisted endpoint
# -----------------------------------------------------------------------------
