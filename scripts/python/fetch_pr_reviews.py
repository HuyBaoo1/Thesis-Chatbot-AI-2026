#!/usr/bin/env python3
"""
Fetch latest PR review comments from GitHub.

Usage:
    python scripts/python/fetch_pr_reviews.py [PR_NUMBER]
    
    If PR_NUMBER is not provided, fetches comments for the most recent PR.

Environment variables:
    GITHUB_TOKEN: GitHub personal access token (optional, increases rate limit)
    GITHUB_REPO: Repository in format "owner/repo" (auto-detected from git remote)
"""

import os
import sys
import json
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List

try:
    import requests
except ImportError:
    print("Error: requests library not found. Install with: pip install requests")
    sys.exit(1)


def get_repo_from_git() -> Optional[str]:
    """Get repository owner/name from git remote."""
    try:
        result = subprocess.run(
            ["git", "config", "--get", "remote.origin.url"],
            capture_output=True,
            text=True,
            check=True
        )
        url = result.stdout.strip()
        
        # Parse GitHub URL
        if "github.com" in url:
            # Handle both SSH and HTTPS URLs
            if url.startswith("git@github.com:"):
                repo = url.replace("git@github.com:", "").replace(".git", "")
            elif "github.com/" in url:
                repo = url.split("github.com/")[1].replace(".git", "")
            else:
                return None
            return repo
    except Exception as e:
        print(f"Warning: Could not detect repository from git: {e}")
    return None


def fetch_pr_comments(repo: str, pr_number: Optional[int] = None, token: Optional[str] = None) -> Dict:
    """Fetch PR comments from GitHub API."""
    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"token {token}"
    
    base_url = f"https://api.github.com/repos/{repo}"
    
    # Get PR number if not provided
    if pr_number is None:
        print("Fetching most recent PR...")
        response = requests.get(
            f"{base_url}/pulls",
            headers=headers,
            params={"state": "open", "sort": "created", "direction": "desc"}
        )
        response.raise_for_status()
        prs = response.json()
        
        if not prs:
            print("No open PRs found")
            return {}
        
        pr_number = prs[0]["number"]
        print(f"Found PR #{pr_number}: {prs[0]['title']}")
    
    # Fetch PR details
    print(f"Fetching PR #{pr_number} details...")
    pr_response = requests.get(f"{base_url}/pulls/{pr_number}", headers=headers)
    pr_response.raise_for_status()
    pr_data = pr_response.json()
    
    # Fetch review comments
    print(f"Fetching review comments...")
    reviews_response = requests.get(
        f"{base_url}/pulls/{pr_number}/reviews",
        headers=headers
    )
    reviews_response.raise_for_status()
    reviews = reviews_response.json()
    
    # Fetch issue comments (includes bot comments)
    comments_response = requests.get(
        f"{base_url}/issues/{pr_number}/comments",
        headers=headers
    )
    comments_response.raise_for_status()
    comments = comments_response.json()
    
    return {
        "pr": pr_data,
        "reviews": reviews,
        "comments": comments
    }


def format_comment(comment: Dict) -> str:
    """Format a single comment for display."""
    author = comment.get("user", {}).get("login", "Unknown")
    body = comment.get("body") or ""
    created_at = comment.get("created_at") or comment.get("submitted_at", "")
    
    return f"""
### Comment by @{author}
**Date**: {created_at}

{body}

---
"""


def save_to_file(data: Dict, pr_number: int, output_dir: Path = Path(".pr-reviews")):
    """Save PR comments to a markdown file."""
    output_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = output_dir / f"PR_{pr_number}_{timestamp}.md"
    
    pr = data["pr"]
    reviews = data["reviews"]
    comments = data["comments"]
    
    with open(filename, "w", encoding="utf-8") as f:
        f.write(f"# PR #{pr_number}: {pr.get('title', 'No title')}\n\n")
        f.write(f"**Author**: @{pr.get('user', {}).get('login', 'Unknown')}\n")
        f.write(f"**Created**: {pr.get('created_at', 'Unknown')}\n")
        f.write(f"**Updated**: {pr.get('updated_at', 'Unknown')}\n")
        f.write(f"**State**: {pr.get('state', 'Unknown')}\n")
        f.write(f"**URL**: {pr.get('html_url', '')}\n\n")
        
        f.write("## Description\n\n")
        f.write((pr.get("body") or "No description provided") + "\n\n")
        
        f.write("---\n\n")
        
        # Write reviews
        if reviews:
            f.write("## Reviews\n\n")
            for review in sorted(reviews, key=lambda x: x.get("submitted_at") or ""):
                f.write(format_comment(review))
        
        # Write comments
        if comments:
            f.write("## Comments\n\n")
            for comment in sorted(comments, key=lambda x: x.get("created_at") or ""):
                f.write(format_comment(comment))
    
    print(f"\n✅ Saved to: {filename}")
    return filename


def display_latest_bot_comment(data: Dict):
    """Display the latest bot comment."""
    comments = data.get("comments", [])
    
    # Filter bot comments
    bot_comments = [
        c for c in comments 
        if c.get("user", {}).get("type") == "Bot" or 
           "bot" in c.get("user", {}).get("login", "").lower()
    ]
    
    if not bot_comments:
        print("\n⚠️  No bot comments found")
        return
    
    # Get latest bot comment
    latest = max(bot_comments, key=lambda x: x["created_at"])
    
    print("\n" + "="*80)
    print("LATEST BOT REVIEW COMMENT")
    print("="*80)
    print(f"\nBot: @{latest['user']['login']}")
    print(f"Date: {latest['created_at']}")
    print("\n" + "-"*80 + "\n")
    print(latest["body"])
    print("\n" + "="*80 + "\n")


def main():
    # Get configuration
    repo = os.getenv("GITHUB_REPO") or get_repo_from_git()
    if not repo:
        print("Error: Could not determine repository. Set GITHUB_REPO environment variable.")
        sys.exit(1)
    
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        print("Warning: GITHUB_TOKEN not set. API rate limit will be lower.")
    
    pr_number = None
    if len(sys.argv) > 1:
        try:
            pr_number = int(sys.argv[1])
        except ValueError:
            print(f"Error: Invalid PR number: {sys.argv[1]}")
            sys.exit(1)
    
    print(f"Repository: {repo}")
    
    try:
        # Fetch data
        data = fetch_pr_comments(repo, pr_number, token)
        
        if not data:
            print("No data fetched")
            sys.exit(1)
        
        pr_num = data["pr"]["number"]
        
        # Display latest bot comment
        display_latest_bot_comment(data)
        
        # Save to file
        filename = save_to_file(data, pr_num)
        
        print(f"\n💡 Tip: You can now ask your AI assistant to fix issues mentioned in:")
        print(f"   {filename}")
        
    except requests.exceptions.HTTPError as e:
        print(f"Error: GitHub API request failed: {e}")
        if e.response.status_code == 404:
            print("  - Check that the repository and PR number are correct")
            print("  - Ensure GITHUB_TOKEN has access to the repository")
        elif e.response.status_code == 401:
            print("  - Check that GITHUB_TOKEN is valid")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
