#!/bin/bash

# Script to fix common JavaScript syntax errors in the CVD Toolkit files

# Create timestamp for backup directory
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_DIR="./js-backups-$TIMESTAMP"
JS_DIR="./src/js"  # Update this path to where your JS files are located

echo "Starting JS syntax error fix script..."
mkdir -p "$BACKUP_DIR"
echo "Created backup directory: $BACKUP_DIR"

# Backup original files
cp -f "$JS_DIR/calculations.js" "$BACKUP_DIR/calculations.js" 2>/dev/null
cp -f "$JS_DIR/medication.js" "$BACKUP_DIR/medication.js" 2>/dev/null
cp -f "$JS_DIR/ui.js" "$BACKUP_DIR/ui.js" 2>/dev/null
cp -f "$JS_DIR/validation.js" "$BACKUP_DIR/validation.js" 2>/dev/null
cp -f "$JS_DIR/utils.js" "$BACKUP_DIR/utils.js" 2>/dev/null
echo "Backed up original files to $BACKUP_DIR"

# Fix calculations.js
echo "Fixing calculations.js..."
if [ -f "$JS_DIR/calculations.js" ]; then
    sed -i 's/};  \]/\]/' "$JS_DIR/calculations.js"
    sed -i 's/};  };/}/' "$JS_DIR/calculations.js"
    sed -i 's/;  }/}/' "$JS_DIR/calculations.js"
    sed -i 's/;  \]/\]/' "$JS_DIR/calculations.js"
    sed -i 's/;  })/})/' "$JS_DIR/calculations.js"
    sed -i 's/);  /); /' "$JS_DIR/calculations.js"
fi

# Fix medication.js
echo "Fixing medication.js..."
if [ -f "$JS_DIR/medication.js" ]; then
    sed -i 's/};  \]/\]/' "$JS_DIR/medication.js"
    sed -i 's/};  };/}/' "$JS_DIR/medication.js"
    sed -i 's/;  }/}/' "$JS_DIR/medication.js"
    sed -i 's/;  \]/\]/' "$JS_DIR/medication.js"
    sed -i 's/;  })/})/' "$JS_DIR/medication.js"
    sed -i 's/);  /); /' "$JS_DIR/medication.js"
    # Fix specific medication.js syntax error
    sed -i 's/assessment.onEzetimibe;    );/assessment.onEzetimibe);/' "$JS_DIR/medication.js"
    sed -i 's/recommendations.nonPharmacological: \[/recommendations.nonPharmacological = \[/' "$JS_DIR/medication.js"
    sed -i 's/hypertriglyceridemia: false;    };/hypertriglyceridemia: false    };/' "$JS_DIR/medication.js"
    sed -i 's/coverage.notes: \[];/coverage.notes = \[];/' "$JS_DIR/medication.js"
fi

# Fix ui.js
echo "Fixing ui.js..."
if [ -f "$JS_DIR/ui.js" ]; then
    sed -i 's/};  \]/\]/' "$JS_DIR/ui.js"
    sed -i 's/};  };/}/' "$JS_DIR/ui.js"
    sed -i 's/;  }/}/' "$JS_DIR/ui.js"
    sed -i 's/;  \]/\]/' "$JS_DIR/ui.js"
    sed -i 's/;  })/})/' "$JS_DIR/ui.js"
    sed -i 's/);  /); /' "$JS_DIR/ui.js"
fi

# Fix validation.js
echo "Fixing validation.js..."
if [ -f "$JS_DIR/validation.js" ]; then
    sed -i 's/};  \]/\]/' "$JS_DIR/validation.js"
    sed -i 's/};  };/}/' "$JS_DIR/validation.js"
    sed -i 's/;  }/}/' "$JS_DIR/validation.js"
    sed -i 's/;  \]/\]/' "$JS_DIR/validation.js"
    sed -i 's/;  })/})/' "$JS_DIR/validation.js"
    sed -i 's/);  /); /' "$JS_DIR/validation.js"
    # Fix specific validation.js error
    sed -i 's/true;              );/true              );/' "$JS_DIR/validation.js"
    sed -i 's/errors;      };/errors      };/' "$JS_DIR/validation.js"
fi

echo "Running ESLint to check for remaining issues..."
npx eslint "$JS_DIR/*.js" --fix || echo "ESLint errors found. Manual fixes may be required."

echo "Script completed. Please check the files for any remaining issues."