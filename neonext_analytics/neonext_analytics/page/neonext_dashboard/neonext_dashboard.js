frappe.pages["neonext-dashboard"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("NeoNext Analytics"),
		single_column: true,
	});

	// Mount point for everything we render.
	const $body = $('<div class="neonext-body"></div>').appendTo(page.main);

	// Period selector in the page toolbar.
	const range_field = page.add_field({
		fieldname: "date_range",
		label: __("Period"),
		fieldtype: "Select",
		options: [
			{ value: "this_month", label: __("This Month") },
			{ value: "this_quarter", label: __("This Quarter") },
			{ value: "this_year", label: __("This Year") },
			{ value: "all_time", label: __("All Time") },
		],
		default: "this_month",
		change() {
			render_all($body, range_field.get_value() || "this_month");
		},
	});

	page.set_primary_action(__("Refresh"), () => {
		render_all($body, range_field.get_value() || "this_month");
	}, "refresh");

	// Secondary button: jump to the Explorer page.
	page.add_inner_button(__("Open Explorer"), () => {
		frappe.set_route("neonext-explorer");
	});

	render_all($body, "this_month");
};

// ---------------------------------------------------------------------------
// Top-level render
// ---------------------------------------------------------------------------
function render_all($body, date_range) {
	$body.html(`
		<div class="neonext-kpis row"></div>
		<div class="row" style="margin-top:15px">
			<div class="col-md-7">
				<div class="neonext-card">
					<div class="neonext-card-title">${__("Sales Trend")}</div>
					<div id="neonext-chart-sales"></div>
				</div>
			</div>
			<div class="col-md-5">
				<div class="neonext-card">
					<div class="neonext-card-title">${__("Top Customers")}</div>
					<div id="neonext-chart-customers"></div>
				</div>
			</div>
		</div>
		<div class="neonext-card" style="margin-top:15px">
			<div class="neonext-card-title">${__("Recent Invoices")}</div>
			<div id="neonext-invoices"></div>
		</div>
	`);

	render_kpis($body.find(".neonext-kpis"), date_range);
	render_sales_trend();
	render_top_customers(date_range);
	render_recent_invoices();
}

// ---------------------------------------------------------------------------
// KPI cards
// ---------------------------------------------------------------------------
function render_kpis($target, date_range) {
	$target.html('<div class="text-muted" style="padding:10px">' + __("Loading…") + "</div>");

	frappe.call({
		method: "neonext_analytics.neonext_analytics.api.dashboard_summary",
		args: { date_range: date_range },
		callback(r) {
			const k = r.message || {};
			$target.html(
				kpi_card(__("Revenue"), format_currency(k.totalRevenue || 0)) +
				kpi_card(__("Open Orders"), cint(k.openOrders)) +
				kpi_card(__("Pending Invoices"), cint(k.pendingInvoices)) +
				kpi_card(__("Customers"), cint(k.totalCustomers))
			);
		},
		error() {
			$target.html('<div class="text-danger" style="padding:10px">' +
				__("Could not load summary. Check your permissions.") + "</div>");
		},
	});
}

function kpi_card(label, value) {
	return `
		<div class="col-sm-3 col-xs-6">
			<div class="neonext-kpi">
				<div class="neonext-kpi-label">${frappe.utils.escape_html(label)}</div>
				<div class="neonext-kpi-value">${frappe.utils.escape_html(String(value))}</div>
			</div>
		</div>`;
}

// ---------------------------------------------------------------------------
// Sales trend line chart
// ---------------------------------------------------------------------------
function render_sales_trend() {
	frappe.call({
		method: "neonext_analytics.neonext_analytics.api.sales_trend",
		args: { months: 12 },
		callback(r) {
			const data = r.message || [];
			// frappe.Chart ships with the desk — no external chart library needed.
			new frappe.Chart("#neonext-chart-sales", {
				type: "line",
				height: 260,
				colors: ["#5e64ff"],
				data: {
					labels: data.map((d) => d.month),
					datasets: [{ name: __("Revenue"), values: data.map((d) => d.revenue) }],
				},
				lineOptions: { regionFill: 1, hideDots: 0 },
			});
		},
	});
}

// ---------------------------------------------------------------------------
// Top customers bar chart
// ---------------------------------------------------------------------------
function render_top_customers(date_range) {
	frappe.call({
		method: "neonext_analytics.neonext_analytics.api.top_customers",
		args: { date_range: date_range, limit: 8 },
		callback(r) {
			const data = r.message || [];
			new frappe.Chart("#neonext-chart-customers", {
				type: "bar",
				height: 260,
				colors: ["#00a3b1"],
				data: {
					labels: data.map((d) => d.customer),
					datasets: [{ name: __("Revenue"), values: data.map((d) => d.revenue) }],
				},
			});
		},
	});
}

// ---------------------------------------------------------------------------
// Recent invoices table
// ---------------------------------------------------------------------------
function render_recent_invoices() {
	const $t = $("#neonext-invoices");
	$t.html('<div class="text-muted">' + __("Loading…") + "</div>");

	frappe.call({
		method: "neonext_analytics.neonext_analytics.api.recent_invoices",
		args: { limit: 25 },
		callback(r) {
			const rows = r.message || [];
			if (!rows.length) {
				$t.html('<div class="text-muted">' + __("No invoices found.") + "</div>");
				return;
			}
			let html = `
				<table class="table table-bordered" style="margin-bottom:0">
					<thead><tr>
						<th>${__("Invoice")}</th>
						<th>${__("Customer")}</th>
						<th>${__("Date")}</th>
						<th class="text-right">${__("Total")}</th>
						<th class="text-right">${__("Outstanding")}</th>
						<th>${__("Status")}</th>
					</tr></thead><tbody>`;
			rows.forEach((row) => {
				const link = `/app/sales-invoice/${encodeURIComponent(row.name)}`;
				html += `<tr>
					<td><a href="${link}">${frappe.utils.escape_html(row.name)}</a></td>
					<td>${frappe.utils.escape_html(row.customer || "")}</td>
					<td>${frappe.datetime.str_to_user(row.posting_date) || ""}</td>
					<td class="text-right">${format_currency(row.grand_total || 0)}</td>
					<td class="text-right">${format_currency(row.outstanding_amount || 0)}</td>
					<td>${frappe.utils.escape_html(row.status || "")}</td>
				</tr>`;
			});
			html += "</tbody></table>";
			$t.html(html);
		},
		error() {
			$t.html('<div class="text-danger">' + __("Could not load invoices.") + "</div>");
		},
	});
}
