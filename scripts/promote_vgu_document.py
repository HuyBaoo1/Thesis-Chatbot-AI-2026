from __future__ import annotations

import argparse
import json
from pathlib import Path

from src.services.vgu_crawl_artifact_service import promote_reviewed_document


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Promote a human-verified VGU reviewed Markdown file into vgu_admissions_import."
    )
    parser.add_argument("reviewed_file", help="Path to reviewed Markdown with 'Review status: verified'.")
    parser.add_argument("--target-name", help="Stable Markdown file name inside the import folder.")
    parser.add_argument("--import-dir", default=None, help="Import directory. Defaults to configured VGU_IMPORT_DIR.")
    parser.add_argument(
        "--sources-manifest",
        default=None,
        help="crawl_sources.json path. Defaults to <import-dir>/crawl_sources.json.",
    )
    args = parser.parse_args()

    result = promote_reviewed_document(
        Path(args.reviewed_file),
        import_dir=args.import_dir,
        target_name=args.target_name,
        sources_manifest_path=args.sources_manifest,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
