"""Tests for the dependency, AI-budget, endpoint and story-hour checks of check_docs.py."""
import unittest

import check_docs as c

TABLE = """
| Id | Título | Tipo | Épica / historia | Prioridad | Estimación | Depende de |
| --- | --- | --- | --- | --- | --- | --- |
| T-01 | Base | infra | E5 / Skeleton | M | 1 h | — |
| T-02 | Cliente IA | backend, ai | E5 / Skeleton | M | 1 h | T-01 |
| T-03 | Control de gasto | backend, ai | E5 / Plataforma | M | 1 h | T-02 |
| T-04 | Extracción | backend, ai | E1 / HU1 | M | 1 h | T-03 |
| T-05 | Puntaje | backend, ai | E3 / HU6 | M | 1 h | T-02 |
| T-06 | Pantalla | frontend | E3 / HU6 | M | 1 h | T-04, T-99 |
"""

BODIES = """
### T-04 — Extracción

**Tareas**
- `POST /job-postings/extractions`: encola la extracción.

### T-05 — Puntaje

**Tareas**
- `POST /job-postings/match` para varias ofertas.

### T-06 — Pantalla

**Tareas**
- Botón que llama a `POST /job-postings/match`.
- Formulario que usa `POST /job-postings/extractions`.
- El recálculo usa `POST /job-postings/match` (T-05) más adelante.
"""

STORIES = """
| Orden | Id | Épica | Historia | Prioridad | Estimación | Depende de |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | HU1 | E1 | Pegar | Must-have | 3.5 h | — |
| 2 | HU6 | E3 | Puntaje | Must-have | 4 h | HU1 |

### HU1 — Pegar

- **Estimación:** 3.5 h

### HU6 — Puntaje

- **Estimación:** 4.5 h
"""


class DependencyChecks(unittest.TestCase):
    def setUp(self):
        self.tickets = c.parse_ticket_table(TABLE)

    def test_reports_dependency_on_missing_ticket(self):
        errors = c.check_dependencies(self.tickets)
        self.assertEqual(errors, ["docs/tickets.md: T-06 depends on unknown ticket T-99"])

    def test_reports_dependency_cycle(self):
        tickets = c.parse_ticket_table(TABLE.replace("| T-01 | Base | infra | E5 / Skeleton | M | 1 h | — |",
                                                     "| T-01 | Base | infra | E5 / Skeleton | M | 1 h | T-04 |"))
        errors = c.check_dependencies(tickets)
        self.assertTrue(any("cycle" in e for e in errors))

    def test_transitive_dependencies_follow_the_chain(self):
        self.assertEqual(c.transitive_deps(self.tickets, "T-04"), {"T-01", "T-02", "T-03"})


class AiBudgetChecks(unittest.TestCase):
    def test_ai_ticket_without_budget_guard_is_reported(self):
        tickets = c.parse_ticket_table(TABLE)
        errors = c.check_ai_tickets(tickets, guard="T-03", exempt={"T-02", "T-03"})
        self.assertEqual(errors, ["docs/tickets.md: AI ticket T-05 does not depend on T-03 (budget guard)"])


class EndpointChecks(unittest.TestCase):
    def test_unannotated_use_of_endpoint_requires_dependency_on_owner(self):
        tickets = c.parse_ticket_table(TABLE)
        errors = c.check_endpoint_usage(tickets, c.ticket_sections(BODIES))
        self.assertEqual(errors, ["docs/tickets.md: T-06 uses POST /job-postings/match (owned by T-05) without depending on it"])

    def test_endpoint_owner_is_first_unannotated_mention(self):
        owners = c.endpoint_owners(c.ticket_sections(BODIES))
        self.assertEqual(owners["POST /job-postings/match"], "T-05")


class StoryHourChecks(unittest.TestCase):
    def test_reports_mismatch_between_section_and_order_table(self):
        errors = c.check_story_hours(STORIES)
        self.assertEqual(errors, ["docs/user-stories.md: HU6 estimate differs (section 4.5 h, order table 4 h)"])


if __name__ == "__main__":
    unittest.main()
