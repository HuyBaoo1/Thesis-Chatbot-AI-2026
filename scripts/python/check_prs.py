#!/usr/bin/env python3
"""Quick script to check available PRs in the repository."""

import os
import sys
import requests

def check_prs():
    token = os.getenv("GITHUB_TOKEN")
    repo = os.getenv("GITHUB_REPO", "a20-ai-thuc-chien/A20-App-165")
    
    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"token {token}"
    
    print(f"Repository: {repo}")
    print(f"Token: {'Set' if token else 'Not set'}")
    print()
    
    # Check all PRs (open and closed)
    for state in ["open", "closed"]:
        print(f"\n{'='*60}")
        print(f"{state.upper()} Pull Requests:")
        print('='*60)
        
        try:
            response = requests.get(
                f"https://api.github.com/repos/{repo}/pulls",
                headers=headers,
                params={"state": state, "per_page": 10}
            )
            
            if response.status_code == 404:
                print(f"❌ Repository not found or no access")
                print(f"   Check: https://github.com/{repo}")
                return
            
            response.raise_for_status()
            prs = response.json()
            
            if not prs:
                print(f"No {state} PRs found")
            else:
                for pr in prs:
                    print(f"\nPR #{pr['number']}: {pr['title']}")
                    print(f"  State: {pr['state']}")
                    print(f"  Author: @{pr['user']['login']}")
                    print(f"  Created: {pr['created_at']}")
                    print(f"  URL: {pr['html_url']}")
                    
                    # Check for comments
                    comments_response = requests.get(
                        f"https://api.github.com/repos/{repo}/issues/{pr['number']}/comments",
                        headers=headers
                    )
                    if comments_response.ok:
                        comments = comments_response.json()
                        bot_comments = [c for c in comments if c.get('user', {}).get('type') == 'Bot']
                        if bot_comments:
                            print(f"  🤖 Bot comments: {len(bot_comments)}")
        
        except requests.exceptions.RequestException as e:
            print(f"Error: {e}")
            return

if __name__ == "__main__":
    check_prs()
