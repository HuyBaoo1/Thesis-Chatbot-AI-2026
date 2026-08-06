# Credential Revocation Status

## Runtime credential checks

| Provider | New credential verified | Old credential revoked | Status |
|---|---|---|---|
| OpenAI | VERIFIED | UNCONFIRMED | EXTERNAL_MANUAL_ACTION_REQUIRED |
| Firecrawl | VERIFIED | UNCONFIRMED | EXTERNAL_MANUAL_ACTION_REQUIRED |
| Telegram | NOT_TESTED_THIS_RUN | UNCONFIRMED | EXTERNAL_MANUAL_ACTION_REQUIRED |
| Redis | runtime valid | UNCONFIRMED | EXTERNAL_MANUAL_ACTION_REQUIRED |

## Evidence

- OpenAI: Chat/retrieval regression completed with OpenAI chat and embedding calls returning HTTP 200 in staging logs.
- Firecrawl: Single-page `/admission` diagnostic returned success with nonempty markdown through Firecrawl REST and the app SDK adapter.
- Redis: Worker startup reported Redis connection OK and queue operations succeeded.
- Telegram: No Telegram send/receive validation was performed in this run.

## Old credential revocation

Old credential revocation remains `UNCONFIRMED` for every external provider because revocation state must be checked in the provider dashboard or API using owner access. No old keys are printed or stored in this report.

## Manual action required

- OpenAI: verify old project/user API keys are revoked in the OpenAI dashboard.
- Firecrawl: verify old API keys are revoked in the Firecrawl dashboard.
- Telegram: revoke old bot token with BotFather if it was rotated.
- Redis/database: rotate old passwords in any non-staging environments that reused previous credentials.
