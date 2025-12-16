#!/bin/bash

# Get the latest file in the screenshots directory
latest_file=$(ls -t screenshots/* 2>/dev/null | head -n 1)

if [ -n "$latest_file" ]; then
    echo "$latest_file"
else
    echo "No files found in screenshots/" >&2
    exit 1
fi
