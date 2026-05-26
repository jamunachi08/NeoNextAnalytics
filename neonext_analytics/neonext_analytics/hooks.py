app_name = "neonext_analytics"
app_title = "NeoNext Analytics"
app_publisher = "Your Company"
app_description = "ERPNext analytics dashboard — native Frappe app"
app_email = "dev@yourcompany.com"
app_license = "MIT"

# Frappe/ERPNext version 15 and 16 compatible.
required_apps = ["frappe", "erpnext"]

# --- Desk assets -------------------------------------------------------------
# Styling for the dashboard cards. The page JS is loaded automatically by
# Frappe from each page folder, so no app_include_js is needed.
app_include_css = "/assets/neonext_analytics/css/neonext.css"

# --- Fixtures ----------------------------------------------------------------
# Ship the role, the desk pages, and the workspace with the app so every
# install / migrate recreates them. The Workspace is what makes the app
# visible in the ERPNext sidebar.
fixtures = [
    {"dt": "Role", "filters": [["role_name", "in", ["NeoNext Viewer"]]]},
    {"dt": "Workspace", "filters": [["module", "=", "NeoNext Analytics"]]},
    {"dt": "Page", "filters": [["module", "=", "NeoNext Analytics"]]},
]

# --- Install hook ------------------------------------------------------------
# Runs once after the app is installed on a site. It syncs the pages and the
# workspace so the app appears immediately, without a separate migrate step.
after_install = "neonext_analytics.install.after_install"
