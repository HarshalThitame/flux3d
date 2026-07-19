# Backup & Restoration Runbook

## Current Setup

- **Database**: Supabase Postgres (hosted)
- **Backup Type**: Daily automated backups (Supabase Pro plan)
- **Backup Retention**: 7 days (point-in-time recovery available)
- **Storage**: Supabase Storage (file assets)
- **Code**: GitHub (automatic)

## Backup Verification Procedure

### Manual verification (run monthly)

```bash
# 1. Clone the database to a temporary local instance
supabase db dump --db-url $SUPABASE_URL -f /tmp/backup-verify.sql

# 2. Create a temporary PostgreSQL instance
docker run -d --name verify-restore \
  -e POSTGRES_PASSWORD=verify \
  -p 54325:5432 postgres:16

# 3. Restore the backup
psql postgresql://postgres:verify@localhost:54325/postgres < /tmp/backup-verify.sql

# 4. Run health queries
psql postgresql://postgres:verify@localhost:54325/postgres -c "
  SELECT COUNT(*) as users FROM auth.users;
  SELECT COUNT(*) as orders FROM orders;
  SELECT COUNT(*) as payments FROM payment_attempts;
  SELECT COUNT(*) as reservations FROM inventory_reservations;
"

# 5. Clean up
docker stop verify-restore && docker rm verify-restore
```

## Restoration Procedure

### Full restoration to a new Supabase project

```bash
# 1. Download the latest backup from Supabase Dashboard
#    Settings → Database → Backups → Download

# 2. Create a new Supabase project

# 3. Apply the backup
psql $NEW_SUPABASE_URL < backup-file.sql

# 4. Re-run all migrations to catch any schema changes after the backup
supabase db push --db-url $NEW_SUPABASE_URL

# 5. Verify
#    - Check user count matches
#    - Check order count matches
#    - Verify payment data integrity
#    - Test a login flow
```

## RPO (Recovery Point Objective)

- **Current**: 24 hours (daily backups)
- **Target**: 1 hour
- **How to improve**: Enable Supabase Point-in-Time Recovery (PITR) — retains 7 days of 1-minute granularity

## RTO (Recovery Time Objective)

- **Current**: ~2 hours (download backup + restore + verify)
- **Target**: 30 minutes
- **How to improve**: Automate restoration with a script; pre-provision a standby project

## Disaster Recovery Scenarios

### Scenario A: Database corruption

1. **Detect**: Monitor alerts from health check endpoint
2. **Stop**: Pause write operations (disable webhooks)
3. **Assess**: Determine the extent of corruption
4. **Restore**: Restore from the latest clean backup
5. **Verify**: Run data integrity checks
6. **Resume**: Re-enable webhooks, notify users

### Scenario B: Accidental data deletion

1. **Identify**: Find the exact time of deletion
2. **Restore**: Use Supabase PITR to restore to 1 minute before deletion
3. **Extract**: Extract only the deleted rows
4. **Reinsert**: Insert into the production database

### Scenario C: Region failure (Supabase outage)

1. **Fail over**: Point the application to a standby Supabase project
2. **Update env vars**: Change `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
3. **Redeploy**: Run `vercel --prod` to apply new env vars
4. **Verify**: Health check endpoint should return `ok`
