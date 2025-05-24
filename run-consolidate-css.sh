#!/bin/bash
# run-consolidate-css.sh - Script to run the CSS consolidation

# Set up colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored log messages
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running in Git Bash on Windows
is_git_bash() {
    if [ "$(uname -s | cut -c 1-5)" = "MINGW" ]; then
        return 0 # True, this is Git Bash
    else
        return 1 # False, not Git Bash
    fi
}

# Check and install Node.js if needed
check_nodejs() {
    log_info "Checking for Node.js installation..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed!"
        log_info "Please install Node.js from https://nodejs.org/"
        exit 1
    fi
    
    # Check Node.js version (ensure v14+)
    NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$NODE_VERSION" -lt 14 ]; then
        log_warning "Node.js version is older than v14. Some features may not work correctly."
        log_info "Consider upgrading Node.js to the latest LTS version."
    else
        log_success "Node.js version v$(node -v | cut -d 'v' -f 2) is installed"
    fi
}

# Create backup directory with timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="backups/css_backup_${TIMESTAMP}"

# Create backup function
create_backup() {
    log_info "Creating backups in ${BACKUP_DIR}..."
    
    # Create directory if it doesn't exist
    mkdir -p "${BACKUP_DIR}"
    
    # Check for both CSS file variants
    if [ -f "styles.css" ]; then
        cp "styles.css" "${BACKUP_DIR}/"
        log_success "Backed up styles.css"
    else
        log_warning "styles.css not found, skipping backup"
    fi
    
    if [ -f "style.css" ]; then
        cp "style.css" "${BACKUP_DIR}/"
        log_success "Backed up style.css"
    else
        log_warning "style.css not found, skipping backup"
    fi
    
    # Backup index.html
    if [ -f "index.html" ]; then
        cp "index.html" "${BACKUP_DIR}/"
        log_success "Backed up index.html"
    else
        log_warning "index.html not found, skipping backup"
    fi
}

# Install dependencies function
install_dependencies() {
    log_info "Installing required dependencies..."
    
    # Make sure npm is available
    if ! command -v npm &> /dev/null; then
        log_error "npm is not available. Cannot install dependencies."
        exit 1
    fi
    
    # Install chalk if it's not already installed
    if ! npm list chalk | grep -q chalk; then
        npm install --save-dev chalk
        log_success "Installed chalk package"
    else
        log_info "chalk package is already installed"
    fi
}

# Run CSS consolidation script
run_consolidation() {
    log_info "Running CSS consolidation script..."
    
    # Check if the script exists
    if [ ! -f "consolidate-css.js" ]; then
        log_error "consolidate-css.js not found!"
        exit 1
    fi
    
    # Run the script
    node consolidate-css.js
    
    if [ $? -eq 0 ]; then
        log_success "CSS consolidation completed successfully!"
    else
        log_error "CSS consolidation encountered an error."
        exit 1
    fi
}

# Verify consolidation worked
verify_consolidation() {
    log_info "Verifying CSS consolidation..."
    
    # Determine which CSS file should be used
    CSS_FILE=""
    
    if [ -f "index.html" ]; then
        # Extract CSS reference from index.html
        CSS_REF=$(grep -o 'href="[^"]*\.css"' index.html | head -1 | cut -d'"' -f2 | xargs basename)
        
        if [ -n "$CSS_REF" ]; then
            CSS_FILE="$CSS_REF"
            log_info "CSS file referenced in index.html: $CSS_FILE"
        fi
    fi
    
    # Check if the referenced CSS file exists
    if [ -n "$CSS_FILE" ] && [ -f "$CSS_FILE" ]; then
        log_success "Consolidated CSS file $CSS_FILE exists"
        
        # Check if both CSS files still exist (should be just one now)
        if [ -f "styles.css" ] && [ -f "style.css" ]; then
            log_warning "Both styles.css and style.css still exist! Consolidation may not have fully completed."
        else
            log_success "Only the necessary CSS file remains, consolidation successful!"
        fi
    else
        log_error "CSS file does not exist or couldn't be determined!"
        return 1
    fi
    
    return 0
}

# Main execution
echo "=========================================================="
echo "          CVD TOOL CSS FILE CONSOLIDATION                 "
echo "=========================================================="
echo ""

# Check environment
if is_git_bash; then
    log_info "Running in Git Bash environment"
else
    log_info "Running in standard bash environment"
fi

# Execute all steps
check_nodejs
create_backup
install_dependencies
run_consolidation
verify_consolidation

echo ""
echo "=========================================================="
log_success "CSS consolidation process completed!"
echo "Your CSS files have been consolidated into a single, comprehensive file."
echo "Backups of the original files are available in: ${BACKUP_DIR}"
echo "=========================================================="