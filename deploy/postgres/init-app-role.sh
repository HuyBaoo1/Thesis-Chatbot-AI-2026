#!/bin/sh
set -eu

if [ -z "${APP_DATABASE_USER:-}" ] || [ -z "${APP_DATABASE_PASSWORD:-}" ]; then
	echo "FATAL: APP_DATABASE_USER and APP_DATABASE_PASSWORD must be set for app role initialization" >&2
	exit 1
fi

case "$APP_DATABASE_USER" in
	"" | [0-9]* | *[!A-Za-z0-9_]*)
		echo "FATAL: APP_DATABASE_USER must be a simple PostgreSQL role identifier" >&2
		exit 1
		;;
esac

case "$POSTGRES_USER" in
	"" | [0-9]* | *[!A-Za-z0-9_]*)
		echo "FATAL: POSTGRES_USER must be a simple PostgreSQL role identifier" >&2
		exit 1
		;;
esac

case "$POSTGRES_DB" in
	"" | *[!A-Za-z0-9_]*)
		echo "FATAL: POSTGRES_DB must be a simple PostgreSQL database identifier" >&2
		exit 1
		;;
esac

app_password_escaped=$(printf "%s" "$APP_DATABASE_PASSWORD" | sed "s/'/''/g")

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
DO \$\$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '${APP_DATABASE_USER}') THEN
		EXECUTE 'CREATE ROLE "${APP_DATABASE_USER}" LOGIN PASSWORD ''${app_password_escaped}''';
	ELSE
		EXECUTE 'ALTER ROLE "${APP_DATABASE_USER}" WITH LOGIN PASSWORD ''${app_password_escaped}''';
	END IF;
END
\$\$;

GRANT CONNECT ON DATABASE "${POSTGRES_DB}" TO "${APP_DATABASE_USER}";
GRANT USAGE ON SCHEMA public TO "${APP_DATABASE_USER}";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${APP_DATABASE_USER}";
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO "${APP_DATABASE_USER}";
ALTER DEFAULT PRIVILEGES FOR ROLE "${POSTGRES_USER}" IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${APP_DATABASE_USER}";
ALTER DEFAULT PRIVILEGES FOR ROLE "${POSTGRES_USER}" IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO "${APP_DATABASE_USER}";
EOSQL
