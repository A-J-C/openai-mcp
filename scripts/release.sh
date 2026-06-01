#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <version>   e.g. $0 1.1.0"
  exit 1
fi

VERSION="$1"
TAG="v${VERSION}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "Bumping to ${TAG}..."

# Update package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('${ROOT_DIR}/package.json', 'utf8'));
pkg.version = '${VERSION}';
fs.writeFileSync('${ROOT_DIR}/package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Update manifest.json
node -e "
const fs = require('fs');
const m = JSON.parse(fs.readFileSync('${ROOT_DIR}/manifest.json', 'utf8'));
m.version = '${VERSION}';
fs.writeFileSync('${ROOT_DIR}/manifest.json', JSON.stringify(m, null, 2) + '\n');
"

# Prepend Unreleased stub to CHANGELOG.md
CHANGELOG="${ROOT_DIR}/CHANGELOG.md"
STUB="## [Unreleased]

### Added

- _nothing yet_

"
# Insert stub after the first line (the # Changelog heading) followed by a blank line
python3 - <<'PYEOF'
import re, sys

with open("${CHANGELOG}", "r") as f:
    content = f.read()

stub = """## [Unreleased]

### Added

- _nothing yet_

"""

# Insert after the header block (first blank line after the first heading)
insert_at = content.find("\n## [")
if insert_at == -1:
    # No existing release entry yet — append
    content = content.rstrip() + "\n\n" + stub
else:
    content = content[:insert_at] + "\n" + stub + content[insert_at + 1:]

with open("${CHANGELOG}", "w") as f:
    f.write(content)
PYEOF

# Commit and tag
cd "${ROOT_DIR}"
git add package.json manifest.json CHANGELOG.md
git commit -m "chore: bump version to ${TAG}"
git tag "${TAG}"
git push origin HEAD
git push origin "${TAG}"

echo ""
echo "Done. Tag ${TAG} pushed — GitHub Actions will build and publish the release."
