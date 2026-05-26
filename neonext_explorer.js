frappe.pages["neonext-explorer"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("NeoNext Explorer"),
		single_column: true,
	});

	// --- State -------------------------------------------------------------
	const state = { doctype: null, fields: [], selected: [] };

	const $body = $('<div class="neonext-body"></div>').appendTo(page.main);
	$body.html(`
		<div class="neonext-card">
			<div class="neonext-card-title">${__("Pick a doctype, choose fields, browse records")}</div>
			<div class="row">
				<div class="col-md-5"><div class="neonext-doctype-field"></div></div>
				<div class="col-md-7"><div class="neonext-field-picker text-muted">${__("Select a doctype first.")}</div></div>
			</div>
		</div>
		<div class="neonext-card" style="margin-top:15px">
			<div class="neonext-card-title">${__("Records")}</div>
			<div class="neonext-results text-muted">${__("No doctype selected.")}</div>
		</div>
	`);

	// --- Doctype selector (autocomplete over allowed doctypes) -------------
	const doctype_field = frappe.ui.form.make_control({
		parent: $body.find(".neonext-doctype-field"),
		df: {
			fieldname: "doctype",
			label: __("Doctype"),
			fieldtype: "Autocomplete",
			options: [],
			change() {
				const val = doctype_field.get_value();
				if (val && val !== state.doctype) {
					state.doctype = val;
					load_fields($body, state);
				}
			},
		},
		render_input: true,
	});

	// Populate the autocomplete with only the doctypes the user may read.
	frappe.call({
		method: "neonext_analytics.neonext_analytics.api.list_doctypes",
		callback(r) {
			const opts = (r.message || []).map((d) => d.name);
			doctype_field.df.options = opts;
			doctype_field.set_data(opts);
		},
	});

	// --- Run button --------------------------------------------------------
	page.set_primary_action(__("Run"), () => {
		if (!state.doctype) {
			frappe.msgprint(__("Select a doctype first."));
			return;
		}
		load_records($body, state);
	}, "play");
};

// ---------------------------------------------------------------------------
// Load the field list for the chosen doctype
// ---------------------------------------------------------------------------
function load_fields($body, state) {
	const $picker = $body.find(".neonext-field-picker");
	$picker.html('<span class="text-muted">' + __("Loading fields…") + "</span>");

	frappe.call({
		method: "neonext_analytics.neonext_analytics.api.doctype_fields",
		args: { doctype: state.doctype },
		callback(r) {
			state.fields = r.message || [];
			// Default selection: first four fields.
			state.selected = state.fields.slice(0, 4).map((f) => f.fieldname);

			let html = `<label style="font-size:12px;color:var(--text-muted)">${__("Fields to show")}</label><div>`;
			state.fields.forEach((f) => {
				const checked = state.selected.includes(f.fieldname) ? "checked" : "";
				html += `
					<label style="display:inline-block;margin:2px 10px 2px 0;font-weight:normal">
						<input type="checkbox" class="neonext-field-cb" value="${frappe.utils.escape_html(f.fieldname)}" ${checked}>
						${frappe.utils.escape_html(f.label)}
					</label>`;
			});
			html += "</div>";
			$picker.html(html);

			$picker.find(".neonext-field-cb").on("change", function () {
				state.selected = $picker
					.find(".neonext-field-cb:checked")
					.map(function () { return $(this).val(); })
					.get();
			});
		},
		error() {
			$picker.html('<span class="text-danger">' +
				__("Could not load fields.") + "</span>");
		},
	});
}

// ---------------------------------------------------------------------------
// Fetch and render records
// ---------------------------------------------------------------------------
function load_records($body, state) {
	const $results = $body.find(".neonext-results");
	const fields = state.selected.length ? state.selected : ["name"];
	$results.html('<span class="text-muted">' + __("Loading records…") + "</span>");

	frappe.call({
		method: "neonext_analytics.neonext_analytics.api.doctype_records",
		args: { doctype: state.doctype, fields: fields.join(","), limit: 100 },
		callback(r) {
			const rows = r.message || [];
			if (!rows.length) {
				$results.html('<span class="text-muted">' +
					__("No records found.") + "</span>");
				return;
			}
			// Header from the field list (keeps a stable column order).
			const cols = fields.slice();
			if (!cols.includes("name")) cols.unshift("name");

			let html = '<table class="table table-bordered" style="margin-bottom:0"><thead><tr>';
			cols.forEach((c) => {
				html += `<th>${frappe.utils.escape_html(label_for(state, c))}</th>`;
			});
			html += "</tr></thead><tbody>";

			rows.forEach((row) => {
				html += "<tr>";
				cols.forEach((c) => {
					let val = row[c];
					if (val === null || val === undefined) val = "";
					html += `<td>${frappe.utils.escape_html(String(val))}</td>`;
				});
				html += "</tr>";
			});
			html += "</tbody></table>";
			$results.html(html);
		},
		error(err) {
			// A permission error from the backend lands here as a clean message.
			$results.html('<span class="text-danger">' +
				__("Could not load records (check your permissions).") + "</span>");
		},
	});
}

function label_for(state, fieldname) {
	const f = (state.fields || []).find((x) => x.fieldname === fieldname);
	return f ? f.label : fieldname;
}
