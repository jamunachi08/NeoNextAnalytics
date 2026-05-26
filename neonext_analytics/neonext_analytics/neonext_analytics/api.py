# Whitelisted backend methods for the NeoNext Analytics dashboard.
#
# Each function runs as the logged-in ERPNext user. frappe.get_list and
# frappe.db enforce that user's permissions automatically — no API key,
# no external service, no credential storage.
#
# Exposed at: /api/method/neonext_analytics.neonext_analytics.api.<name>

from datetime import timedelta

import frappe
from frappe.utils import add_months, flt, getdate, today


# --- Date-range helper -------------------------------------------------------

def _date_range(date_range):
    end = getdate(today())

    if date_range == "today":
        return end, end
    if date_range == "this_week":
        offset = (end.weekday() + 1) % 7
        return end - timedelta(days=offset), end
    if date_range == "this_month":
        return end.replace(day=1), end
    if date_range == "this_quarter":
        start_month = ((end.month - 1) // 3) * 3 + 1
        return end.replace(month=start_month, day=1), end
    if date_range == "this_year":
        return end.replace(month=1, day=1), end
    # all_time
    return getdate("2000-01-01"), end


# --- KPI summary -------------------------------------------------------------

@frappe.whitelist()
def dashboard_summary(date_range="this_month"):
    start, end = _date_range(date_range)

    invoices = frappe.get_list(
        "Sales Invoice",
        filters={"posting_date": ["between", [start, end]], "docstatus": 1},
        fields=["grand_total"],
        limit_page_length=0,
    )
    total_revenue = sum(flt(row.grand_total) for row in invoices)

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


# --- Sales trend -------------------------------------------------------------

@frappe.whitelist()
def sales_trend(months=12):
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


# --- Top customers -----------------------------------------------------------

@frappe.whitelist()
def top_customers(date_range="this_month", limit=10):
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


# --- Recent invoices ---------------------------------------------------------

@frappe.whitelist()
def recent_invoices(limit=25):
    return frappe.get_list(
        "Sales Invoice",
        filters={"docstatus": 1},
        fields=[
            "name", "customer", "posting_date",
            "grand_total", "outstanding_amount", "status",
        ],
        order_by="posting_date desc",
        limit_page_length=int(limit),
    )


# --- Explorer: list readable doctypes ---------------------------------------

@frappe.whitelist()
def list_doctypes():
    doctypes = frappe.get_list(
        "DocType",
        fields=["name"],
        filters={"istable": 0, "issingle": 0},
        order_by="name asc",
        limit_page_length=0,
    )
    return [d["name"] for d in doctypes if frappe.has_permission(d["name"], "read")]


# --- Explorer: fields of a doctype ------------------------------------------

@frappe.whitelist()
def doctype_fields(doctype):
    if not frappe.has_permission(doctype, "read"):
        frappe.throw("Not permitted to read this doctype.", frappe.PermissionError)

    skip = {
        "Section Break", "Column Break", "Tab Break", "HTML",
        "Fold", "Heading", "Table", "Table MultiSelect",
    }
    fields = [{"fieldname": "name", "label": "ID"}]
    for df in frappe.get_meta(doctype).fields:
        if df.fieldtype in skip or not df.fieldname:
            continue
        fields.append({"fieldname": df.fieldname, "label": df.label or df.fieldname})
    return fields


# --- Explorer: records of a doctype -----------------------------------------

@frappe.whitelist()
def doctype_records(doctype, fields="name", limit=50):
    if not frappe.has_permission(doctype, "read"):
        frappe.throw("Not permitted to read this doctype.", frappe.PermissionError)

    field_list = [f.strip() for f in fields.split(",") if f.strip()] or ["name"]
    if "name" not in field_list:
        field_list.insert(0, "name")

    return frappe.get_list(
        doctype,
        fields=field_list,
        limit_page_length=min(int(limit), 200),
    )
