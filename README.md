# NeoNext Analytics

A native **Frappe app** that adds an analytics dashboard to ERPNext. It
installs *inside* your existing ERPNext site and reads data directly through
the Frappe ORM — no API keys, no external service, no separate database.

Once installed, two pages appear in the desk:

**NeoNext Analytics** — the dashboard:

- KPI cards: revenue, open orders, pending invoices, customer count
- A 12-month sales trend line chart
- A top-customers bar chart
- A recent-invoices table
- A period filter (this month / quarter / year / all time)

**NeoNext Explorer** — an ad-hoc data browser:

- Pick any doctype you have permission to read
- Choose which fields to display
- Browse up to 100 records in a table

Because both pages run as the logged-in user, every screen automatically
respects ERPNext's permission model — users see only the data their roles
allow, and the Explorer only lists doctypes they may read.

---

## Requirements

- A working **bench** with **Frappe** and **ERPNext** (version 15 or 16).
- Shell access to the bench, or the ability to place a folder in `apps/`.

---

## Installation

### Option A — drop-in folder (this package)

1. Copy the `neonext_analytics/` folder into your bench's `apps/` directory:

   ```
   frappe-bench/
     apps/
       frappe/
       erpnext/
       neonext_analytics/   <-- here
   ```

2. Register the app with the bench's Python environment and install it:

   ```bash
   cd ~/frappe-bench
   ./env/bin/pip install -e apps/neonext_analytics
   bench --site your-site.localhost install-app neonext_analytics
   bench build --app neonext_analytics
   bench --site your-site.localhost migrate
   bench --site your-site.localhost clear-cache
   ```

   Then restart the bench (`bench restart`, or restart your dev server).

   > A convenience script, `install.sh`, runs the four commands above.
   > Edit the SITE variable at the top of it first.

### Option B — fetch as a git app (if you push this to a repo)

```bash
cd ~/frappe-bench
bench get-app neonext_analytics /path/or/git/url
bench --site your-site.localhost install-app neonext_analytics
```

---

## After installing

1. In ERPNext, the pages are available from the awesome bar (search
   "NeoNext") or directly at `/app/neonext-dashboard` and
   `/app/neonext-explorer`. The dashboard also has an **Open Explorer**
   button.
2. The app ships a role called **NeoNext Viewer**. Assign it to any user who
   should see the dashboard (Users with *Accounts Manager* or *Sales Manager*
   already have access — see the page's role list).
3. A user without one of those roles cannot open the page **and** cannot call
   its API methods. The framework blocks both. There is no token to manage.

---

## What's inside

```
neonext_analytics/
  pyproject.toml              build metadata
  license.txt
  install.sh                  convenience installer
  neonext_analytics/
    __init__.py               app version
    hooks.py                  app registration (assets, role fixture)
    modules.txt               declares the "NeoNext Analytics" module
    patches.txt               (empty) DB migration patches
    neonext_analytics/
      api.py                  whitelisted backend methods
      page/neonext_dashboard/
        neonext_dashboard.json  desk page definition + role access
        neonext_dashboard.js    dashboard UI (KPIs, charts, table)
      page/neonext_explorer/
        neonext_explorer.json   explorer page definition + role access
        neonext_explorer.js     explorer UI (doctype + field picker, table)
    public/css/
      neonext.css             card + layout styling
```

---

## Extending it

- **New metrics:** add a `@frappe.whitelist()` function to `api.py`, then call
  it from `neonext_dashboard.js` with `frappe.call(...)`.
- **New pages:** scaffold with `bench --site your-site make-page` (developer
  mode on), or copy the `page/neonext_dashboard/` folder as a template.
- **DocTypes:** if you later need to store data, create DocTypes under the
  module — Frappe writes them as JSON in this app folder when developer mode
  is enabled.

Prefer grouped SQL (`frappe.db.sql` with `GROUP BY`) over fetching rows and
summing them in Python — it stays correct and fast at any data volume.

---

## License

MIT — see `license.txt`.
