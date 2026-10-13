# Spec: Task 2 - Supabase Database Schema & Row-Level Security (RLS) Policies

## Assumptions
1. **Database Engine**: PostgreSQL 16 (aligned with Supabase PostgreSQL and local Docker Compose `postgres:16-alpine`).
2. **Auth Integration**: Primary tenant identity references Supabase's `auth.users(id)` as `UUID`. For local offline testing, mock `auth.uid()` functions or a standalone schema compatibility layer will allow running and testing RLS policies without requiring cloud Supabase dependencies.
3. **Migration Format**: Pure, versioned SQL migration scripts located in `supabase/migrations/` following the timestamp naming convention (`<YYYYMMDDHHMMSS>_<description>.sql`).
4. **Seed Data**: Indian statutory charge rates (STT, GST, Exchange charges, SEBI fees, Stamp duty) seeded into `charge_rates` with effective dates so fee computations remain historicized and editable.
5. **Security Model**: Strict Multi-Tenant Row-Level Security (RLS) enabled on all 14 tenant tables. Default access is `DENY ALL` unless permitted by explicit `auth.uid() = user_id` policies.

## Objective
Design and implement the complete PostgreSQL database schema and multi-tenant security barrier for TradeLens. This foundation guarantees:
- Complete relational data storage for user profiles, broker imports, raw fill history, deterministic round-trip trades, statistical snapshots, AI behavioral insights, rulebook definitions, and replay runs.
- Deterministic auditability: Raw fills are permanently stored for traceability, while paired trades and charge breakdowns are historicized.
- Zero cross-user data leakage: Every user-facing table enforces PostgreSQL Row-Level Security (RLS), mathematically blocking cross-tenant queries at the database engine level.
- Editable Indian statutory fee lookup tables seeded with valid regulatory defaults.

## Tech Stack
- **Database Engine**: PostgreSQL 16
- **Migration & Management Tooling**: Supabase CLI / standard psql migration scripts
- **Schema Validation & Tests**: Python `pytest` with `psycopg` (or `asyncpg` / `SQLAlchemy`) in `services/analytics/tests/test_db_schema.py`
- **Data Modeling**: Relational SQL DDL with UUID v4 primary keys, JSONB for flexible analytical payloads, and TIMESTAMPTZ for exact IST execution stamps

## Commands

### Local Migration & DB Commands
```powershell
# Start local PostgreSQL container (if not already running)
docker-compose up -d

# Apply database migrations to local PostgreSQL
Get-Content supabase/migrations/20261012000001_initial_schema.sql | docker exec -i tradelens-postgres psql -U postgres -d tradelens
Get-Content supabase/migrations/20261012000002_rls_policies.sql | docker exec -i tradelens-postgres psql -U postgres -d tradelens

# Apply statutory charge rates seed data
Get-Content supabase/seed.sql | docker exec -i tradelens-postgres psql -U postgres -d tradelens

# Or via Supabase CLI (if installed)
supabase db reset
supabase db lint
```

### Schema & RLS Verification Tests
```powershell
# Run automated schema and cross-tenant RLS penetration test
.\services\analytics\.venv\Scripts\pytest services/analytics/tests/test_db_schema.py -v
```

## Project Structure
```
D:\resume\sdd/
├── supabase/
│   ├── migrations/
│   │   ├── 20261012000001_initial_schema.sql   # Core tables, constraints, indexes & foreign keys
│   │   └── 20261012000002_rls_policies.sql    # RLS enablement & tenant policies (auth.uid() = user_id)
│   └── seed.sql                               # Seed data: Indian statutory fee rates & segment schedules
├── services/
│   └── analytics/
│       └── tests/
│           └── test_db_schema.py              # Automated pytest verifying tables and RLS isolation
└── specs/
    ├── SPEC-task1-monorepo.md
    └── SPEC-task2-database-schema.md
```

## Database Tables Specification

### 1. `profiles`
- `id` (UUID, PK, REFERENCES `auth.users(id)` ON DELETE CASCADE)
- `email` (TEXT NOT NULL)
- `display_name` (TEXT)
- `timezone` (TEXT NOT NULL DEFAULT 'Asia/Kolkata')
- `starting_capital` (NUMERIC(14, 2) DEFAULT 0.00)
- `trading_segments` (TEXT[] DEFAULT ARRAY['EQUITY', 'FNO'])
- `role` (TEXT NOT NULL DEFAULT 'trader' CHECK (role IN ('trader', 'coach', 'client_admin', 'platform_admin')))
- `created_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW())

### 2. `organizations` & `organization_memberships`
- `organizations`: `id` (UUID PK), `name` (TEXT NOT NULL), `created_at` (TIMESTAMPTZ).
- `organization_memberships`: `id` (UUID PK), `organization_id` (UUID REFERENCES `organizations`), `user_id` (UUID REFERENCES `profiles`), `role` (TEXT), `created_at`.

### 3. `coach_access`
- `id` (UUID PK), `trader_id` (UUID REFERENCES `profiles`), `coach_id` (UUID REFERENCES `profiles`), `status` (TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked'))), `granted_at` (TIMESTAMPTZ), `revoked_at` (TIMESTAMPTZ).

### 4. `imports`
- `id` (UUID PK DEFAULT gen_random_uuid()), `user_id` (UUID NOT NULL REFERENCES `profiles`), `broker` (TEXT NOT NULL), `file_name` (TEXT NOT NULL), `status` (TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed'))), `total_rows` (INT DEFAULT 0), `imported_rows` (INT DEFAULT 0), `skipped_rows` (INT DEFAULT 0), `error_report` (JSONB DEFAULT '[]'::jsonb), `created_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW()).

### 5. `raw_fills`
- `id` (UUID PK DEFAULT gen_random_uuid()), `import_id` (UUID NOT NULL REFERENCES `imports` ON DELETE CASCADE), `user_id` (UUID NOT NULL REFERENCES `profiles`), `trade_date` (DATE NOT NULL), `fill_time` (TIMESTAMPTZ NOT NULL), `symbol` (TEXT NOT NULL), `trade_type` (TEXT NOT NULL CHECK (trade_type IN ('BUY', 'SELL'))), `quantity` (NUMERIC(12, 2) NOT NULL), `price` (NUMERIC(12, 4) NOT NULL), `order_id` (TEXT), `trade_id` (TEXT NOT NULL), `raw_data` (JSONB NOT NULL), `created_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW()).
- *Unique Constraint*: `UNIQUE (user_id, trade_id)` (prevents double-counting duplicate fills across imports).

### 6. `trades` (Paired Round-Trip Trades)
- `id` (UUID PK DEFAULT gen_random_uuid()), `user_id` (UUID NOT NULL REFERENCES `profiles`), `import_id` (UUID REFERENCES `imports` ON DELETE SET NULL), `symbol` (TEXT NOT NULL), `segment` (TEXT NOT NULL CHECK (segment IN ('EQUITY_DELIVERY', 'EQUITY_INTRADAY', 'FUTURES', 'OPTIONS'))), `instrument_type` (TEXT NOT NULL CHECK (instrument_type IN ('EQ', 'FUT', 'CE', 'PE'))), `entry_time` (TIMESTAMPTZ NOT NULL), `exit_time` (TIMESTAMPTZ NOT NULL), `trade_duration_seconds` (INT NOT NULL), `is_intraday` (BOOLEAN NOT NULL), `is_short` (BOOLEAN NOT NULL), `quantity` (NUMERIC(12, 2) NOT NULL), `entry_price` (NUMERIC(12, 4) NOT NULL), `exit_price` (NUMERIC(12, 4) NOT NULL), `gross_pnl` (NUMERIC(14, 2) NOT NULL), `charges` (NUMERIC(12, 2) NOT NULL), `net_pnl` (NUMERIC(14, 2) NOT NULL), `tags` (TEXT[] DEFAULT '{}'), `notes` (TEXT), `created_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW()).

### 7. `charge_rates` (Public Regulatory Fee Table)
- `id` (UUID PK DEFAULT gen_random_uuid()), `segment` (TEXT NOT NULL), `effective_from` (DATE NOT NULL), `effective_to` (DATE), `stt_rate_buy` (NUMERIC(8, 6) DEFAULT 0), `stt_rate_sell` (NUMERIC(8, 6) DEFAULT 0), `brokerage_per_order` (NUMERIC(8, 2) DEFAULT 20.00), `exchange_turnover_rate` (NUMERIC(8, 6) NOT NULL), `sebi_turnover_rate` (NUMERIC(10, 8) NOT NULL), `gst_rate` (NUMERIC(6, 4) DEFAULT 0.18), `stamp_duty_rate_buy` (NUMERIC(8, 6) NOT NULL), `created_at` (TIMESTAMPTZ DEFAULT NOW()).

### 8. `stats_snapshots`
- `id` (UUID PK DEFAULT gen_random_uuid()), `user_id` (UUID NOT NULL REFERENCES `profiles`), `date_range_start` (DATE NOT NULL), `date_range_end` (DATE NOT NULL), `metrics` (JSONB NOT NULL), `behavior_metrics` (JSONB NOT NULL), `hash` (TEXT NOT NULL), `calculated_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW()).

### 9. `insights`
- `id` (UUID PK DEFAULT gen_random_uuid()), `user_id` (UUID NOT NULL REFERENCES `profiles`), `top_leaks` (JSONB NOT NULL), `suggested_rules` (JSONB NOT NULL), `confidence_notes` (TEXT), `model_used` (TEXT NOT NULL), `stats_hash` (TEXT NOT NULL), `created_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW()).

### 10. `rules` (Personal Rulebook)
- `id` (UUID PK DEFAULT gen_random_uuid()), `user_id` (UUID NOT NULL REFERENCES `profiles`), `rule_type` (TEXT NOT NULL), `rule_payload` (JSONB NOT NULL), `natural_language_text` (TEXT), `is_active` (BOOLEAN NOT NULL DEFAULT TRUE), `created_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW()), `updated_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW()).

### 11. `rule_runs` (Simulation & Overfitting Runs)
- `id` (UUID PK DEFAULT gen_random_uuid()), `user_id` (UUID NOT NULL REFERENCES `profiles`), `rule_id` (UUID REFERENCES `rules` ON DELETE CASCADE), `date_range_start` (DATE NOT NULL), `date_range_end` (DATE NOT NULL), `before_metrics` (JSONB NOT NULL), `after_metrics` (JSONB NOT NULL), `skipped_trade_ids` (UUID[] NOT NULL), `is_overfit_flag` (BOOLEAN DEFAULT FALSE), `created_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW()).

### 12. `reports` (Weekly Performance Summaries)
- `id` (UUID PK DEFAULT gen_random_uuid()), `user_id` (UUID NOT NULL REFERENCES `profiles`), `period_start` (DATE NOT NULL), `period_end` (DATE NOT NULL), `content` (JSONB NOT NULL), `delivered_email` (BOOLEAN DEFAULT FALSE), `created_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW()).

### 13. `audit_log`
- `id` (UUID PK DEFAULT gen_random_uuid()), `user_id` (UUID REFERENCES `profiles`), `action` (TEXT NOT NULL), `resource` (TEXT NOT NULL), `ip_address` (TEXT), `metadata` (JSONB), `created_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW()).

### 14. `ai_usage`
- `id` (UUID PK DEFAULT gen_random_uuid()), `user_id` (UUID NOT NULL REFERENCES `profiles`), `calls_count` (INT DEFAULT 1), `prompt_tokens` (INT NOT NULL), `completion_tokens` (INT NOT NULL), `cost_usd` (NUMERIC(8, 4) NOT NULL), `created_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW()).

---

## Row-Level Security (RLS) Policy Design

Every tenant table executes:
```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
```

Policies are partitioned into explicit standard operations:
```sql
-- SELECT: Users can only view their own records
CREATE POLICY "tenant_select_<table_name>" ON <table_name>
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can only insert records belonging to their own user_id
CREATE POLICY "tenant_insert_<table_name>" ON <table_name>
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own records
CREATE POLICY "tenant_update_<table_name>" ON <table_name>
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own records
CREATE POLICY "tenant_delete_<table_name>" ON <table_name>
  FOR DELETE
  USING (auth.uid() = user_id);
```

For `charge_rates` (Public Regulatory Data):
```sql
ALTER TABLE charge_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_charge_rates" ON charge_rates
  FOR SELECT
  TO authenticated, anon
  USING (true);
```

For `coach_access`:
- Trader and coach can both SELECT if active access exists.
- Only trader can revoke or grant.

---

## Code Style

### PostgreSQL DDL Conventions
- Lowercase snake_case for all table names, column names, constraints, and indexes.
- Explicit primary keys with UUID v4 (`gen_random_uuid()`).
- Foreign keys specify `ON DELETE CASCADE` or `ON DELETE SET NULL` explicitly.
- Indexes created for high-cardinality filter and join columns (`user_id`, `(user_id, symbol)`, `(user_id, entry_time)`).

```sql
-- Example index convention
CREATE INDEX idx_trades_user_entry_time ON trades (user_id, entry_time DESC);
CREATE INDEX idx_raw_fills_user_trade ON raw_fills (user_id, trade_id);
```

## Testing Strategy
- **Framework**: `pytest` running `services/analytics/tests/test_db_schema.py`.
- **Database Connection**: Tests connect to local PostgreSQL (Docker container on port 5432).
- **Test Scenarios**:
  1. **Schema Integrity**: Assert all 14 tables exist with expected columns, data types, and foreign key relations.
  2. **RLS Policy Verification**: Set simulated session role `SET LOCAL "request.jwt.claim.sub" = '<tenant_a_uuid>'` and assert:
     - Tenant A can insert and read their own records.
     - Tenant B cannot read Tenant A's records (zero rows returned).
     - Tenant B attempting to update or delete Tenant A's records modifies 0 rows.
  3. **Duplicate Protection**: Verify that inserting a duplicate `(user_id, trade_id)` in `raw_fills` raises a unique violation error.
  4. **Charge Rates Seeding**: Assert `charge_rates` contains active defaults for Equity Delivery, Intraday, Futures, and Options.

## Boundaries
- **Always do**:
  - Enable RLS on every table that stores user data.
  - Define explicit `WITH CHECK` clauses on INSERT and UPDATE policies to prevent a user from inserting another user's ID.
  - Create indexes on `user_id` for every tenant table to maintain fast RLS query planning.
- **Ask first**:
  - Adding new user roles beyond `trader`, `coach`, `client_admin`, `platform_admin`.
  - Changing monetary column precision (e.g. `NUMERIC(14, 2)`).
- **Never do**:
  - Store unencrypted passwords or API tokens in any database table.
  - Use `DISABLE ROW LEVEL SECURITY` in any migration or production script.
  - Create tables without `created_at` audit timestamps.

## Success Criteria
- [ ] `supabase/migrations/20261012000001_initial_schema.sql` cleanly applies to local PostgreSQL without SQL errors.
- [ ] `supabase/migrations/20261012000002_rls_policies.sql` enables RLS and configures CRUD policies on all tenant tables.
- [ ] `supabase/seed.sql` populates statutory Indian charges for Equity, Futures, and Options segments.
- [ ] `pytest services/analytics/tests/test_db_schema.py` passes 100%, proving cross-user data isolation.
- [ ] An unauthorized query from User B attempting to read User A's trades returns exactly 0 rows.

## Open Questions
1. Should `organizations` and `coach_access` be applied in this initial migration, or isolated behind a separate phase migration? *(Recommended: Include in initial migration for clean foreign keys, but keep Coach UI toggled behind a feature flag).*
2. For local testing without full Supabase cloud auth, is using PostgreSQL session variables (`SET LOCAL "request.jwt.claim.sub" = '...'` or mock `auth.uid()`) acceptable for verifying RLS policies?
