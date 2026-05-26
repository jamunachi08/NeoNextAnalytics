frappe.pages["neonext-explorer"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("NeoNext Explorer"),
		single_column: true,
	});

	const state = { doctype: null, fields: [], selected: [] };

	const $body = $('<div class="neonext-body"></div>').appendTo(page.main);
	$body.html(`
		<div class="neonext-card">
			<div class="neonext-card-title">${__("Pick a doctype, choose fields, then Run")}</div>
			<div class="row">
				<div class="col-md-5"><div class="neonext-doctype-field"></div></div>
				<div class="col-md-7"><div class="neonext-field-picker neonext-muted">${__("Select a doctype first.")}</div></div>
			</div>
		</div>
		<div class="neonext-card neonext-results-card">
			<div class="neonext-card-title">${__("Records")}</div>
			<div class="neonext-results neonext-muted">${__("No doctype selected.")}</div>
		</div>
	`);

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

	frappe.call({
		method: "neonext_analytics.neonext_analytics.api.list_doctypes",
		callback(r) {
			const opts = r.message || [];
			doctype_field.df.options = opts;
			doctype_field.set_data(opts);
		},
	});

	page.set_primary_action(__("Run"), () => {
		if (!state.doctype) {
			frappe.msgprint(__("Select a doctype first."));
			return;
		}
		load_records($body, state);
	}, "play");
};

function load_fields($body, state) {
	const $picker = $body.find(".neonext-field-picker");
	$picker.html(`<span class="neonext-muted">${__("Loading fields…")}</span>`);

	frappe.call({
		method: "neonext_analytics.neonext_analytics.api.doctype_fields",
		args: { doctype: state.doctype },
		callback(r) {
			state.fields = r.message || [];
			state.selected = state.fields.slice(0, 4).map((f) => f.fieldname);

			let html = `<label class="neonext-picker-label">${__("Fields to show")}</label><div class="neonext-field-list">`;
			state.fields.forEach((f) => {
				const checked = state.selected.includes(f.fieldname) ? "checked" : "";
				html += `
					<label class="neonext-field-option">
						<input type="checkbox" class="neonext-field-cb" value="${frappe.utils.escape_html(f.fieldname)}" ${checked}>
						${frappe.utils.escape_html(f.label)}
					</label>`;
			});
			html += "</div>";
			$picker.html(html);

			$picker.find(".neonext-field-cb").on("change", function () {
				state.selected = $picker.find(".neonext-field-cb:checked")
					.map(function () { return $(this).val(); }).get();
			});
		},
		error() {
			$picker.html(`<span class="neonext-error">${__("Could not load fields.")}</span>`);
		},
	});
}

function load_records($body, state) {
	const $results = $body.find(".neonext-results");
	const fields = state.selected.length ? state.selected : ["name"];
	$results.html(`<span class="neonext-muted">${__("Loading records…")}</span>`);

	frappe.call({
		method: "neonext_analytics.neonext_analytics.api.doctype_records",
		args: { doctype: state.doctype, fields: fields.join(","), limit: 100 },
		callback(r) {
			const rows = r.message || [];
			if (!rows.length) {
				$results.html(`<span class="neonext-empty">${__("No records found.")}</span>`);
				return;
			}
			const cols = fields.slice();
			if (!cols.includes("name")) cols.unshift("name");

			let html = '<table class="table table-bordered neonext-table"><thead><tr>';
			cols.forEach((c) => {
				html += `<th>${frappe.utils.escape_html(label_for(state, c))}</th>`;
			});
			html += "</tr></thead><tbody>";
			rows.forEach((row) => {
				html += "<tr>";
				cols.forEach((c) => {
					let v = row[c];
					if (v === null || v === undefined) v = "";
					html += `<td>${frappe.utils.escape_html(String(v))}</td>`;
				});
				html += "</tr>";
			});
			html += "</tbody></table>";
			$results.html(html);
		},
		error() {
			$results.html(`<span class="neonext-error">${__("Could not load records — check your permissions.")}</span>`);
		},
	});
}

function label_for(state, fieldname) {
	const f = (state.fields || []).find((x) => x.fieldname === fieldname);
	return f ? f.label : fieldname;
}
