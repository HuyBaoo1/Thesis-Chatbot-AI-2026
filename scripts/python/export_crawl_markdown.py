#!/usr/bin/env python3
"""Export crawled content as Markdown files for a specific session.

Usage:
    python scripts/python/export_crawl_markdown.py
    python scripts/python/export_crawl_markdown.py --session-id <uuid>
    python scripts/python/export_crawl_markdown.py --url-filter admissions
    python scripts/python/export_crawl_markdown.py --session-id <uuid> --output-dir my-export
"""
import argparse
import os
import re
import subprocess
import sys
from pathlib import Path


CONTAINER = "web-crawler-rag_app-postgres_1"
DB_USER = "app"
DB_NAME = "app_db"


def run_sql(sql: str) -> str:
    """Run SQL query in Postgres container, return raw output."""
    cmd = [
        "podman", "exec", "-e", "PGCLIENTENCODING=UTF8",
        CONTAINER,
        "psql", "-U", DB_USER, "-d", DB_NAME,
        "-t", "-A",
        "-c", sql,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    if result.returncode != 0:
        print(f"[ERROR] DB query failed: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    return result.stdout


def list_sessions():
    """List available crawl sessions and return list of (id, target_url, strategy, status)."""
    sql = """
        SELECT id, target_url, strategy, status, created_at
        FROM crawl_sessions
        ORDER BY created_at DESC
        LIMIT 20;
    """
    output = run_sql(sql)
    sessions = []
    for line in output.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split("|")
        if len(parts) >= 4:
            sessions.append({
                "id": parts[0].strip(),
                "target_url": parts[1].strip(),
                "strategy": parts[2].strip(),
                "status": parts[3].strip(),
                "created_at": parts[4].strip() if len(parts) > 4 else "",
            })
    return sessions


def export_session(session_id: str, output_dir: str, url_filter: str = ""):
    """Export crawled URLs from a session as .md files."""
    # Get session info
    sql = f"SELECT target_url FROM crawl_sessions WHERE id = '{session_id}';"
    result = run_sql(sql).strip()
    if not result:
        print(f"[ERROR] Session not found: {session_id}", file=sys.stderr)
        sys.exit(1)
    target_url = result

    filter_clause = ""
    if url_filter:
        filter_clause = f" AND url LIKE '%{url_filter}%'"
        print(f"  URL filter: {url_filter}")

    # Count pages
    count_sql = f"""
        SELECT COUNT(*) FROM crawled_urls
        WHERE session_id = '{session_id}'
        AND status = 'CRAWLED'
        AND content IS NOT NULL
        {filter_clause};
    """
    total = int(run_sql(count_sql).strip())
    print(f"  Pages to export: {total}")

    if total == 0:
        print("No crawled content found for this session.")
        return

    # Create output dir
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    # Fetch rows one by one using COPY ... CSV for proper escaping
    # Use JSON format to avoid delimiter issues with pipe characters in content
    export_sql = f"""
        SELECT json_build_object(
            'url', url,
            'title', COALESCE(title, 'Untitled'),
            'content', content
        )
        FROM crawled_urls
        WHERE session_id = '{session_id}'
        AND status = 'CRAWLED'
        AND content IS NOT NULL
        {filter_clause}
        ORDER BY title;
    """

    output = run_sql(export_sql)
    exported = 0
    seen_names = {}

    import json

    for line in output.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            # psql may wrap JSON in extra chars, try to extract JSON object
            start = line.find("{")
            end = line.rfind("}") + 1
            if start >= 0 and end > start:
                try:
                    row = json.loads(line[start:end])
                except json.JSONDecodeError:
                    print(f"  [WARN] Skipping unparseable row", file=sys.stderr)
                    continue
            else:
                continue

        url = row.get("url", "")
        title = row.get("title", "Untitled")
        content = row.get("content", "")

        if not content or len(content) < 10:
            continue

        # Generate safe filename
        if title and title != "Untitled":
            safe_name = re.sub(r'[\\/:*?"<>|]', '_', title)
            safe_name = safe_name.strip()
            if len(safe_name) > 80:
                safe_name = safe_name[:80]
        else:
            # Use URL path
            from urllib.parse import urlparse
            path = urlparse(url).path.strip("/")
            safe_name = re.sub(r'[\\/:*?"<>|]', '_', path)
            if len(safe_name) > 80:
                safe_name = safe_name[:80]
            if not safe_name:
                safe_name = "index"

        # Handle duplicate filenames
        base_name = safe_name
        if base_name in seen_names:
            seen_names[base_name] += 1
            safe_name = f"{base_name}_{seen_names[base_name]}"
        else:
            seen_names[base_name] = 0

        file_path = os.path.join(output_dir, f"{safe_name}.md")

        # Build markdown
        md = f"""---
url: {url}
title: {title}
crawled_from: {target_url}
---

# {title}

{content}
"""
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(md)

        exported += 1

    print(f"\n=== EXPORT COMPLETED ===")
    print(f"  Session:  {session_id}")
    print(f"  Target:   {target_url}")
    print(f"  Pages:    {exported} files")
    print(f"  Output:   {output_dir}/")

    if exported > 0:
        sample = os.listdir(output_dir)[0]
        print(f"  Sample:   {sample}")


def main():
    parser = argparse.ArgumentParser(description="Export crawled content as Markdown files")
    parser.add_argument("--session-id", default="", help="Crawl session UUID (will prompt if omitted)")
    parser.add_argument("--output-dir", default="", help="Output directory (auto-generated if omitted)")
    parser.add_argument("--url-filter", default="", help="Only export URLs containing this string")
    args = parser.parse_args()

    session_id = args.session_id

    # List sessions if no session ID provided
    if not session_id:
        print("\n=== Available Crawl Sessions ===")
        sessions = list_sessions()
        if not sessions:
            print("No crawl sessions found.")
            sys.exit(0)

        for i, s in enumerate(sessions, 1):
            print(f"  [{i}] {s['target_url']}  |  {s['strategy']}  |  {s['status']}  |  {s['created_at']}")

        print()
        choice = input("Enter session number to export (1-{}), or 'q' to quit: ".format(len(sessions)))
        if choice.lower() in ("q", ""):
            sys.exit(0)

        try:
            idx = int(choice) - 1
            if idx < 0 or idx >= len(sessions):
                print("Invalid choice.")
                sys.exit(1)
            session_id = sessions[idx]["id"]
        except ValueError:
            print("Invalid input.")
            sys.exit(1)

    # Set output directory
    output_dir = args.output_dir
    if not output_dir:
        # Get target URL for directory name
        sql = f"SELECT target_url FROM crawl_sessions WHERE id = '{session_id}';"
        target = run_sql(sql).strip()
        safe = re.sub(r'https?://', '', target)
        safe = re.sub(r'[^a-zA-Z0-9.-]', '_', safe)
        from datetime import datetime
        ts = datetime.now().strftime("%Y%m%d-%H%M%S")
        output_dir = f"export-md-{safe}-{ts}"

    print(f"\nExporting session: {session_id}")
    export_session(session_id, output_dir, args.url_filter)


if __name__ == "__main__":
    main()
