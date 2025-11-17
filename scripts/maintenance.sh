#!/bin/bash

# Maintenance Mode Toggle Script
# Usage: ./scripts/maintenance.sh [on|off|status]

set -e

ENV_FILE=".env.local"

# Create .env.local if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating $ENV_FILE..."
    touch "$ENV_FILE"
fi

case "$1" in
    "on")
        echo "🔧 Enabling maintenance mode..."
        if grep -q "^MAINTENANCE_MODE=" "$ENV_FILE"; then
            sed -i.bak 's/^MAINTENANCE_MODE=.*/MAINTENANCE_MODE=true/' "$ENV_FILE"
        else
            echo "MAINTENANCE_MODE=true" >> "$ENV_FILE"
        fi
        echo "✅ Maintenance mode ENABLED"
        echo "💡 Users will see the maintenance page instead of the app"
        ;;

    "off")
        echo "🔧 Disabling maintenance mode..."
        if grep -q "^MAINTENANCE_MODE=" "$ENV_FILE"; then
            sed -i.bak 's/^MAINTENANCE_MODE=.*/MAINTENANCE_MODE=false/' "$ENV_FILE"
        else
            echo "MAINTENANCE_MODE=false" >> "$ENV_FILE"
        fi
        echo "✅ Maintenance mode DISABLED"
        echo "💡 App is now accessible to users"
        ;;

    "status")
        if grep -q "^MAINTENANCE_MODE=true" "$ENV_FILE" 2>/dev/null; then
            echo "🔴 Maintenance mode is ENABLED"
            echo "📍 Users see: /maintenance page"
        else
            echo "🟢 Maintenance mode is DISABLED"
            echo "📍 Users see: normal app"
        fi
        ;;

    *)
        echo "Usage: $0 [on|off|status]"
        echo ""
        echo "Commands:"
        echo "  on     - Enable maintenance mode (site down)"
        echo "  off    - Disable maintenance mode (site up)"
        echo "  status - Show current maintenance mode status"
        echo ""
        echo "Example:"
        echo "  ./scripts/maintenance.sh on   # Put site in maintenance"
        echo "  ./scripts/maintenance.sh off  # Bring site back up"
        ;;
esac
