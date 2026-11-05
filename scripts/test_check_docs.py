"""Mutation tests for scripts/check_docs.py: each check must report an error introduced on purpose."""
import unittest
from unittest import mock

import check_docs as c

TABLE = """
| Id | Título | Tipo | Épica / historia | Prioridad | Estimación | Depende de |
| --- | --- | --- | --- | --- | --- | --- |
| T-01 | Base | infra | E5 / Skeleton | M | 1 h | — |
| T-02 | Cliente IA | backend, ai | E5 / Skeleton | M | 1 h | T-01 |
| T-03 | Control de gasto | backend, ai | E5 / Plataforma | M | 1 h | T-02 |
| T-04 | Extracción | backend, ai | E1 / HU1 | M | 2 h | T-03 |
| T-05 | Puntaje | backend, ai | E3 / HU6 | M | 1 h | T-02 |
| T-06 | Pantalla | frontend | E3 / HU6 | M | 1 h | T-04, T-99 |

**Totales:** must-have ≈ 7 h (tope: 36 h); should-have ≈ 0 h.
"""

SECTIONS = """
### T-01 — Base

- **Tipo:** infra
- **Expone:** `monorepo`
- **Consume:** —

### T-04 — Extracción

- **Tipo:** backend, ai
- **Expone:** `POST /job-postings/extractions`
- **Consume:** `monorepo`

### T-05 — Puntaje

- **Tipo:** backend, ai
- **Expone:** `POST /job-postings/match`, `monorepo`
- **Consume:** `POST /job-postings/extractions`, `tabla fantasma`

### T-06 — Pantalla

- **Tipo:** frontend
"""

STORIES = """
| Orden | Id | Épica | Historia | Prioridad | Estimación | Depende de |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | — | E5 | Skeleton (T-01 a T-03) | Must-have | 3 h | — |
| 1 | HU6 | E3 | Puntaje | Must-have | 2 h | — |
| 2 | HU1 | E1 | Pegar | Must-have | 2 h | — |

### HU1 — Pegar

- **Estimación:** 2 h

### HU6 — Puntaje

- **Estimación:** 2.5 h
"""

DEFS = {"RF": {"RF-01"}, "RNF": set(), "OBJ": set(), "HU": {"HU1"}, "E": set(), "T": {"T-01"}, "ADR": {"ADR-0001"}, "D": {"D-01", "D-02"}}


class ReferenceChecks(unittest.TestCase):
    def test_unknown_reference_is_reported(self):
        self.assertEqual(c.unknown_refs("doc.md", "Ver RF-01 y RF-99.", DEFS), ["doc.md: reference RF-99 has no definition"])

    def test_citation_of_superseded_decision_is_reported(self):
        decisions = {"D-01": "reemplazada por D-02", "D-02": "vigente"}
        self.assertEqual(c.superseded_citations("doc.md", "Puntaje a pedido (D-01).", decisions),
                         ["doc.md: cites superseded decision D-01"])

    def test_decision_log_row_itself_is_not_a_citation(self):
        decisions = {"D-01": "reemplazada por D-02"}
        self.assertEqual(c.superseded_citations("prd.md", "| D-01 | 2026-11-04 | x | reemplazada por D-02 |", decisions), [])

    def test_decision_ids_are_parsed_from_log(self):
        prd = "| D-01 | 2026-11-04 | Algo | vigente |\n| D-02 | 2026-11-05 | Otra | reemplazada por D-03 |"
        self.assertEqual(c.parse_decisions(prd), {"D-01": "vigente", "D-02": "reemplazada por D-03"})


class TotalsAndAdrChecks(unittest.TestCase):
    def test_stated_total_that_does_not_match_table_is_reported(self):
        self.assertEqual(c.totals_errors(TABLE.replace("≈ 7 h", "≈ 9 h")),
                         ["docs/tickets.md: stated must-have 9 h, table sums 7 h"])

    def test_adr_without_status_is_reported(self):
        self.assertEqual(c.adr_errors("adr.md", "# ADR", {"ADR-0001"}), ["adr.md: missing status"])

    def test_superseded_adr_pointing_to_missing_adr_is_reported(self):
        self.assertEqual(c.adr_errors("adr.md", "- **Estado:** reemplazada por ADR-0009", {"ADR-0001"}),
                         ["adr.md: superseded without a valid replacing ADR"])


class DependencyChecks(unittest.TestCase):
    def setUp(self):
        self.tickets = c.parse_ticket_table(TABLE)

    def test_dependency_on_missing_ticket_is_reported(self):
        self.assertEqual(c.check_dependencies(self.tickets), ["docs/tickets.md: T-06 depends on unknown ticket T-99"])

    def test_dependency_cycle_is_reported(self):
        tickets = c.parse_ticket_table(TABLE.replace("| M | 1 h | — |", "| M | 1 h | T-04 |"))
        self.assertTrue(any("cycle" in e for e in c.check_dependencies(tickets)))

    def test_transitive_dependencies_follow_the_chain(self):
        self.assertEqual(c.transitive_deps(self.tickets, "T-04"), {"T-01", "T-02", "T-03"})

    def test_ai_ticket_without_budget_guard_is_reported(self):
        self.assertEqual(c.check_ai_tickets(self.tickets, guard="T-03", exempt={"T-02", "T-03"}),
                         ["docs/tickets.md: AI ticket T-05 does not depend on T-03 (budget guard)"])


class ContractChecks(unittest.TestCase):
    def setUp(self):
        self.tickets = c.parse_ticket_table(TABLE)
        self.errors = c.check_contracts(self.tickets, c.parse_contracts(c.ticket_sections(SECTIONS)))

    def test_ticket_without_contract_is_reported(self):
        self.assertIn("docs/tickets.md: T-06 has no Expone/Consume contract", self.errors)

    def test_element_exposed_twice_is_reported(self):
        self.assertIn("docs/tickets.md: 'monorepo' is exposed by several tickets: T-01, T-05", self.errors)

    def test_consumed_element_nobody_exposes_is_reported(self):
        self.assertIn("docs/tickets.md: T-05 consumes 'tabla fantasma', which no ticket exposes", self.errors)

    def test_consumed_element_without_dependency_is_reported(self):
        self.assertIn("docs/tickets.md: T-05 consumes 'POST /job-postings/extractions' from T-04 without depending on it", self.errors)


class OrderAndHourChecks(unittest.TestCase):
    def setUp(self):
        self.tickets = c.parse_ticket_table(TABLE)

    def test_ticket_missing_from_build_order_is_reported(self):
        errors = c.check_build_order(self.tickets, STORIES.replace("| 2 | HU1 | E1 | Pegar | Must-have | 2 h | — |\n", ""))
        self.assertIn("docs/user-stories.md: T-04 is not placed in the build order", errors)

    def test_ticket_built_before_its_dependency_is_reported(self):
        errors = c.check_build_order(self.tickets, STORIES)
        self.assertIn("docs/user-stories.md: T-06 (order 1) depends on T-04 (order 2)", errors)

    def test_story_section_that_differs_from_order_table_is_reported(self):
        self.assertIn("docs/user-stories.md: HU6 estimate differs (section 2.5 h, order table 2 h)", c.check_story_hours(STORIES))

    def test_story_estimate_that_differs_from_its_tickets_is_reported(self):
        self.assertIn("docs/user-stories.md: HU6 estimate 2.5 h differs from its tickets (2 h)",
                      c.check_story_hours(STORIES, self.tickets))


class ReadmeCheck(unittest.TestCase):
    def test_hand_edited_readme_is_reported(self):
        real_read = c.read
        with mock.patch.object(c, "read", side_effect=lambda rel: real_read(rel) + ("\nedición a mano" if rel == "readme.md" else "")):
            self.assertEqual(c.check_readme(), ["readme.md: out of date; run python3 scripts/check_docs.py --build-readme"])


class ManualVersionCheck(unittest.TestCase):
    def test_manual_version_header_is_reported(self):
        self.assertEqual(c.manual_version_errors("docs/prd.md", "- **Estado:** borrador v0.5 (algo)"),
                         ["docs/prd.md: manual version header; use git history instead"])

    def test_adr_status_is_not_a_manual_version(self):
        self.assertEqual(c.manual_version_errors("docs/adr/0001.md", "- **Estado:** aceptada"), [])


if __name__ == "__main__":
    unittest.main()
