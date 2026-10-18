# MVP Delivery Plan: Friday Oct 23

**Status:** 10/64 tasks complete. **54 remaining, 37 deferred to Phase 2.**

## Vertical Flow: Login → Register Campaign → Persist → List

```
┌─────────────────────────────────────────────────────────────┐
│ User (Operations role)                                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────┐
        │  Login (OAuth) │ ← Cognito (existing scaffold)
        └────────┬───────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ Register Campaign Form      │ ← Frontend (new)
    │ - Pick agency, advertiser  │
    │ - Set dates (auto-expands) │
    │ - Select DSP & mapping     │
    └────────────┬───────────────┘
                 │
                 ▼ POST /campaigns
    ┌────────────────────────────┐
    │ Backend: Register Service  │ ← Domain layer (new)
    │ - Create campaign          │   Application layer (new)
    │ - Expand periods           │   Repositories (new)
    │ - Create lines + mappings  │
    │ - Version purchase order   │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ PostgreSQL                 │ ← Already initialized
    │ - campaigns                │
    │ - campaign_periods         │
    │ - campaign_lines           │
    │ - purchase_order_versions  │
    │ - dsp_mappings             │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │ GET /campaigns             │
    │ List campaigns (grid)      │ ← Frontend list view
    └────────────────────────────┘
```

---

## Critical Path: 27 Tasks (Mon-Fri)

### §2 Domain Layer (2 of 5)
- [x] 2.1-2.2 Period expansion (done Oct 17)
- **TODO 2.3-2.5** ContractedVolume, Campaign entity, repository interfaces (4 tasks)
  - **EST:** 3-4 hours TDD (test + impl + verify)

### §3 Purchase Order Versioning (3 of 3)
- **TODO 3.1-3.3** Versioning logic + validation (3 tasks)
  - **EST:** 2 hours (thin domain logic, high test coverage)

### §4 DSP Validation (2 of 4)
- **TODO 4.1-4.2** Interface + in-memory double (2 tasks, skip real API)
  - **EST:** 1.5 hours (mock only)
  - ~~4.3-4.4~~ (deferred: Phase 2 real Adform)

### §5 Backend API (8 of 8) ⭐ CRITICAL
- **TODO 5.1-5.8** Endpoints + Cognito token verification (8 tasks)
  - **EST:** 6-8 hours (largest section)
  - Includes: registration endpoint, role guards, 403 auth tests

### §6 Frontend Form (5 of 5) ⭐ CRITICAL
- **TODO 6.1-6.5** Typed API client + registration form + list view (5 tasks)
  - **EST:** 5-6 hours (form validation, role guards, states)

### §8 Test Review (2 of 2)
- **TODO 8.1-8.2** Review & negative auth cases (2 tasks)
  - **EST:** 1 hour

### §9 Unit Tests (6 of 6)
- **TODO 9.1-9.6** Run suite, capture baseline, report (6 tasks)
  - **EST:** 2 hours (execution + reporting)

### §10 Manual API Validation (7 of 7) ⭐ CRITICAL
- **TODO 10.1-10.7** curl tests: registration, errors, auth (7 tasks)
  - **EST:** 2-3 hours (manual but structured)

### §12 Documentation (1 of 4)
- **TODO 12.3-12.4** .env.example + openspec validate (2 tasks, do Friday)
  - **EST:** 30 min

---

## Timeline Estimate

| Phase | Tasks | EST Hours | When |
|-------|-------|-----------|------|
| **Domain + Versioning** | 2.3-3.3 | 5-6h | Mon-Tue |
| **DSP Interface** | 4.1-4.2 | 1.5h | Tue |
| **Backend API** (5.*) | 5.1-5.8 | 6-8h | **Tue-Wed** |
| **Frontend** (6.*) | 6.1-6.5 | 5-6h | **Wed-Thu** |
| **Test Suite** (8.*, 9.*) | 8.1-9.6 | 3h | Thu |
| **Manual curl Tests** (10.*) | 10.1-10.7 | 2-3h | **Thu-Fri** |
| **Docs + Validate** (12.*) | 12.3-4 | 0.5h | Fri AM |
| **Buffer** | — | 2-3h | Fri PM |
| **TOTAL** | **27 tasks** | **25-30h** | **Mon-Fri** |

---

## Deferred to Phase 2 (37 tasks)

| Section | Tasks | Reason |
|---------|-------|--------|
| **1.9** Indexing | 1 | Performance optimization, not blocking |
| **4.3-4.4** Real Adform | 2 | Use in-memory double for MVP |
| **7.1-7.3** Excel seed | 3 | Use SQL fixtures; real import in Phase 2 |
| **11.1-11.6** E2E Playwright | 6 | curl tests validate API; browser tests after |
| **12.1-12.2** Doc updates | 2 | Minimal changes; update Friday AM |
| **Implied** | — | — |
| Equativ/Displayce | ~6+ | Only Adform in MVP |
| Rebate accrual | ~8+ | Finance features in Phase 2 |
| Historical corpus | ~3 | Handled in Phase 3 |

---

## Success Criteria (Friday EOD)

✅ **Feature complete:**
- [ ] User logs in with Cognito (existing)
- [ ] User can register campaign from PO
  - [ ] Masters validated
  - [ ] Periods auto-expanded
  - [ ] Lines created with DSP mapping
  - [ ] Version 1 purchase order created
- [ ] Campaign persists in PostgreSQL
- [ ] User can list campaigns
- [ ] Role guards work (operations required)

✅ **Quality gates:**
- [ ] Unit tests pass (§9)
- [ ] curl tests pass (§10)
- [ ] No secrets in code/logs
- [ ] openspec validate passes (§12.4)

✅ **Acceptance:**
- [ ] Code merged to main
- [ ] Deployable via `docker compose up`
- [ ] README updated (.env.example, basic how-to)

---

## Daily Targets

**Monday Oct 19**
- 2.3-3.3 (domain + versioning)
- Goal: Domain layer complete, tests passing

**Tuesday Oct 20**
- 4.1-4.2 (DSP mock interface) + 5.1-5.5 (endpoints, auth verification)
- Goal: API scaffold with role guards

**Wednesday Oct 21**
- 5.6-5.8 (master endpoints, blocking status) + 6.1-6.3 (form)
- Goal: API complete, frontend form working

**Thursday Oct 22**
- 6.4-6.5 (role guards, states) + 9.* (unit tests) + 10.1-10.7 (curl)
- Goal: Everything tested, API validated with curl

**Friday Oct 23**
- 12.3, 12.4 (docs, validate)
- NO PLANNED WORK — buffer only for blockers
- Goal: Ready for handoff

---

## Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| **Backend API complexity** (5.*) | Start with POST /campaigns only; GET /campaigns simple join |
| **Frontend form validation** | Use Zod or Pydantic equivalents; copy patterns from existing code |
| **Cognito token edge cases** | Extensive test coverage in 5.5-5.6 before curl tests |
| **Period expansion off-by-one** | Already tested (2.1-2.2); reuse logic |
| **DSP mapping blocking** | Implement as field in response; no new table needed |
| **Test environment setup** | Docker Compose already working; use fixtures for masters |

---

## Notes for Implementation

1. **No real Adform calls**: Use `MockDSPClient` in-memory double. Real API calls in Phase 2 when credentials are validated externally.

2. **Master data for tests**: Seed PostgreSQL with `INSERT` statements in fixtures, not Excel import. Phase 2 imports historical corpus.

3. **E2E tests deferred**: curl tests are sufficient to validate the API contract. Playwright E2E is validating the browser, not the domain logic.

4. **Frontend stack**: Use existing scaffold (Next.js + TypeScript). Add typed API client at `lib/api/campaigns.ts`. Reuse auth patterns from existing scaffold.

5. **Commit strategy**: One commit per completed task or task batch (2.3-2.5 together, 5.1-5.8 together). Keep history clean for review.

6. **Testing order**: Unit tests (domain, app) → API tests (httpx) → curl tests (manual). Skip E2E if curl passes.
