#!/bin/bash
# النشر التلقائي لعيادتي: يسحب main ويعيد بناء الستاك ويهاجر قاعدة البيانات
# عند تغيّر الريموت فقط. (شغّله يدوياً أو عبر cron. يحتاج صلاحية تنفيذ: chmod +x deploy.sh)
set -e
cd /opt/clinc || exit 1

git fetch origin main --quiet
REMOTE=$(git rev-parse origin/main)
LAST=$(cat /opt/clinc/.last_deployed 2>/dev/null || echo none)

if [ "$REMOTE" != "$LAST" ]; then
  echo "[$(date)] deploying $REMOTE"
  git reset --hard origin/main
  docker compose up -d --build
  # انتظار جاهزية قاعدة البيانات ثم الهجرة (idempotent)
  sleep 5
  docker exec clinic-api php artisan migrate --force || true
  echo "$REMOTE" > /opt/clinc/.last_deployed
  echo "[$(date)] done"
else
  echo "[$(date)] up to date ($REMOTE)"
fi
