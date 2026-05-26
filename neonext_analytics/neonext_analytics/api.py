# =============================================================================
# neonext_analytics/neonext_analytics/api.py
#
# Every function decorated with @frappe.whitelist() is exposed at:
#   /api/method/neonext_analytics.neonext_analytics.api.<function_name>
#
# These run as the logged-in ERPNext user. frappe.get_list() and frappe.db
# automatically enforce that user's role permissions, so the dashboard never
# shows data the user is not allowed to see. There is no API key, no proxy,
# no credential storage — the framework handles auth.
# =============================================================================

from datetime import timedelta

import frappe
from frappe.utils import add_months, flt, getdate, today


# -----------------------------------------------------------------------------
# Date-range helper
# -----------------------------------------------------------------------------

def _date_range(date_range: str):
    """Return (start, end) dates for a named range."""
    end = getdate(today())

    if date_range == "today":
        return end, end

    if date_range == "this_week":
        # ISO weekday: Monday=0 .. Sunday=6; treat Sunday as week start
        offset = (end.weekday() + 1) % 7
        return end - timedelta(days=offset), end

    if date_range == "this_month":
        return end.replace(day=1), end

    if date_range == "this_quarter":
        q_start_month = ((end.month - 1) // 3) * 3 + 1
        return end.replace(month=q_start_month, day=1), end

    if date_range == "this_year":
        return end.replace(month=1, day=1), end

    # all_time (default)
    return getdate("2000-01-01"), end


# -----------------------------------------------------------------------------
# Dashboard summary — KPI cards
# -----------------------------------------------------------------------------

@frappe.whitelist()
def dashboard_summary(date_range: str = "this_month"):
    start, end = _date_range(date_range)

    # SUM via the query layer; limit_page_length=0 means no row cap, so totals
    # stay correct regardless of how many invoices exist.
    invoices = frappe.get_list(
        "Sales Invoice",
        filters={
            "posting_date": ["between", [start, end]],
            "docstatus": 1,
        },
        fields=["grand_total"],
        limit_page_length=0,
    )
    total_revenue = sum(flt(inv.grand_total) for inv in invoices)

    open_orders = frappe.db.count(
        "Sales Order",
        filters={
            "docstatus": 1,
            "status": ["in", ["To Deliver and Bill", "To Deliver", "To Bill"]],
        },
    )

    pending_invoices = frappe.db.count(
        "Sales Invoice",
        filters={"docstatus": 1, "status": ["in", ["Unpaid", "Overdue"]]},
    )

    total_customers = frappe.db.count("Customer")

    return {
        "totalRevenue": total_revenue,
        "openOrders": open_orders,
        "pendingInvoices": pending_invoices,
        "totalCustomers": total_customers,
    }


# -----------------------------------------------------------------------------
# Sales trend — monthly revenue
# -----------------------------------------------------------------------------

@frappe.whitelist()
def sales_trend(months: int = 12):
    months = int(months)
    start = add_months(today(), -months)

    rows = frappe.db.sql(
        """
        SELECT DATE_FORMAT(posting_date, '%%Y-%%m') AS month,
               SUM(grand_total)                     AS total
        FROM   `tabSales Invoice`
        WHERE  docstatus = 1
          AND  posting_date >= %(start)s
        GROUP BY month
        ORDER BY month
        """,
        {"start": start},
        as_dict=True,
    )
    return [{"month": r.month, "revenue": flt(r.total)} for r in rows]


# -----------------------------------------------------------------------------
# Top customers by revenue
# -----------------------------------------------------------------------------

@frappe.whitelist()
def top_customers(date_range: str = "this_month", limit: int = 10):
    start, end = _date_range(date_range)

    rows = frappe.db.sql(
        """
        SELECT customer         AS customer,
               SUM(grand_total) AS revenue
        FROM   `tabSales Invoice`
        WHERE  docstatus = 1
          AND  posting_date BETWEEN %(start)s AND %(end)s
        GROUP BY customer
        ORDER BY revenue DESC
        LIMIT  %(limit)s
        """,
        {"start": start, "end": end, "limit": int(limit)},
        as_dict=True,
    )
    return [{"customer": r.customer, "revenue": flt(r.revenue)} for r in rows]


# -----------------------------------------------------------------------------
# Recent invoices
# -----------------------------------------------------------------------------

@frappe.whitelist()
def recent_invoices(limit: int = 25):
    return frappe.get_list(
        "Sales Invoice",
        filters={"docstatus": 1},
        fields=[
            "name",
            "customer",
            "posting_date",
            "grand_total",
            "outstanding_amount",
            "status",
        ],
        order_by="posting_date desc",
        limit_page_length=int(limit),
    )


# -----------------------------------------------------------------------------
# Explorer — list doctypes the user may read
# -----------------------------------------------------------------------------

@frappe.whitelist()
def list_doctypes():
    doctypes = frappe.get_list(
        "DocType",
        fields=["name", "module"],
        filters={"istable": 0, "issingle": 0},
        order_by="module asc, name asc",
        limit_page_length=0,
    )
    # has_permission filters out doctypes the user cannot read.
    return [d for d in doctypes if frappe.has_permission(d["name"], "read")]


# -----------------------------------------------------------------------------
# Explorer — fetch records of a chosen doctype
# -----------------------------------------------------------------------------

@frappe.whitelist()
def doctype_records(doctype: str, fields: str = "name",
                    filters: str = None, limit: int = 50):
    import json

    if not frappe.has_permission(doctype, "read"):
        frappe.throw("You do not have permission to read this doctype.",
                     frappe.PermissionError)

    field_list = [f.strip() for f in fields.split(",") if f.strip()] or ["name"]
    if "name" not in field_list:
        field_list.insert(0, "name")

    parsed_filters = None
    if filters:
        try:
            parsed_filters = json.loads(filters)
        except (ValueError, TypeError):
            parsed_filters = None

    return frappe.get_list(
        doctype,
        fields=field_list,
        filters=parsed_filters,
        limit_page_length=min(int(limit), 200),
    )


# -----------------------------------------------------------------------------
# Explorer — list the displayable fields of a chosen doctype
# -----------------------------------------------------------------------------

@frappe.whitelist()
def doctype_fields(doctype: str):
    if not frappe.has_permission(doctype, "read"):
        frappe.throw("You do not have permission to read this doctype.",
                     frappe.PermissionError)

    # frappe.get_meta gives the doctype's field definitions. Skip layout-only
    # field types that carry no data.
    skip = {"Section Break", "Column Break", "Tab Break", "HTML",
            "Fold", "Heading", "Table", "Table MultiSelect"}
    meta = frappe.get_meta(doctype)

    fields = [{"fieldname": "name", "label": "ID", "fieldtype": "Data"}]
    for df in meta.fields:
        if df.fieldtype in skip or not df.fieldname:
            continue
        fields.append({
            "fieldname": df.fieldname,
            "label": df.label or df.fieldname,
            "fieldtype": df.fieldtype,
        })
    return fields
