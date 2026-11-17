## ADDED Requirements

### Requirement: One last step loads without a hydration error

One last step SHALL render the same in the server's HTML as in the browser's first render, so the browser doesn't render the page again when it loads (docs/08-WORK-TICKETS.md, T-36). The phone field's country selector SHALL offer every country once the page has loaded, with names and order from the browser in the page's language (FR-37, DESIGN.md Content Constraints); before that, it SHALL show the "choose a country" placeholder and the selected country, if any.

#### Scenario: T-36 One last step loads without a hydration error in Spanish and English

- **GIVEN** a new user signed in, with Spanish and then English as their language (docs/08-WORK-TICKETS.md, T-36)
- **WHEN** they open One last step, in Chromium and in WebKit
- **THEN** the page reports no hydration error, and the country selector offers every country with its name in that language
- Verified by a browser test with the scenario's name, which fails when the page reports a hydration error.

#### Scenario: T-36 a country chosen on One last step is saved

- **GIVEN** a new user on One last step, in Spanish and in English, whose country selector starts on the browser's region (docs/08-WORK-TICKETS.md, T-36)
- **WHEN** once the page has loaded, they choose a different country, enter a number from that country, accept the terms, and continue
- **THEN** they land on Lists, and the number is saved in international format with that country's calling code (BR-04)
- Verified by a browser test with the scenario's name.
