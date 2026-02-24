# Auth service scripts

## init_service_accounts.go

Creates service accounts (auth-service, university-service, employment-service) in the auth DB.

**Run:** From `backend/auth-service`: `go run scripts/init_service_accounts.go`

**Requires:** Auth service running on http://localhost:8080.

---

## seed (mock data)

Seeds auth, university, and employment services with mock users and data. Run **after** init_service_accounts.

**Requires:** Auth (8080), university (8088), and employment (8089) to be up.

**Optional env:** `AUTH_URL`, `UNIVERSITY_URL`, `EMPLOYMENT_URL` (defaults: localhost:8080, 8088, 8089).

**Run:** From `backend/auth-service`: `go run ./scripts/seed`

**Idempotency:** Re-running is safe; duplicate register returns 409 and is skipped; later steps log errors and continue.
