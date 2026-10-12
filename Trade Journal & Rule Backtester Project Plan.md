# Trade Journal & Rule Backtester: Project Plan

Working name: TradeLens (placeholder) · Draft v1 · October 12, 2026

## 1. Overview

**Problem.** Most retail traders in India lose money because of behavior, not because of a bad strategy. They overtrade, re-enter right after a loss, hold losers too long, and trade at the worst times of day. Existing journals show charts but rarely turn findings into rules the trader can test.

**Solution.** A web app where a trader uploads broker trade history, sees exactly where money is being lost, gets a plain-language AI explanation, converts the leak into a trading rule, and replays that rule on their own past trades to see the before/after impact.

**Core loop.** Upload trades, find the leak, turn it into a rule, replay it on history, compare before and after.

**Design principle.** The AI explains and proposes. Deterministic code (Python and pandas) does every calculation. The AI never computes P&L.

**Positioning.** Educational analysis of the user's own behavior. The app does not recommend what to buy or sell and does not place orders.

## 2. Goals and Success Metrics

**Goals**

- Give a trader a clear answer to: where exactly am I losing money, and what would have happened if I had followed a rule?
- Be accurate enough that traders trust the numbers.
- Be simple enough that a new user gets a first insight within minutes.
- Be safe enough to hold real financial data for real clients.

**Success metrics (targets to agree with the client)**

- Import success: at least 95% of valid files from supported brokers import without manual fixes.
- Accuracy: P&L matches the broker's own P&L statement on sample files within an agreed tolerance.
- Speed: signup to first insight in under 5 minutes; dashboard loads in under 3 seconds for 5,000 trades.
- Engagement: share of users who create at least one rule and return the following week.
- Reliability: no cross-user data exposure, ever.

## 3. Users and Roles

- **Trader:** uploads trades, views analytics, creates and tests rules, reads reports.
- **Coach or team lead (if the client is a coach, prop firm or education company):** sees a dashboard of their assigned traders, with each trader's key stats and risk flags. Sees data only for traders who have granted access.
- **Client admin:** manages the organization, invites users, views usage.
- **Platform admin (you):** support access with audit logging, no casual browsing of user data.

The exact role set depends on who the client is. A single-trader client needs only the Trader role.

## 4. Scope

**In scope for Version 1**

- Email and Google login
- CSV upload for one primary broker format plus a column-mapping fallback
- Trade cleaning, pairing and P&L engine
- Analytics dashboard
- AI insights (explanations of computed stats)
- Rule Lab: rule overlay replay on the user's own trades
- Weekly report
- Coach dashboard (if the client needs it)
- Data export and deletion

**Out of scope for Version 1 (Phase 2 candidates)**

- Market-data backtester (strategies like RSI on Nifty 50)
- Live broker API connection
- Order placement of any kind
- Mobile app (the web app will be mobile-friendly)
- Payments and subscriptions, unless the client requires them at launch
- Alerts through WhatsApp or Telegram

## 5. Feature Specification

Priority: Must (needed for launch), Should (strongly wanted), Could (if time allows).

### 5.1 Accounts and Access (Must)

- Signup and login with email and password plus Google sign-in
- Email verification and password reset
- Profile: name, timezone (default IST), trading segments, starting capital (optional, used for percentage metrics)
- Roles and organization membership
- Row-level security so each user can read only their own records

### 5.2 Trade Import (Must)

- Drag-and-drop CSV upload with file size and type checks
- Auto-detect the broker format from the headers. Start with the client's most-used broker (for example Zerodha tradebook), then add others
- Column-mapping screen for unknown formats: user maps date, symbol, buy/sell, quantity, price, time
- Validation report after upload: rows imported, rows skipped, and the reason for each skip
- Duplicate detection using trade ID, so re-uploading a file does not double count
- Import history with the ability to delete one import
- Support for multiple uploads that merge into one trade history

### 5.3 Trade Processing and P&L Engine (Must)

- Normalize symbols and instrument types: equity, futures, options (CE/PE), expiry, strike, lot size
- Pair buy and sell fills into round-trip trades using FIFO, with support for partial fills and scaling in and out
- Handle intraday vs positional trades and short selling
- Compute gross P&L, charges (brokerage, STT, exchange fees, GST, stamp duty) and net P&L
- Charges handled either from an editable rate table or imported from the broker's file if available
- Flag edge cases for review instead of guessing: unmatched sells, expiry-day settlements, corporate actions, bonus and split adjustments
- Reconciliation view: app P&L vs the broker's P&L statement, with the difference explained

### 5.4 Analytics Dashboard (Must)

- Summary cards: net P&L, win rate, average win, average loss, profit factor, expectancy, max drawdown, longest winning and losing streak
- Equity curve and drawdown chart
- P&L breakdowns by hour of day, weekday, instrument, segment, expiry day vs non-expiry day, and holding time
- Calendar heatmap of daily P&L
- Behavior metrics:
  - Re-entry after loss: share of trades opened within a set number of minutes of a losing exit, and their win rate
  - Overtrading: days with trades above the user's normal, and the P&L on those days
  - Position size creep: size increases after losses
  - Winners cut early and losers held long: compare average holding time of wins vs losses
- Filters: date range, segment, instrument, tag
- Trade table with sorting, search and the ability to add notes and tags (for example: FOMO, revenge, planned)

### 5.5 AI Insights (Must)

- The backend computes all stats first. Only those computed stats (not raw trades where avoidable) are sent to the AI
- The AI returns structured output: top 3 leaks, evidence for each (with the numbers), and one suggested rule per leak
- Each insight shows the trade count behind it and a confidence note when the sample is small
- Insights are written in simple English, with Hindi and Gujarati as a later option
- Ask-your-data chat (Should): questions like 'how did I do on expiry days?' are answered by the AI calling safe, predefined query tools, not by writing SQL against the database
- Guardrails: no buy or sell recommendations, no predictions, no guarantees

### 5.6 Rule Lab: Replay on Your Own Trades (Must)

This is the key differentiator.

**How it works**

1. The user picks a suggested rule or types one in plain language.
2. The AI converts it into a structured JSON rule from a fixed catalog.
3. The backend validates the JSON. Anything outside the catalog is rejected.
4. A deterministic engine replays the user's past trades in time order, skipping or modifying trades that violate the rule.
5. The app shows before vs after results.

**Rule catalog for V1**

- Cooldown after a loss (N minutes)
- Stop trading for the day after N consecutive losses
- Daily loss limit (amount or percent of capital)
- Maximum trades per day
- No new trades after a set time, or before a set time
- Maximum position size (quantity or lots)
- Skip a given instrument type (for example weekly options)
- No trading on expiry day
- Combine multiple rules (all must apply)

**Output**

- Net P&L before vs after, trades skipped, win rate, max drawdown, and an equity curve comparison
- A list of the specific trades the rule would have skipped
- Honest warnings shown in the UI:
  - Replay is an approximation, because skipping a trade changes what the trader would have done next
  - Warn if fewer than about 30 trades are affected
  - Overfitting check: the app finds the rule on the first 70% of trades and shows how it performs on the last 30%
- Save a rule as a personal trading rulebook
- Adherence tracking (Should): after the rule is saved, new uploads show whether the trader followed it

### 5.7 Weekly Report (Should)

- Automatic summary every week: P&L, best and worst day, rule violations, biggest leak, and one focus for next week
- Delivered by email and viewable in the app
- Downloadable as PDF

### 5.8 Coach Dashboard (Must if the client is a coach or firm, otherwise skip)

- Trader invites with explicit consent, and the trader can revoke access at any time
- List of traders with traffic-light risk flags (rule violations, large drawdown, sudden size increase)
- Drill into a trader's dashboard in read-only mode
- Coach notes on a trader or a specific trade
- Assign a rule to a trader and track whether it is followed
- Cohort view: average win rate and the most common leak across all traders

### 5.9 Settings and Data Control (Must)

- Export all personal data as CSV
- Delete an import, or delete the entire account and all data
- Consent management and a privacy policy page
- Notification preferences

### 5.10 Admin and Operations (Should)

- Admin dashboard: users, imports, failed imports, AI usage and cost
- Audit log for any admin access to user data
- Feature flags for staged rollout

## 6. Key User Flows

**New trader**

1. Sign up and verify email.
2. Upload a CSV, with the app confirming the broker format.
3. Review the validation report and fix any flagged rows.
4. See the dashboard and the AI insight cards.
5. Click 'Test this rule' on a suggested rule.
6. See the before/after result and save the rule.

**Returning trader**

1. Upload the latest week of trades.
2. See what changed, and whether saved rules were followed.
3. Read the weekly report.

**Coach**

1. Invite traders.
2. Review the cohort dashboard and flagged traders.
3. Leave a note or assign a rule.

## 7. Architecture and Tech Stack

**Suggested stack**

- **Frontend:** Next.js with TypeScript, Tailwind CSS, and a chart library (Recharts, or TradingView Lightweight Charts for the equity curve)
- **Auth, database and storage:** Supabase (Postgres, authentication, file storage, row-level security)
- **Analytics service:** Python with FastAPI and pandas for parsing, P&L, metrics and the rule engine
- **AI:** Claude API with structured (JSON) outputs
- **Hosting:** Vercel for the frontend, a small container host (for example Railway, Render or Fly.io) for the Python service
- **Monitoring:** Sentry for errors, uptime monitoring, and structured logs
- **Email:** a transactional provider such as Resend for verification emails and weekly reports
- **Background jobs:** a scheduled worker for report generation and large imports

**Request flow**

1. The browser uploads the CSV to private storage.
2. The Python service parses it, writes cleaned trades to Postgres, and computes stats.
3. The frontend reads stats from Postgres.
4. When insights are requested, the backend sends computed stats to the AI and stores the structured result.
5. For the Rule Lab, the AI returns a JSON rule, the backend validates it, and the Python engine runs the replay.

## 8. Data Model (Core Tables)

- **profiles:** user id, name, timezone, capital, role
- **organizations and memberships:** for coach or firm setups
- **coach\_access:** trader, coach, status, granted and revoked timestamps
- **imports:** user, broker, file name, status, row counts, error report
- **raw\_fills:** every imported row as received, for traceability
- **trades:** paired round-trip trades with instrument, entry and exit time, quantity, gross P&L, charges, net P&L, and tags
- **charge\_rates:** editable fee rates by segment and effective date
- **stats\_snapshots:** cached computed metrics per user and date range
- **insights:** AI output, the stats it was based on, model used, and timestamp
- **rules:** structured JSON, source text, owner, active flag
- **rule\_runs:** the rule, date range, before and after metrics, skipped trade IDs
- **reports:** weekly report content and delivery status
- **audit\_log:** admin access and sensitive actions
- **ai\_usage:** calls, tokens and cost per user, used for limits

Every table that holds user data has a user\_id and a row-level security policy.

## 9. Accuracy Plan

Traders stop using the app the moment numbers look wrong, so this is the most important engineering area.

- Write unit tests with known answers for every calculation: FIFO pairing, partial fills, short trades, option expiry, charges, drawdown and streaks
- Collect 3 to 5 real anonymized sample files from the client, along with the broker's own P&L statements, and use them as reconciliation tests
- Keep a visible reconciliation screen for users, with differences explained
- Flag uncertain cases for the user to review instead of silently guessing
- Pin lot sizes and charge rates by effective date, since they change over time
- Version the rule engine so past results remain reproducible

## 10. AI Design

- **Separation of duties:** AI writes explanations and proposes rules. Code computes numbers and enforces rules.
- **Structured output:** every AI response is JSON validated against a schema. Invalid output is retried once, then fails gracefully.
- **Fixed rule catalog:** the AI can only choose from the catalog in 5.6. Unknown rule types are rejected.
- **Grounding:** insights must cite figures that exist in the computed stats. A check compares the numbers in the AI's text against the real stats.
- **Safety wording:** a system prompt forbids buy or sell advice, price predictions and promises of profit.
- **Cost control:** per-user daily limits, caching of insights for unchanged data, and a global monthly spending cap with alerts.
- **Fallbacks:** if the AI is unavailable, the dashboard and rule replay still work.
- **Evaluation:** keep a small test set of sample trade histories and review AI output for accuracy and tone before each release.

## 11. Security, Privacy and Compliance

**Security**

- Row-level security on every table, and a test that proves user A cannot read user B's data
- Private storage buckets, with signed URLs that expire
- Upload validation: file type, size limit and CSV injection protection (neutralize cells starting with =, +, - or @ on export)
- Rate limiting on login, upload and AI endpoints
- Secrets in environment variables only, never in the repository
- No broker passwords or API keys: CSV upload only in V1
- Manual review of all AI-generated auth and database access code before launch
- Dependency scanning and regular updates

**Privacy**

- Treat trade history as sensitive financial data
- Encrypt data in transit and at rest
- Be clear about where data is stored and which third parties process it, including the AI provider
- Data export and deletion available to users
- Written privacy policy and terms of service

**Compliance (questions for a lawyer)**

- What the DPDP Act 2023 requires for consent, notices, retention and breach handling for this kind of data
- Whether the product's wording and features stay on the educational side of SEBI's rules on investment advice and research analysts
- What disclaimers and terms are needed, and where they must appear
- Whether a coach viewing a trader's data needs additional consent language

This plan is not legal advice. A short review by a lawyer familiar with Indian fintech is recommended before launch.

## 12. Non-Functional Requirements

- Mobile-friendly, responsive layout
- Handles at least 50,000 trades per user without freezing, using background processing for large files
- Clear error messages for bad files and failed AI calls
- Daily database backups and a tested restore
- Accessibility basics: keyboard navigation, readable contrast, and labeled charts
- Number formatting in the Indian system (lakhs and crores) with the rupee symbol

## 13. Testing Plan

- **Unit tests:** parsers, pairing, charges, metrics, and every rule type
- **Reconciliation tests:** real sample files against broker statements
- **Security tests:** cross-user access attempts on every API route and table
- **Integration tests:** upload to dashboard, and insight to rule to replay
- **Load test:** a large file import and dashboard queries
- **AI tests:** schema validation, number-grounding checks, and refusal of advice-style prompts
- **User testing:** 3 to 5 real traders try it before launch, and their confusion points become the fix list

## 14. Timeline (about 9 weeks for one developer)

- **Week 1:** Project setup, database schema, auth, roles, row-level security, CI
- **Week 2:** CSV upload, broker parser, column mapping, validation report
- **Week 3:** Trade pairing, P&L and charges engine, unit tests
- **Week 4:** Reconciliation against real files, fix edge cases (options, expiry)
- **Week 5:** Analytics dashboard and behavior metrics
- **Week 6:** AI insights, structured output, grounding checks, cost controls
- **Week 7:** Rule Lab: rule catalog, AI-to-JSON conversion, replay engine, before/after view
- **Week 8:** Weekly report, coach dashboard, settings, data export and deletion
- **Week 9:** Security review, testing with real users, bug fixes, deployment, monitoring, handover

The dates are estimates. Accuracy work in weeks 3 and 4 is where schedules usually slip, so keep a buffer.

## 15. Phase 2 Roadmap

- Market-data backtester with plain-language strategies (needs a reliable historical data source and a licensing check)
- Additional broker formats and, later, official broker APIs
- WhatsApp or Telegram alerts and rule-violation nudges
- Hindi and Gujarati insights
- Paid plans, billing and usage tiers
- Mobile app
- Advanced analytics: strategy tagging, setup-level performance, risk-of-ruin estimates

## 16. Costs to Agree On

Recurring costs the client should know about up front. Check each provider's current pricing before quoting.

- Frontend hosting
- Python service hosting
- Supabase plan (database, storage, auth)
- AI API usage (kept low by sending computed stats and caching results)
- Error monitoring and uptime tools
- Email sending
- Domain and SSL
- Legal review (one-time)

## 17. Risks and Mitigations

- **Inaccurate P&L:** unit tests, real-file reconciliation, and visible reconciliation in the app
- **Broker file formats change:** a column-mapping fallback and parser tests on every release
- **Data leak between users:** row-level security, automated cross-user tests, and manual review
- **Regulatory trouble from advice-like output:** educational framing, guardrail prompts, and legal review
- **AI hallucination or wrong numbers:** AI never calculates, and output is checked against computed stats
- **AI cost overruns:** per-user limits, caching, and a monthly cap
- **Scope creep:** a written V1 scope, with extras moved to Phase 2 as separate work
- **Rule replay misleads users:** clear approximation notices, minimum sample warnings, and the train and test split

## 18. Business Terms Checklist

- Written scope and acceptance criteria for Version 1
- Fixed-price milestones tied to the timeline above
- Who owns the code and the data
- Who pays for hosting, the AI API and third-party tools
- A cap on the number of revision rounds
- Warranty and bug-fix period after launch
- A maintenance and support agreement
- Confidentiality terms, since you will see real trading data
- Liability limits, reviewed by a lawyer

## 19. Open Questions for the Client

- Who are the end users: individual traders, a coach's students, a prop firm's traders?
- Which brokers do they use, and can we get sample files and the matching broker P&L statements?
- Which segments matter most: equity, futures, options?
- Does the client need a coach or admin dashboard at launch?
- Is payment collection needed at launch?
- Which languages are required?
- Does the client have a brand name, logo and colors?
- What is the target launch date and the budget?
- Does the client already have a privacy policy and terms of service?

## 20. Launch Checklist

- All Must features complete and tested
- Reconciliation passes on the agreed sample files
- Cross-user access tests pass
- Privacy policy, terms and disclaimers reviewed and live
- Monitoring, backups and spending caps configured
- Custom domain, SSL and email sending verified
- Demo account with sample data for the client
- Support contact and a bug reporting channel ready
- Handover document: architecture, environment variables, deployment steps and runbook
