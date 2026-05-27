#!/usr/bin/env bash
# =============================================================================
# NeoNext Analytics — convenience installer
#
# Run this from your bench root (the folder that contains apps/ and sites/),
# AFTER copying the neonext_analytics/ folder into apps/.
#
# Edit SITE below to match your site name, then:
#   chmod +x apps/neonext_analytics/install.sh
#   ./apps/neonext_analytics/install.sh
# =============================================================================

set -euo pipefail

# ---- EDIT THIS -------------------------------------------------------------
SITE="your-site.localhost"
# ---------------------------------------------------------------------------

APP="neonext_analytics"

if [ ! -d "apps/${APP}" ]; then
  echo "Error: apps/${APP} not found. Run this from the bench root after"
  echo "copying the neonext_analytics folder into apps/."
  exit 1
fi

echo ">> Registering ${APP} with the bench Python environment..."
./env/bin/pip install -e "apps/${APP}"

echo ">> Installing ${APP} on site ${SITE}..."
bench --site "${SITE}" install-app "${APP}"

echo ">> Building assets..."
bench build --app "${APP}"

echo ">> Running migrations..."
bench --site "${SITE}" migrate

echo ">> Clearing cache..."
bench --site "${SITE}" clear-cache

echo
echo "Done. Restart the bench (bench restart, or restart your dev server),"
echo "then open /app/neonext-dashboard in ERPNext."
echo "Remember to assign the 'NeoNext Viewer' role to dashboard users."
