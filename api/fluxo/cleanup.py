from __future__ import annotations

import shutil
from pathlib import Path


def cleanup_old_runs(temp_dir: Path, keep_runs: int = 10) -> None:
    temp_dir.mkdir(parents=True, exist_ok=True)
    runs = [
        path for path in temp_dir.iterdir()
        if path.is_dir() and (path.name.startswith("run_") or path.name.startswith("job_"))
    ]
    runs.sort(key=lambda path: path.stat().st_mtime, reverse=True)
    for old_run in runs[max(0, keep_runs):]:
        shutil.rmtree(old_run, ignore_errors=True)
