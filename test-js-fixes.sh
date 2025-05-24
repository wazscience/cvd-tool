#!/bin/bash

# test-js-fixes.sh
# Script to test that JavaScript syntax errors are fixed
# Usage: bash test-js-fixes.sh

echo "Testing JavaScript files for syntax errors..."

# Function to test JavaScript syntax
test_js_syntax() {
    local file=$1
    echo "Testing $file..."
    
    # Use Node.js to check syntax if available
    if command -v node &> /dev/null; then
        result=$(node --check "$file" 2>&1)
        if [ $? -eq 0 ]; then
            echo "✅ $file: Syntax OK"
            return 0
        else
            echo "❌ $file: Syntax error detected"
            echo "$result"
            return 1
        fi
    else
        # Fallback to more basic syntax check using JavaScript engine
        if command -v jshint &> /dev/null; then
            result=$(jshint "$file" 2>&1)
            if [ $? -eq 0 ]; then
                echo "✅ $file: Syntax OK"
                return 0
            else
                echo "❌ $file: Syntax error detected"
                echo "$result"
                return 1
            fi
        else
            echo "⚠️ Cannot test $file: Neither Node.js nor JSHint is available"
            return 2
        fi
    fi
}

# Test all JavaScript files
failed=0
for file in calculations.js medication.js ui.js validation.js utils.js; do
    if [ -f "$file" ]; then
        test_js_syntax "$file"
        if [ $? -ne 0 ] && [ $? -ne 2 ]; then
            ((failed++))
        fi
    else
        echo "⚠️ File not found: $file"
    fi
done

# Check ES module import/export consistency
echo -e "\nChecking ES module compatibility..."
grep -n "export " *.js
grep -n "import " *.js

# Test if files can be loaded as modules
if command -v node &> /dev/null; then
    echo -e "\nTesting ES module loading..."
    echo 'import "./utils.js";' > test-module.js
    node --input-type=module test-module.js
    if [ $? -eq 0 ]; then
        echo "✅ ES modules load test: OK"
    else
        echo "❌ ES modules load test: Failed"
        ((failed++))
    fi
    rm test-module.js
fi

# Output summary
echo -e "\nTest summary:"
if [ $failed -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ $failed files have syntax errors"
fi

exit $failed