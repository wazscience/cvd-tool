#!/bin/bash
# update-combined.sh - Manually update combined.js

# Check if required dependencies are installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

# Install dependencies if needed
echo "Checking dependencies..."
npm init -y || true
npm install --save-dev @babel/core @babel/preset-env

# Create backup
echo "Creating backup..."
mkdir -p backups/$(date +%Y%m%d)
if [ -f "combined.js" ]; then
    cp combined.js "backups/$(date +%Y%m%d)/combined.js.backup.$(date +%H%M%S)"
fi

# Create combined.js
echo "Creating combined.js..."
node create-combined.js

# Validate the result
if [ -f "combined.js" ]; then
    echo "Validating combined.js..."
    node -c combined.js
    if [ $? -eq 0 ]; then
        echo "✓ combined.js created successfully"
        echo "Size: $(stat -f%z "combined.js" 2>/dev/null || stat -c%s "combined.js") bytes"
        echo "Lines: $(wc -l < combined.js)"
    else
        echo "✗ combined.js has syntax errors"
        exit 1
    fi
else
    echo "✗ Failed to create combined.js"
    exit 1
fi

echo "Update complete!"