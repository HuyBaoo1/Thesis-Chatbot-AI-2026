#!/usr/bin/env python3
"""
Manually save PR review comment.

Usage:
    python scripts/python/save_pr_comment_manual.py

This will prompt you to paste the PR review comment directly.
"""

import sys
from datetime import datetime
from pathlib import Path

def main():
    print("="*80)
    print("Manual PR Review Comment Saver")
    print("="*80)
    print()
    
    # Get PR number
    pr_number = input("Enter PR number (e.g., 42): ").strip()
    if not pr_number:
        print("Error: PR number is required")
        sys.exit(1)
    
    # Get comment
    print()
    print("Paste the PR review comment below.")
    print("Press Ctrl+D (Linux/Mac) or Ctrl+Z then Enter (Windows) when done:")
    print("-"*80)
    
    try:
        lines = []
        while True:
            try:
                line = input()
                lines.append(line)
            except EOFError:
                break
    except KeyboardInterrupt:
        print("\n\nCancelled")
        sys.exit(0)
    
    comment = "\n".join(lines)
    
    if not comment.strip():
        print("\nError: No comment provided")
        sys.exit(1)
    
    # Save to file
    output_dir = Path(".pr-reviews")
    output_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = output_dir / f"PR_{pr_number}_{timestamp}.md"
    
    with open(filename, "w", encoding="utf-8") as f:
        f.write(f"# PR #{pr_number} Review Comment\n\n")
        f.write(f"**Date**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"**Source**: Manual entry\n\n")
        f.write("---\n\n")
        f.write(comment)
    
    print()
    print("="*80)
    print(f"✅ Saved to: {filename}")
    print("="*80)
    print()
    print("Now you can ask your AI assistant:")
    print(f"  'Fix issues in {filename}'")
    print()

if __name__ == "__main__":
    main()
