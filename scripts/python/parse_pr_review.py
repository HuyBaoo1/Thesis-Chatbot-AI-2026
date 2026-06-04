#!/usr/bin/env python3
"""
Parse PR review markdown to extract actionable issues.
"""
import re
import sys
from pathlib import Path
from typing import List, Dict, Any
import json


def parse_review_file(review_path: str) -> Dict[str, Any]:
    """Parse PR review markdown file and extract issues."""
    
    with open(review_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract PR metadata
    pr_number = re.search(r'# PR #(\d+):', content)
    pr_url = re.search(r'\*\*URL\*\*: (https://[^\s]+)', content)
    pr_state = re.search(r'\*\*State\*\*: (\w+)', content)
    
    # Extract issues from "Recommended focus areas for review"
    issues = []
    
    # Find all <details> blocks with issues
    details_pattern = r'<details><summary><a href=\'([^\']+)\'><strong>([^<]+)</strong></a>(.*?)</summary>\s*```(\w+)?\s*(.*?)```\s*</details>'
    
    for match in re.finditer(details_pattern, content, re.DOTALL):
        github_url, issue_type, description, language, code_snippet = match.groups()
        
        # Extract file path and line numbers from GitHub URL
        file_match = re.search(r'files#diff-[a-f0-9]+R(\d+)(?:-R(\d+))?', github_url)
        
        issue = {
            'type': issue_type.strip(),
            'description': description.strip(),
            'github_url': github_url,
            'code_snippet': code_snippet.strip() if code_snippet else '',
            'language': language or 'python',
            'severity': classify_severity(issue_type)
        }
        
        if file_match:
            issue['line_start'] = int(file_match.group(1))
            issue['line_end'] = int(file_match.group(2)) if file_match.group(2) else issue['line_start']
        
        issues.append(issue)
    
    return {
        'pr_number': int(pr_number.group(1)) if pr_number else None,
        'pr_url': pr_url.group(1) if pr_url else None,
        'pr_state': pr_state.group(1) if pr_state else 'unknown',
        'issues': issues,
        'total_issues': len(issues)
    }


def classify_severity(issue_type: str) -> str:
    """Classify issue severity based on type."""
    critical = ['security', 'bug', 'error', 'crash', 'vulnerability']
    high = ['performance', 'concurrency', 'race condition', 'memory leak', 'resource']
    medium = ['logic', 'validation', 'inconsistency', 'duplication']
    low = ['style', 'naming', 'comment', 'documentation']
    
    issue_lower = issue_type.lower()
    
    if any(word in issue_lower for word in critical):
        return 'critical'
    elif any(word in issue_lower for word in high):
        return 'high'
    elif any(word in issue_lower for word in medium):
        return 'medium'
    elif any(word in issue_lower for word in low):
        return 'low'
    else:
        return 'medium'


def generate_fix_prompt(issue: Dict[str, Any]) -> str:
    """Generate prompt for AI to fix the issue."""
    
    prompt = f"""Fix this code issue:

**Issue Type:** {issue['type']}
**Severity:** {issue['severity']}
**Description:** {issue['description']}

**Current Code:**
```{issue['language']}
{issue['code_snippet']}
```

**GitHub URL:** {issue['github_url']}

Please:
1. Analyze the issue
2. Provide the fixed code
3. Explain the fix
4. Ensure the fix doesn't break existing functionality
"""
    
    return prompt


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python parse_pr_review.py <review_file.md>")
        sys.exit(1)
    
    review_file = sys.argv[1]
    
    if not Path(review_file).exists():
        print(f"Error: Review file not found: {review_file}")
        sys.exit(1)
    
    # Parse review
    result = parse_review_file(review_file)
    
    # Output JSON for automation
    print(json.dumps(result, indent=2))
    
    # Summary
    print(f"\n📊 Summary:", file=sys.stderr)
    print(f"PR #{result['pr_number']}: {result['pr_state']}", file=sys.stderr)
    print(f"Total issues: {result['total_issues']}", file=sys.stderr)
    
    if result['issues']:
        print(f"\n🔍 Issues by severity:", file=sys.stderr)
        severity_count = {}
        for issue in result['issues']:
            severity = issue['severity']
            severity_count[severity] = severity_count.get(severity, 0) + 1
        
        for severity in ['critical', 'high', 'medium', 'low']:
            if severity in severity_count:
                print(f"  {severity.upper()}: {severity_count[severity]}", file=sys.stderr)


if __name__ == '__main__':
    main()
