#!/bin/sh
set -e

# =============================================================
# Docker Entrypoint - Asset Seeder
# =============================================================
# On first run (or when new assets are added), this copies the
# built-in seed assets into the Docker volume WITHOUT overwriting
# any existing files (e.g. user uploads).
# =============================================================

SEED_DIR="/app/seed-assets"
TARGET_DIR="/app/storage/Assets"

if [ -d "$SEED_DIR" ]; then
    echo "🌱 [ENTRYPOINT] Seeding storage volume with built-in assets..."

    # Create target directories if they don't exist
    mkdir -p "$TARGET_DIR"

    # Copy files without overwriting existing ones (-n = no-clobber)
    cp -rn "$SEED_DIR/"* "$TARGET_DIR/" 2>/dev/null || true

    echo "✅ [ENTRYPOINT] Asset seeding complete."
else
    echo "ℹ️  [ENTRYPOINT] No seed assets found, skipping."
fi

# Execute the main command (npm start)
exec "$@"
