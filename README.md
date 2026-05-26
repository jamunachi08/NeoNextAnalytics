# NeoNext Analytics

A clean, native **Frappe app** that adds a sales analytics dashboard and an
ad-hoc data explorer to ERPNext.

Once installed, a **NeoNext Analytics** entry appears in the ERPNext sidebar
with two pages:

- **NeoNext Dashboard** — KPI cards (revenue, open orders, pending invoices,
  customers), a 12-month sales trend chart, a top-customers chart, a recent
  invoices table, and a period filter.
- **NeoNext Explorer** — pick any doctype you can read, choose which fields
  to show, and browse the records.

Both pages run as the logged-in user, so they automatically respect
ERPNext's permission model. There are no API keys, no external services, and
no DocTypes — the app is built entirely from desk pages and a workspace.

Compatible with Frappe / ERPNext **v15 and v16**.

---

## Install on Frappe Cloud (recommended)

Frappe Cloud installs apps from a **Git repository** — not from a zip. There
is no folder-drop or upload option.

**1. Push this app to a GitHub repository.**
The repository root must contain `pyproject.toml` and the `neonext_analytics/`
folder directly:

```
your-repo/
  pyproject.toml
  neonext_analytics/
  README.md
  license.txt
```

```bash
git init
git add .
git commit -m "NeoNext Analytics"
git branch -M main
git remote add origin https://github.com/<you>/neonext_analytics.git
git push -u origin main
```

**2. Add the app to your bench.**
Frappe Cloud → open your **Bench** → **Apps** tab → **Add App** → **GitHub**
→ pick the repo and `main` branch. For a private repo, authorize the Frappe
Cloud GitHub app on it when prompted.

**3. Deploy.**
Frappe Cloud shows a pending deploy → click **Deploy / Update** and wait for
the build.

**4. Install on your site.**
Open your **Site** → **Apps** tab → **Install App** → `neonext_analytics`.

**5. Open it.**
Visit `/app` and hard-refresh. The **NeoNext Analytics** entry is in the
sidebar. Assign the **NeoNext Viewer** role to anyone who should use it.

---

## Install on a self-hosted bench

```bash
cd ~/frappe-bench
bench get-app neonext_analytics https://github.com/<you>/neonext_analytics.git
bench --site your-site install-app neonext_analytics
bench build --app neonext_analytics
bench --site your-site migrate
bench --site your-site clear-cache
bench restart
```

---

## Project structure

```
neonext_analytics/              <- repository root
  pyproject.toml                build metadata + Frappe version key
  license.txt
  README.md
  .gitignore
  neonext_analytics/            <- Python package
    __init__.py                 app version
    hooks.py                    app registration, fixtures, after_install
    install.py                  after_install: syncs pages + workspace
    modules.txt                 declares the "NeoNext Analytics" module
    patches.txt                 (empty) DB migration patches
    neonext_analytics/          <- module
      api.py                    whitelisted backend methods
      workspace/neonext_analytics/
        neonext_analytics.json  sidebar entry (cards + shortcuts)
      page/neonext_dashboard/
        neonext_dashboard.json  page definition
        neonext_dashboard.js    dashboard UI
      page/neonext_explorer/
        neonext_explorer.json   page definition
        neonext_explorer.js     explorer UI
    public/css/
      neonext.css               styling
```

---

## Troubleshooting

**"No DocType found" when filtering DocType list by module = NeoNext
Analytics.** Expected — this app has no DocTypes. It is pages + a workspace.

**App installed but no sidebar entry.** The workspace did not sync. On
Frappe Cloud, trigger a **Migrate** from the site menu, then hard-refresh.
On a self-hosted bench, run `bench --site your-site migrate && bench --site
your-site clear-cache`.

**A page opens but charts are empty.** That is a permissions result, not a
bug — the user lacks read access on Sales Invoice / Customer, or the site
has no invoice data in the selected period. Assign the **NeoNext Viewer** or
an accounts/sales role.

---

## License

MIT — see `license.txt`.
