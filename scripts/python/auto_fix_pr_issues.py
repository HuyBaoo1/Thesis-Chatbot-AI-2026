#!/usr/bin/env python3
"""
Automatically fix PR review issues using AI.
This script reads parsed issues and generates fix commits.
"""
import json
import sys
import subprocess
from pathlib import Path
from typing import List, Dict, Any


def create_fix_branch(pr_number: int) -> str:
    """Create a new branch for fixes."""
    branch_name = f"auto-fix-pr-{pr_number}"
    
    try:
        # Check if branch exists
        result = subprocess.run(
            ['git', 'rev-parse', '--verify', branch_name],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            # Branch exists, switch to it
            subprocess.run(['git', 'checkout', branch_name], check=True)
        else:
            # Create new branch
            subprocess.run(['git', 'checkout', '-b', branch_name], check=True)
        
        return branch_name
    except subprocess.CalledProcessError as e:
        print(f"Error creating branch: {e}")
        return None


def generate_fix_instructions(issues: List[Dict[str, Any]]) -> str:
    """Generate comprehensive fix instructions for all issues."""
    
    instructions = """# Auto-Fix PR Review Issues

Please fix the following issues found by PR review bot:

"""
    
    for i, issue in enumerate(issues, 1):
        instructions += f"""
## Issue {i}: {issue['type']} ({issue['severity'].upper()})

**Description:**
{issue['description']}

**Location:** {issue.get('github_url', 'N/A')}

**Current Code:**
```{issue['language']}
{issue['code_snippet']}
```

**Required Fix:**
- Analyze the issue carefully
- Fix the code following best practices
- Ensure no breaking changes
- Add comments if needed

---
"""
    
    return instructions


def save_fix_instructions(instructions: str, output_file: str = '.pr-reviews/fix-instructions.md'):
    """Save fix instructions to file."""
    Path(output_file).parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(instructions)
    
    print(f"✅ Fix instructions saved to: {output_file}")
    return output_file


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python auto_fix_pr_issues.py <parsed_issues.json>")
        sys.exit(1)
    
    issues_file = sys.argv[1]
    
    # Load parsed issues
    with open(issues_file, 'r') as f:
        data = json.load(f)
    
    pr_number = data.get('pr_number')
    issues = data.get('issues', [])
    
    if not issues:
        print("✅ No issues to fix!")
        sys.exit(0)
    
    print(f"🔧 Found {len(issues)} issues to fix in PR #{pr_number}")
    
    # Generate fix instructions
    instructions = generate_fix_instructions(issues)
    instructions_file = save_fix_instructions(instructions)
    
    print(f"\U0001f4dd Next steps:")
    print(f"1. Review instructions: cat {instructions_file}")
    print(f"2. Use any AI tool to fix issues:")
    print(f"   - Cursor: open {instructions_file} and ask to fix")
    print(f"   - Claude Code: claude --file {instructions_file}")
    print(f"   - Windsurf/Cascade: open {instructions_file} in Cascade")
    print(f"   - Kiro: kiro fix --file {instructions_file}")
    print(f"   - Codex: codex --file {instructions_file}")
    print(f"   - Gemini CLI: gemini fix --file {instructions_file}")
    print(f"3. Or run manual fixes based on instructions")


if __name__ == '__main__':
    main()
