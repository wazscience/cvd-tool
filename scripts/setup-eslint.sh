#!/bin/bash

# ESLint Setup Script for CVD Tool Project
# This script sets up ESLint and related tools

echo "🚀 Setting up ESLint and related tools for CVD Tool..."
echo "================================================"
echo ""

# Install missing dependencies
echo "📦 Installing missing dependencies..."
npm install --save-dev @eslint/js husky lint-staged

# Initialize husky
echo "🐶 Initializing Husky..."
npx husky install

# Make .husky directory
mkdir -p .husky

# Create .vscode directory if it doesn't exist
if [ ! -d ".vscode" ]; then
    mkdir -p .vscode
    echo "📁 Created .vscode directory"
fi

# Make the pre-commit hook executable
chmod +x .husky/pre-commit

echo ""
echo "✅ Setup completed!"
echo ""
echo "Next steps:"
echo "1. Run 'npm run lint' to check your code"
echo "2. Run 'npm run lint:fix' to automatically fix issues"
echo "3. Run 'npm run format' to format your code with Prettier"
echo ""
echo "Git hooks are now active - code will be linted before each commit"