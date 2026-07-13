"""Backup and disaster recovery strategy.

## Schedule (via cron or scheduled task)
- Daily: pg_dump full database → compressed .sql.gz
- Hourly: WAL archiving (if PG > 12)
- Weekly: copy to remote storage (S3/Google Cloud Storage)

## Commands
# pg_dump
PGPASSWORD=$PASSWORD pg_dump -h localhost -U postgres -d pos_db --no-owner > backup_$(date +%Y%m%d).sql

# restore
PGPASSWORD=$PASSWORD psql -h localhost -U postgres -d pos_db < backup.sql

## Recovery Steps
1. Stop app
2. Drop + recreate database
3. pg_restore / psql restore from latest backup
4. Verify row counts match
5. Start app

ponytail: command-only. Automate with pgAgent or Windows Task Scheduler.
"""

import datetime
import subprocess

BACKUP_DIR = "backups"
DB_NAME = "pos_db"
DB_USER = "postgres"
DB_HOST = "localhost"


def run_backup():
    """Run pg_dump to backup database."""
    import os

    os.makedirs(BACKUP_DIR, exist_ok=True)
    filename = f"{BACKUP_DIR}/backup_{datetime.date.today().isoformat()}.sql"
    # Use argument list instead of shell=True to prevent command injection
    cmd = ["pg_dump", "-h", DB_HOST, "-U", DB_USER, "-d", DB_NAME, "--no-owner"]
    with open(filename, "w") as f:
        result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, text=True)
    return {"success": result.returncode == 0, "file": filename, "error": result.stderr}
