## ADDED Requirements

### Requirement: Profile loads without a hydration error

Profile SHALL render the same in the server's HTML as in the browser's first render, so the browser doesn't render the page again when it loads (docs/08-WORK-TICKETS.md, T-36). The phone field's country selector SHALL show the country of the saved number from the start, with the browser's name for it once the page has loaded, even where the server's name differs; and SHALL offer every country once the page has loaded, with names and order from the browser in the page's language (FR-37, DESIGN.md Content Constraints).

#### Scenario: T-36 Profile loads without a hydration error in Spanish and English

- **GIVEN** a user who has completed onboarding, with Spanish and then English as their language, and also a user in Spanish whose saved number is from Hong Kong, a country whose name differs between the server and the browser (docs/08-WORK-TICKETS.md, T-36)
- **WHEN** they open Profile, in Chromium and in WebKit
- **THEN** the page reports no hydration error, the country selector shows the saved number's country with the browser's name for it, and it offers every country with its name in that language
- Verified by a browser test with the scenario's name, which fails when the page reports a hydration error.
