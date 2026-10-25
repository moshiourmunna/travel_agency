#!/bin/bash
# Rebuild + restart the Next production server on :3000 (box dev loop).
cd /workspace/musafir/frontend || exit 1
python3 ../tooling/gen/icons.py >/dev/null
npm run build > /tmp/next-build.log 2>&1 || { grep -B2 -A12 -i "error" /tmp/next-build.log | head -60; exit 1; }
pkill -f "next start" ; pkill -f next-server ; sleep 0.5
(PORT=3000 nohup npm run start >/tmp/next.log 2>&1 &)
for k in $(seq 1 30); do curl -s -o /dev/null http://localhost:3000/en/tours?x=1 -m 2 && break; sleep 0.5; done
echo "built + started"
