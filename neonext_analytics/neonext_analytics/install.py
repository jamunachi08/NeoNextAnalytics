# Runs after `install-app`. Ensures the role exists and the desk pages and
# workspace are synced, so the app is visible right away.

import frappe


def after_install():
    _ensure_role()
    _sync("page", "neonext_dashboard")
    _sync("page", "neonext_explorer")
    _sync("workspace", "neonext_analytics")
    frappe.db.commit()
    frappe.clear_cache()


def _ensure_role():
    if not frappe.db.exists("Role", "NeoNext Viewer"):
        role = frappe.new_doc("Role")
        role.role_name = "NeoNext Viewer"
        role.desk_access = 1
        role.insert(ignore_permissions=True)


def _sync(kind, name):
    """Re-import a Page or Workspace JSON from the app folder."""
    from frappe.modules.import_file import import_file_by_path

    app_path = frappe.get_app_path("neonext_analytics")
    path = f"{app_path}/neonext_analytics/{kind}/{name}/{name}.json"
    try:
        import_file_by_path(path, force=True)
    except Exception:
        # Non-fatal: a later `bench migrate` will still pick it up.
        frappe.log_error(
            title="NeoNext Analytics: sync skipped",
            message=f"Could not import {path}",
        )
