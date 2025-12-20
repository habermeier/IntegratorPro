#!/bin/bash
# scripts/find-active-port.sh

# Use ss to detect listening TCP ports
# Filters for common dev ranges: 3000-3010 (custom server/proxy) and 5170-5180 (vite default)

# Get list of listening ports
# ss -lnt: list listening numeric tcp
# awk: get column 4 (address:port)
# grep: extract port number
PORTS=$(ss -lnt | awk '{print $4}' | grep -oE ':[0-9]+$' | tr -d ':' | sort -n | uniq)

FOUND=0

for port in $PORTS; do
  # Check relevant ranges
  if [[ "$port" -ge 3000 && "$port" -le 3010 ]] || [[ "$port" -ge 5170 && "$port" -le 5180 ]]; then
     # Verify with curl just to be sure it's responding to HTTP
     if curl -s -I -m 1 http://localhost:$port > /dev/null; then
         echo "FOUND_PORT=$port"
         FOUND=1
     fi
  fi
done

if [ $FOUND -eq 0 ]; then
  exit 1
fi
