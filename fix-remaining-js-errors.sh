#!/bin/bash
# fix-remaining-js-errors.sh
# Script to fix the remaining JavaScript errors in the CVD tool codebase

echo "CVD Tool - Fixing Remaining JavaScript Errors"
echo "=============================================="

# Create a backup directory with timestamp
timestamp=$(date +"%Y%m%d_%H%M%S")
backup_dir="backups/js_fixes_${timestamp}"
mkdir -p "$backup_dir"

echo "Creating backups in $backup_dir..."

# Function to backup a file before modifying it
backup_file() {
  local file="$1"
  local relative_path=$(echo "$file" | sed "s|^\./||")
  local backup_path="$backup_dir/$(dirname "$relative_path")"
  
  mkdir -p "$backup_path"
  cp "$file" "$backup_path/$(basename "$file")"
  echo "Backed up: $file"
}

# Fix 1: Complete QRISK3 Code Patches.js files
echo -e "\n👉 Fixing 'Complete QRISK3 Code Patches.js' files..."
find . -name "Complete QRISK3 Code Patches.js" -type f | while read -r file; do
  backup_file "$file"
  # Fix the first character issue and convert double quotes to single
  sed -i '1s/^.//' "$file"
  sed -i 's/"/'"'"'/g' "$file"
  echo "✅ Fixed quotes in $file"
done

# Fix 2: enhanced-disclaimer.js files
echo -e "\n👉 Fixing 'enhanced-disclaimer.js' files..."
find . -name "enhanced-disclaimer.js" -type f | while read -r file; do
  backup_file "$file"
  # Fix line 783 with unexpected token error
  sed -i '783s/}/});/' "$file"
  echo "✅ Fixed line 783 in $file"
done

# Fix 3: Brace style issues
echo -e "\n👉 Fixing brace style issues..."
files_with_brace_issues=(
  "js/calculations (2).js"
  "backups/20250426/js_backup_*/calculations (2).js"
  "js/medication.js"
  "backups/20250426/js_backup_*/medication.js"
  "js/validation (2).js"
  "backups/20250426/js_backup_*/validation (2).js"
)

for pattern in "${files_with_brace_issues[@]}"; do
  find . -path "./$pattern" 2>/dev/null | while read -r file; do
    backup_file "$file"
    # Fix brace style by making sure closing braces and else are on the same line
    perl -0777 -i -pe 's/}\s*\n\s*else\s*{/} else {/g' "$file"
    echo "✅ Fixed brace style in $file"
  done
done

# Fix 4: Duplicate identifier declarations
echo -e "\n👉 Fixing duplicate identifier declarations..."

# Fix in combined.js
if [ -f "combined.js" ]; then
  backup_file "combined.js"
  # Change 'const combinedQRISK3Calculator' to 'var combinedQRISK3Calculator'
  sed -i 's/const combinedQRISK3Calculator/var combinedQRISK3Calculator/' "combined.js"
  echo "✅ Fixed duplicate identifier in combined.js"
fi

# Fix in qrisk3-algorithm.js
find . -name "qrisk3-algorithm.js" -type f | while read -r file; do
  backup_file "$file"
  # Change const to var for duplicate declarations
  sed -i 's/const calculateQRISK3Score/var calculateQRISK3Score/' "$file"
  sed -i 's/const qrisk3AlgorithmCalculator/var qrisk3AlgorithmCalculator/' "$file"
  echo "✅ Fixed duplicate identifiers in $file"
done

# Fix in encryption-wrapper-fixed.js
if [ -f "fixes/encryption-wrapper-fixed.js" ]; then
  backup_file "fixes/encryption-wrapper-fixed.js"
  sed -i 's/const CryptoJS/var CryptoJS/' "fixes/encryption-wrapper-fixed.js"
  echo "✅ Fixed duplicate identifier in fixes/encryption-wrapper-fixed.js"
fi

# Fix 5: Return statement outside of function
echo -e "\n👉 Fixing 'return' outside of function..."
find . -name "add-loading-indicators.js" -type f | while read -r file; do
  backup_file "$file"
  # Comment out the return statement at line 158
  sed -i '158s/return/\/\/ return/' "$file"
  echo "✅ Fixed return statement in $file"
done

# Fix 6: Unterminated template literals
echo -e "\n👉 Fixing unterminated template literals..."
find . -name "fix-pdf-preview.js" -type f | while read -r file; do
  backup_file "$file"
  # Add missing backtick at line 24
  # This is tricky to do with sed because backticks are special in bash
  # Using perl instead
  perl -i -pe 's/(`[^`]*)\n/\1`;\n/ if $. == 24' "$file"
  echo "✅ Fixed unterminated template in $file"
done

# Fix 7: Remaining quote style issues
echo -e "\n👉 Fixing remaining quote style issues in key files..."
files_with_quote_issues=(
  "js/Complete QRISK3 Code Patches.js"
  "fixes/fixed-qrisk3-patches.js"
)

for file in "${files_with_quote_issues[@]}"; do
  if [ -f "$file" ]; then
    backup_file "$file"
    # Change double quotes to single quotes, avoiding escaped quotes
    perl -i -pe 's/"([^"\\]*(?:\\.[^"\\]*)*)"/'\''\1'\''/g' "$file"
    echo "✅ Fixed quotes in $file"
  fi
done

# Fix 8: Fix calculation.js, medication.js, and validation.js parsing errors
echo -e "\n👉 Fixing parsing errors in calculations, medication, and validation files..."

files_to_fix=(
  "js/calculations (2).js"
  "js/medication.js"
  "js/validation (2).js"
)

for file in "${files_to_fix[@]}"; do
  if [ -f "$file" ]; then
    backup_file "$file"
    # Fix 'Unexpected token else' errors by ensuring proper brace placement
    perl -0777 -i -pe 's/}\s*\n\s*else\s*{/} else {/g' "$file"
    # Also ensure all if-else blocks have proper formatting
    perl -0777 -i -pe 's/if\s*\(\s*(.*?)\s*\)\s*{/if (\1) {/g' "$file"
    echo "✅ Fixed parsing errors in $file"
  fi
done

# Fix 9: Fix physiological-validation.js unexpected token issue
echo -e "\n👉 Fixing physiological-validation.js..."
find . -name "physiological-validation.js" -type f | while read -r file; do
  backup_file "$file"
  # Fix the unexpected token ':' at line 2:26
  sed -i '2s/:/= /' "$file"
  echo "✅ Fixed unexpected token in $file"
done

# Fix 10: Fix fix-pdf-preview.js identifier errors
echo -e "\n👉 Fixing fix-pdf-preview.js identifier issues..."
find . -name "fix-pdf-preview.js" -type f | while read -r file; do
  backup_file "$file"
  # Fix duplicate identifier by changing const to var
  sed -i 's/const pdfExportContent/var pdfExportContent/' "$file"
  echo "✅ Fixed duplicate identifier in $file"
done

echo -e "\n✨ All fixes have been applied!"
echo "Backups of the original files were saved to: $backup_dir"
echo -e "\nNext steps:"
echo "1. Run 'npx eslint .' to check if any errors remain"
echo "2. Test the application to make sure everything works correctly"
echo "3. If issues persist, you may need to fix some files manually"