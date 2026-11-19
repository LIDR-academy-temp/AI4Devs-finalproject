# Spec Delta

## Purpose

Tells the interface who is signed in, where they are in onboarding, which groups they belong to and in which role, and which tabs that gives them, so each person sees only the screens their memberships allow.

## ADDED Requirements

### Requirement: The signed-in user can read their own account and memberships

`GET /me` SHALL return the signed-in user's ID, name, email, avatar, language, WhatsApp number, email setting, and whether onboarding is complete, together with their active memberships, each with the group's ID and name, their role, and whether they own it (FR-08).

#### Scenario: BR-12 a user in two groups sees each membership with its role

- **GIVEN** the seed user who is a buyer in one seed group and owns the other
- **WHEN** they request `GET /me`
- **THEN** the response has their account details and both memberships, buyer in one and owner and member in the other
- Verified by an integration test against the seed data.

#### Scenario: BR-11 an ended membership isn't returned

- **GIVEN** the seed's former buyer, whose only membership has ended
- **WHEN** they request `GET /me`
- **THEN** the response has no memberships

#### Scenario: T-07 a request without a session is rejected

- **WHEN** a request to `GET /me` has no session
- **THEN** the response is 401 `NOT_SIGNED_IN`

### Requirement: `GET /me` works before onboarding is complete

`GET /me` SHALL answer a signed-in user who hasn't completed onboarding, reporting onboarding as incomplete, so the interface can send them to it (API §1).

#### Scenario: T-07 a user who hasn't completed onboarding reads their state

- **GIVEN** a signed-in user who hasn't completed onboarding and has no memberships
- **WHEN** they request `GET /me`
- **THEN** the response is 200, reports onboarding as incomplete, and has no memberships

### Requirement: `GET /me` says whether the user has purchases to show

`GET /me` SHALL report whether the user is the buyer of any item that is reserved or purchased, which gives a member the My purchases tab (FR-08, UX design §2.2).

#### Scenario: FR-08 a member with a reserved item has purchases

- **GIVEN** a seed member who has reserved a pending item
- **WHEN** they request `GET /me`
- **THEN** the response reports that they have purchases

#### Scenario: BR-11 a user whose access ended keeps My purchases for what they bought

- **GIVEN** the seed's former buyer, whose membership has ended and who still has a purchased item
- **WHEN** they request `GET /me`
- **THEN** the response has no memberships and reports that they have purchases, so their only tab is My purchases

#### Scenario: FR-08 a member with only shipped or no items has no purchases

- **GIVEN** a seed member who is the buyer of no reserved or purchased item
- **WHEN** they request `GET /me`
- **THEN** the response reports that they have no purchases

### Requirement: Tabs follow the user's memberships

One shared rule SHALL decide a user's tabs from their memberships and purchases, as UX design §2.2 describes: Lists, People, and Group for a member of any group; To buy for a buyer in any group; and My purchases for a buyer in any group or a user who has purchases (FR-08).

#### Scenario: AC-24 a user who is only a buyer gets only To buy and My purchases

- **GIVEN** the seed user who is only a buyer (docs/01-PRD.md §17.2, AC-24)
- **WHEN** they sign in and request `GET /me`
- **THEN** every membership is a buyer membership, and the tabs from the response are To buy and My purchases, with no Lists, People, or Group
- Verified by an integration test of `GET /me` and a unit test of the rule.

#### Scenario: FR-08 a member who doesn't buy gets Lists, People, and Group

- **GIVEN** a member of a group with no buyer membership and no purchases
- **WHEN** their tabs are decided
- **THEN** they are Lists, People, and Group

#### Scenario: FR-08 a member who reserves gets My purchases too

- **GIVEN** a member of a group with no buyer membership who has purchases
- **WHEN** their tabs are decided
- **THEN** they are Lists, People, Group, and My purchases, with no mode switch

#### Scenario: FR-08 a member in one group and buyer in another gets every tab

- **GIVEN** a user who is a member of one group and a buyer in another
- **WHEN** their tabs are decided
- **THEN** they are Lists, People, Group, To buy, and My purchases

#### Scenario: BR-11 a user with no group but purchases to ship gets only My purchases

- **GIVEN** a user with no active membership who has purchases
- **WHEN** their tabs are decided
- **THEN** the only tab is My purchases, and the interface also shows that they aren't in any group yet (UX design §2.7)

#### Scenario: FR-08 a user with no group gets no tabs

- **GIVEN** a user with no active membership and no purchases
- **WHEN** their tabs are decided
- **THEN** there are none, so the interface shows that they aren't in any group yet
