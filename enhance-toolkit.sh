#!/bin/bash

# Create directories
mkdir -p converted_files
mkdir -p backup_files

# Check for index.txt and convert to index.html if needed
if [ -f "index.txt" ]; then
  echo "Found index.txt, converting to index.html"
  cp "index.txt" "backup_files/index.txt.bak"
  cp "index.txt" "index.html"
  echo "Converted index.txt to index.html"
  HTML_FILE="index.html"
else
  # Look for any HTML file
  HTML_FILE=$(find . -maxdepth 2 -name "*.html" | head -n 1)
fi

# Backup HTML file if found
if [ -n "$HTML_FILE" ]; then
  echo "Found HTML file: $HTML_FILE"
  cp "$HTML_FILE" "backup_files/$(basename "$HTML_FILE").bak"
  echo "Backed up $HTML_FILE"
fi

# Backup existing JavaScript files
for file in qrisk3-implementation.js juno-integration.js enhanced-display.js; do
  if [ -f "$file" ]; then
    cp "$file" "backup_files/$(basename "$file").bak"
    echo "Backed up $file"
  fi
done

# Convert text files to JavaScript
if [ -f "QRISK3 Implementation Module.txt" ]; then
  cp "QRISK3 Implementation Module.txt" converted_files/qrisk3-implementation.js
  echo "Converted QRISK3 Implementation Module.txt"
fi

if [ -f "Juno EMR Integration Module.txt" ]; then
  cp "Juno EMR Integration Module.txt" converted_files/juno-integration.js
  echo "Converted Juno EMR Integration Module.txt"
fi

if [ -f "Enhanced Results Display Module.txt" ]; then
  cp "Enhanced Results Display Module.txt" converted_files/enhanced-display.js
  echo "Converted Enhanced Results Display Module.txt"
elif [ -f "Enhanced Results Display Moduel.txt" ]; then
  cp "Enhanced Results Display Moduel.txt" converted_files/enhanced-display.js
  echo "Converted Enhanced Results Display Moduel.txt"
fi

# Add legal header
cat > legal_header.txt << 'EOL'
/**
 * CVD Risk Toolkit with Lp(a) Post-Test Modifier
 * 
 * LEGAL DISCLAIMER:
 * This software is provided for educational and informational purposes only. 
 * It is not intended to be a substitute for professional medical advice, diagnosis, or treatment.
 * Always seek the advice of a qualified healthcare provider with any questions regarding medical conditions.
 * 
 * REFERENCES AND ATTRIBUTIONS:
 * - QRISK3 algorithm: Hippisley-Cox J, et al. BMJ 2017;357:j2099
 * - Framingham Risk Score: D'Agostino RB Sr, et al. Circulation 2008;117:743-53
 * - Lp(a) adjustments based on: Willeit P, et al. Lancet 2018;392:1311-1320
 * 
 * Last updated: April 2025
 */

EOL

# Add legal header to each JavaScript file
for file in converted_files/*.js; do
  if [ -f "$file" ]; then
    cat legal_header.txt "$file" > temp.js
    mv temp.js "$file"
  fi
done

# Replace existing files
for file in converted_files/*.js; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    mv "$file" "./$filename"
    echo "Added/replaced $filename"
  fi
done

# Update HTML file if found
if [ -n "$HTML_FILE" ]; then
  if ! grep -q "qrisk3-implementation.js" "$HTML_FILE"; then
    # Simple find/replace - add scripts before closing body tag
    if grep -q "</body>" "$HTML_FILE"; then
      sed -i 's|</body>|<script src="qrisk3-implementation.js"></script>\n<script src="juno-integration.js"></script>\n<script src="enhanced-display.js"></script>\n</body>|' "$HTML_FILE"
      echo "Added script references before closing body tag"
    else
      # If no closing body tag, add to end of file
      echo -e "\n<script src=\"qrisk3-implementation.js\"></script>\n<script src=\"juno-integration.js\"></script>\n<script src=\"enhanced-display.js\"></script>" >> "$HTML_FILE"
      echo "Added script references at end of file"
    fi
  fi
  
  # Add legal disclaimer if not present
  if ! grep -q "Healthcare Professional Use Only" "$HTML_FILE"; then
    if grep -q "<body" "$HTML_FILE"; then
      sed -i '/<body/a <div class="legal-disclaimer-banner"><p><strong>Healthcare Professional Use Only:</strong> This tool is designed to support clinical decision-making, not replace it. Always use clinical judgment.</p></div>' "$HTML_FILE"
      echo "Added legal disclaimer after body tag"
    else
      # If no body tag, add near beginning of file (after potential doctype or head)
      sed -i '3i <div class="legal-disclaimer-banner"><p><strong>Healthcare Professional Use Only:</strong> This tool is designed to support clinical decision-making, not replace it. Always use clinical judgment.</p></div>' "$HTML_FILE"
      echo "Added legal disclaimer near beginning of file"
    fi
  fi
  
  # Add references section if not present
  if ! grep -q "References and Attributions" "$HTML_FILE"; then
    if grep -q "</body>" "$HTML_FILE"; then
      sed -i '/<\/body>/i <div class="references-section"><h3>References and Attributions</h3><div class="references-content"><p><strong>Risk Calculators:</strong></p><ul><li>QRISK3: Hippisley-Cox J, et al. BMJ 2017;357:j2099</li><li>Framingham Risk Score: DAgostino RB Sr, et al. Circulation 2008;117:743-53</li></ul></div></div>' "$HTML_FILE"
      echo "Added references section before closing body tag"
    else
      # If no closing body tag, add to end of file
      echo -e "\n<div class=\"references-section\"><h3>References and Attributions</h3><div class=\"references-content\"><p><strong>Risk Calculators:</strong></p><ul><li>QRISK3: Hippisley-Cox J, et al. BMJ 2017;357:j2099</li><li>Framingham Risk Score: DAgostino RB Sr, et al. Circulation 2008;117:743-53</li></ul></div></div>" >> "$HTML_FILE"
      echo "Added references section at end of file"
    fi
  fi
fi

echo "Enhancement completed successfully"