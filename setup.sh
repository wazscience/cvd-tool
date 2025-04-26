#!/bin/bash
# setup.sh - Setup CVD Risk Toolkit environment

echo "Setting up CVD Risk Toolkit..."

# Create directory structure
echo "Creating directory structure..."
mkdir -p .github/workflows
mkdir -p js/utils
mkdir -p scripts
mkdir -p __tests__
mkdir -p icons
mkdir -p docs
mkdir -p backups

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Initialize npm if needed
if [ ! -f "package.json" ]; then
    echo "Initializing npm..."
    npm init -y
fi

# Install dependencies
echo "Installing dependencies..."
npm install --save-dev eslint jshint js-yaml babel-eslint@10 @babel/core@7 @babel/preset-env@7
npm install --save-dev prettier eslint-plugin-prettier eslint-config-prettier
npm install --save-dev source-map-support
npm install --save-dev jest workbox-webpack-plugin openai chai mocha
npm install --save d3 html2canvas jspdf

# Setup git hooks
echo "Setting up git hooks..."
mkdir -p .git/hooks
cp pre-commit-hook .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Create ESLint configuration
echo "Creating ESLint configuration..."
cat > .eslintrc.json << 'EOF'
{
  "env": {
    "browser": true,
    "es6": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:prettier/recommended"
  ],
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module"
  },
  "rules": {
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "no-console": "off",
    "no-undef": "warn",
    "prettier/prettier": "warn"
  },
  "globals": {
    "d3": "readonly",
    "CryptoJS": "readonly",
    "Sentry": "readonly",
    "Plotly": "readonly",
    "Chart": "readonly",
    "THREE": "readonly",
    "Tone": "readonly",
    "mammoth": "readonly",
    "tensorflow": "readonly",
    "Papaparse": "readonly",
    "window": "readonly",
    "document": "readonly"
  }
}
EOF

# Create Prettier configuration
echo "Creating Prettier configuration..."
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
EOF

# Create Jest configuration
echo "Creating Jest configuration..."
cat > jest.config.js << 'EOF'
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  testMatch: ['**/__tests__/**/*.test.js']
};
EOF

# Create Jest setup
cat > jest.setup.js << 'EOF'
global.fetch = jest.fn();
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn()
};
EOF

# Create placeholder icons if they don't exist
echo "Creating placeholder icons..."
if [ ! -f "icons/icon-192x192.png" ]; then
    cat > icons/icon-192x192.svg << 'EOF'
<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" fill="#2c3e50"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial" font-size="48">CVD</text>
</svg>
EOF
fi

if [ ! -f "icons/icon-512x512.png" ]; then
    cat > icons/icon-512x512.svg << 'EOF'
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#2c3e50"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial" font-size="128">CVD</text>
</svg>
EOF
fi

# Set permissions
echo "Setting permissions..."
chmod +x update-combined.sh
chmod +x .git/hooks/pre-commit

echo "Setup complete! You can now:"
echo "1. Run './update-combined.sh' to manually update combined.js"
echo "2. Use 'git push' to trigger the GitHub Actions workflow"
echo "3. Run 'npm test' to execute tests"
echo "4. Use the pre-commit hook to validate code before committing"