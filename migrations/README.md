# Database migrations

Apply numbered SQL files in ascending order before deploying application code.
Each migration must be additive or data-preserving and safe to run once.

For release `001_release_hardening.sql`:

1. Back up the Azure SQL database.
2. Apply the migration in a staging copy.
3. Validate existing routine, user, and activity-log counts.
4. Deploy API and frontend changes.
5. Run authenticated create, update, concurrency, and delete smoke tests.
