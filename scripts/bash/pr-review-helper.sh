#!/bin/bash
# PR Review Helper - Quick commands for managing PR reviews

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REVIEWS_DIR="$PROJECT_ROOT/.pr-reviews"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
show_help() {
    cat << EOF
${BLUE}PR Review Helper${NC}

Usage: $0 <command> [options]

Commands:
    ${GREEN}fetch [PR_NUMBER]${NC}
        Fetch PR review comments from GitHub
        If PR_NUMBER not provided, fetches latest PR
        
    ${GREEN}latest${NC}
        Show the latest bot review comment
        
    ${GREEN}list${NC}
        List all saved PR reviews
        
    ${GREEN}view [PR_NUMBER]${NC}
        View a specific PR review
        If PR_NUMBER not provided, shows latest
        
    ${GREEN}clean [DAYS]${NC}
        Remove reviews older than DAYS (default: 30)
        
    ${GREEN}setup${NC}
        Setup GitHub token and configuration

Environment Variables:
    GITHUB_TOKEN    GitHub personal access token
    GITHUB_REPO     Repository (owner/repo format)

Examples:
    $0 fetch              # Fetch latest PR
    $0 fetch 42           # Fetch PR #42
    $0 latest             # Show latest bot comment
    $0 view               # View latest review
    $0 clean 7            # Remove reviews older than 7 days

EOF
}

fetch_reviews() {
    local pr_number="$1"
    
    echo -e "${BLUE}Fetching PR reviews...${NC}"
    
    if [ -n "$pr_number" ]; then
        python3 "$SCRIPT_DIR/fetch_pr_reviews.py" "$pr_number"
    else
        python3 "$SCRIPT_DIR/fetch_pr_reviews.py"
    fi
}

show_latest() {
    if [ ! -d "$REVIEWS_DIR" ] || [ -z "$(ls -A "$REVIEWS_DIR"/*.md 2>/dev/null)" ]; then
        echo -e "${YELLOW}No reviews found. Run '$0 fetch' first.${NC}"
        exit 1
    fi
    
    local latest_file=$(ls -t "$REVIEWS_DIR"/PR_*.md 2>/dev/null | head -1)
    
    if [ -z "$latest_file" ]; then
        echo -e "${YELLOW}No PR review files found${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}Latest PR Review:${NC} $(basename "$latest_file")"
    echo ""
    
    # Extract and show bot comments
    if grep -q "## Comments" "$latest_file"; then
        echo -e "${GREEN}=== BOT COMMENTS ===${NC}"
        sed -n '/## Comments/,/^$/p' "$latest_file" | tail -n +2
    else
        cat "$latest_file"
    fi
}

list_reviews() {
    if [ ! -d "$REVIEWS_DIR" ] || [ -z "$(ls -A "$REVIEWS_DIR"/*.md 2>/dev/null)" ]; then
        echo -e "${YELLOW}No reviews found${NC}"
        exit 0
    fi
    
    echo -e "${BLUE}Saved PR Reviews:${NC}"
    echo ""
    
    for file in $(ls -t "$REVIEWS_DIR"/PR_*.md 2>/dev/null); do
        local filename=$(basename "$file")
        local pr_num=$(echo "$filename" | sed 's/PR_\([0-9]*\)_.*/\1/')
        local timestamp=$(echo "$filename" | sed 's/PR_[0-9]*_\(.*\)\.md/\1/')
        local title=$(grep "^# PR #" "$file" | head -1 | sed 's/^# //')
        
        echo -e "${GREEN}$filename${NC}"
        echo "  $title"
        echo "  Date: $timestamp"
        echo ""
    done
}

view_review() {
    local pr_number="$1"
    
    if [ ! -d "$REVIEWS_DIR" ]; then
        echo -e "${YELLOW}No reviews directory found${NC}"
        exit 1
    fi
    
    local file
    if [ -n "$pr_number" ]; then
        file=$(ls -t "$REVIEWS_DIR"/PR_${pr_number}_*.md 2>/dev/null | head -1)
    else
        file=$(ls -t "$REVIEWS_DIR"/PR_*.md 2>/dev/null | head -1)
    fi
    
    if [ -z "$file" ]; then
        echo -e "${YELLOW}No review found${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}Viewing:${NC} $(basename "$file")"
    echo ""
    
    if command -v bat &> /dev/null; then
        bat "$file"
    elif command -v less &> /dev/null; then
        less "$file"
    else
        cat "$file"
    fi
}

clean_old_reviews() {
    local days="${1:-30}"
    
    if [ ! -d "$REVIEWS_DIR" ]; then
        echo -e "${YELLOW}No reviews directory found${NC}"
        exit 0
    fi
    
    echo -e "${BLUE}Removing reviews older than $days days...${NC}"
    
    local count=0
    while IFS= read -r -d '' file; do
        rm "$file"
        echo "  Removed: $(basename "$file")"
        ((count++))
    done < <(find "$REVIEWS_DIR" -name "PR_*.md" -type f -mtime +$days -print0)
    
    if [ $count -eq 0 ]; then
        echo -e "${GREEN}No old reviews to remove${NC}"
    else
        echo -e "${GREEN}Removed $count review(s)${NC}"
    fi
}

setup_config() {
    echo -e "${BLUE}PR Review Helper Setup${NC}"
    echo ""
    
    # Check for GitHub token
    if [ -z "$GITHUB_TOKEN" ]; then
        echo -e "${YELLOW}GITHUB_TOKEN not set${NC}"
        echo ""
        echo "To set up GitHub token:"
        echo "1. Go to: https://github.com/settings/tokens"
        echo "2. Generate new token (classic)"
        echo "3. Select 'repo' scope"
        echo "4. Copy the token"
        echo ""
        read -p "Enter GitHub token (or press Enter to skip): " token
        
        if [ -n "$token" ]; then
            echo "export GITHUB_TOKEN=$token" >> ~/.bashrc
            echo "export GITHUB_TOKEN=$token" >> ~/.zshrc 2>/dev/null || true
            export GITHUB_TOKEN="$token"
            echo -e "${GREEN}✓ Token saved${NC}"
        fi
    else
        echo -e "${GREEN}✓ GITHUB_TOKEN is set${NC}"
    fi
    
    # Check for repo
    if [ -z "$GITHUB_REPO" ]; then
        local repo=$(git config --get remote.origin.url 2>/dev/null | sed 's/.*github.com[:/]\(.*\)\.git/\1/')
        if [ -n "$repo" ]; then
            echo -e "${GREEN}✓ Repository detected: $repo${NC}"
            echo "export GITHUB_REPO=$repo" >> ~/.bashrc
            echo "export GITHUB_REPO=$repo" >> ~/.zshrc 2>/dev/null || true
            export GITHUB_REPO="$repo"
        else
            echo -e "${YELLOW}Could not detect repository${NC}"
        fi
    else
        echo -e "${GREEN}✓ GITHUB_REPO is set: $GITHUB_REPO${NC}"
    fi
    
    # Check Python dependencies
    echo ""
    echo "Checking Python dependencies..."
    if python3 -c "import requests" 2>/dev/null; then
        echo -e "${GREEN}✓ requests library installed${NC}"
    else
        echo -e "${YELLOW}! requests library not found${NC}"
        read -p "Install requests? (y/n): " install
        if [ "$install" = "y" ]; then
            pip install requests
            echo -e "${GREEN}✓ Installed requests${NC}"
        fi
    fi
    
    echo ""
    echo -e "${GREEN}Setup complete!${NC}"
    echo ""
    echo "Try: $0 fetch"
}

# Main
case "${1:-}" in
    fetch)
        fetch_reviews "$2"
        ;;
    latest)
        show_latest
        ;;
    list)
        list_reviews
        ;;
    view)
        view_review "$2"
        ;;
    clean)
        clean_old_reviews "$2"
        ;;
    setup)
        setup_config
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac
