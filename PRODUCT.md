# Product

<!-- impeccable:product-schema 1 -->

**Assisted Shopping Platform: ComproParaTi** · **Version:** 1.0 · **Date:** November 8, 2026

Part of the project documentation ([readme](readme.md)). This document is the product brief for design work: who the product serves, what sets it apart, and the principles that settle design trade-offs. It owns the role priority, what the positioning means for design, and the product principles below. Every other fact is owned by the document it links to; where they differ, the [PRD](docs/01-PRD.md) and the [UX design](docs/02-UX-DESIGN.md) take precedence. Visual design is in [DESIGN.md](DESIGN.md).

## Platform

web

## Users

Three roles, defined in [PRD §2](docs/01-PRD.md#2-users):

- **Members** request products and keep each person's details. Many are older adults with little digital experience, often in the launch countries on slow or expensive mobile data ([PRD §9](docs/01-PRD.md#9-risks-and-dependencies)).
- **Buyers** are relatives or friends, often living abroad, who reserve, purchase, and ship the items.
- **Recipients** are the people items are for. They have no account and can be minors.

**Role priority.** On screens both roles use, the member's experience wins: anything a member sees must work on slow mobile data and for people with little digital experience. On buyer-only flows (reserve, purchase, ship), design for the buyer.

## Product Purpose

Families request products their relatives abroad can buy and send, and today those requests are scattered across calls, emails, and WhatsApp. ComproParaTi keeps one shared list per family, with each person's sizes and preferences, and lets everyone see where each item stands from request to shipment ([PRD §1](docs/01-PRD.md#1-product-summary)). Success is measured by activation, completed cycles, retention, and zero duplicate purchases ([PRD §6](docs/01-PRD.md#6-success-metrics)).

## Positioning

A family favor, not a store ([PRD §16](docs/01-PRD.md#16-product-decisions)). For design, this means the app keeps the shared list, each person's details, and where every item stands; conversations and money stay on WhatsApp and between the people involved.

## Operating Context

- Everything happens around one cycle: request → reserve → purchase → ship ([PRD §4](docs/01-PRD.md#4-experience-at-a-glance), [UX §1](docs/02-UX-DESIGN.md#1-user-flows)).
- Invitations travel as links shared on WhatsApp, and every item is one tap from a WhatsApp conversation ([UX §2.6](docs/02-UX-DESIGN.md#26-whatsapp-and-email-content)).
- Buying happens in stores outside the app, and shipping through agencies outside the app; the app records the shipment, not the package's journey ([PRD §16](docs/01-PRD.md#16-product-decisions)).
- Screens show fresh data when opened or refreshed; there are no live updates ([PRD §15](docs/01-PRD.md#15-non-functional-requirements)).
- Members hear about activity through a daily email; buyers hear about changes from a person on WhatsApp ([PRD §13.9](docs/01-PRD.md#139-communication-and-notifications)).

## Capabilities and Constraints

- Features and scope: [PRD §3](docs/01-PRD.md#3-main-features) and [§5](docs/01-PRD.md#5-scope), including the simplification rule and what is out of scope.
- Rules, requirements, and acceptance criteria: [PRD §12](docs/01-PRD.md#12-business-rules), [§13](docs/01-PRD.md#13-functional-requirements), and [§17](docs/01-PRD.md#17-acceptance-criteria).
- What the interface must never show or promise: [DESIGN.md, Content Constraints](DESIGN.md#content-constraints).
- Terminology: [PRD §11](docs/01-PRD.md#11-glossary). Interface text comes from the translation files, in Spanish and English ([UX §2.10](docs/02-UX-DESIGN.md#210-spanish-interface-strings)).
- Technology: [Architecture §1.5](docs/03-ARCHITECTURE.md#15-technology-stack) and [§1.6](docs/03-ARCHITECTURE.md#16-dependencies).
- Release plan: [PRD §8](docs/01-PRD.md#8-release-plan-and-launch-criteria). Undecided items: [PRD §10](docs/01-PRD.md#10-open-questions).

## Brand Commitments

- **Name:** ComproParaTi, one name in both languages, explained in English as "I buy for you" ([PRD §16](docs/01-PRD.md#16-product-decisions)).
- **Voice:** everyday language ([UX §2.1](docs/02-UX-DESIGN.md#21-design-principles)). The Spanish strings address the user as *tú* ([UX §2.10](docs/02-UX-DESIGN.md#210-spanish-interface-strings)).
- **Logo:** none exists yet.

## Evidence on Hand

- Screen mockups exported from Google Stitch in [design/stitch/](design/stitch/), a visual reference only ([DESIGN.md, Using the Stitch Screens](DESIGN.md#using-the-stitch-screens)).
- Seed data for local development ([Data model](docs/04-DATA-MODEL.md)).
- No users, pilot results, testimonials, or usage figures exist yet; the pilot comes after milestone 2 ([PRD §8.2](docs/01-PRD.md#82-milestone-2-complete-mvp)). Do not invent them, nor store partners, shipping agencies, prices, or delivery times.

## Product Principles

1. **Design for the least experienced member on the slowest connection.** Wherever a member can see it, it has to work for them first.
2. **Hold the list and the status; leave the conversation to WhatsApp.** The app never competes with the channel families already use.
3. **Where each item stands is always visible.** Every screen that shows an item shows its status and what comes next.
4. **Only what the cycle needs.** A feature earns its place only if request → reserve → purchase → ship cannot be completed without it ([PRD §5](docs/01-PRD.md#5-scope)).
5. **Show each person only what they can do, and never leave them stuck.** No modes to switch, and when something fails there is a way to continue by hand ([UX §2.1](docs/02-UX-DESIGN.md#21-design-principles)).

## Accessibility & Inclusion

WCAG 2.1 AA, touch targets and text sizes for older adults, and both languages ([UX §2.8](docs/02-UX-DESIGN.md#28-accessibility-language-and-responsive-behavior)). Usability targets are in [UX §2.9](docs/02-UX-DESIGN.md#29-usability-targets), and a usability test with older adults is a launch criterion ([PRD §8.2](docs/01-PRD.md#82-milestone-2-complete-mvp)).
