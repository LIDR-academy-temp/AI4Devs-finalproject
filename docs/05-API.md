# API specification

**Assisted Shopping Platform: ComproParaTi** · **Version:** 1.5 · **Date:** October 18, 2026

Part of the project documentation ([readme](../readme.md)). IDs (`BR`, `FR`, `E`, `US`, `AC`) are defined in the [PRD](01-PRD.md).

---

## 1. Conventions

- **Base path:** `/api/v1`. JSON request and response bodies, with property names in camelCase.
- **Authentication:** the Better Auth session cookie. Every endpoint requires a signed-in, onboarded user, except the invitation preview and the onboarding endpoint.
- **Identifiers and dates:** IDs are UUIDs. Timestamps use ISO 8601 in UTC; calendar dates such as `shipDate` use `YYYY-MM-DD`.
- **Concurrency:** item edits include the `version` the user last saw (BR-20).
- **Errors** use one format:

  ```json
  { "error": { "code": "VALIDATION_FAILED", "message": "Check the highlighted fields.", "fields": { "name": "required" } } }
  ```

  The `message` is in the user's language. The interface shows it, and uses `code` to decide what to do next.

| Status | Code | When |
| --- | --- | --- |
| 401 | `NOT_SIGNED_IN` | No valid session |
| 403 | `FORBIDDEN` | The user can see the resource but not take this action (BR-12). The interface never offers such actions, so this only happens when it is bypassed. |
| 404 | `NOT_AVAILABLE` | Outside the user's groups, deleted, or archived (BR-13) |
| 409 | `ALREADY_RESERVED` | Someone else reserved the item first (BR-23) |
| 409 | `ITEM_CHANGED` | The item changed since the user loaded it (BR-20), or the action no longer applies to its status |
| 409 | `RULE_VIOLATION` | A business rule refuses the action; `reason` names it, for example `LIST_NOT_DELETABLE` (BR-18) or `OWNERSHIP_TRANSFER_REQUIRED` (BR-07) |
| 410 | `INVITATION_INVALID` | The invitation was used, expired, or cancelled (BR-08) |
| 422 | `VALIDATION_FAILED` | A field breaks BR-32 or a required field is missing |
| 429 | `RATE_LIMITED` | Over a rate limit ([Security and testing §1](07-SECURITY-AND-TESTING.md#1-security)) |

## 2. Endpoints

| Method | Path | Purpose | Rules |
| --- | --- | --- | --- |
| GET | `/me` | Current user, memberships, and onboarding state | FR-08 |
| POST | `/me/onboarding` | Language, WhatsApp number, and age and terms acceptance | FR-02, BR-01, BR-04 |
| PATCH | `/me` | Change language, WhatsApp number, or email setting | FR-04 |
| DELETE | `/me` | Delete the account | BR-05 |
| GET, POST | `/groups` | List the user's groups; create a group | BR-07 |
| GET, PATCH | `/groups/{groupId}` | Group with members and buyers; rename | FR-07 |
| POST | `/groups/{groupId}/owner` | Transfer ownership | BR-07 |
| DELETE | `/groups/{groupId}/memberships/{userId}` | Remove someone, or leave with `me` | BR-07, BR-10, BR-11 |
| GET, POST | `/groups/{groupId}/invitations` | Pending invitations; create one and get its link | BR-08 |
| DELETE | `/invitations/{invitationId}` | Cancel an invitation | BR-08 |
| GET | `/invitations/by-code/{code}` | Invitation preview: inviter, group, and type. No sign-in required. | BR-08 |
| POST | `/invitations/by-code/{code}/accept` | Accept an invitation | BR-08, BR-09 |
| GET, POST | `/groups/{groupId}/recipients` | List and create recipients | FR-09 |
| GET, PATCH, DELETE | `/recipients/{recipientId}` | Read, edit (including details), or delete a recipient | BR-15, BR-32 |
| GET, POST | `/groups/{groupId}/lists` | List and create lists; `?archived=true` lists archived ones | FR-12 |
| PATCH | `/lists/{listId}` | Rename, archive, or restore | BR-17 |
| DELETE | `/lists/{listId}` | Delete a list and its items | BR-18 |
| GET | `/lists/{listId}/items` | Items in a list, filterable by recipient and status | FR-11 |
| POST | `/lists/{listId}/items` | Create an item | FR-13, BR-32 |
| POST | `/link-previews` | Title, image, and store name for a link, for the item form | FR-14, [Security and testing §1](07-SECURITY-AND-TESTING.md#1-security) |
| GET, PATCH, DELETE | `/items/{itemId}` | Item with timeline, recipient details, shipment, and WhatsApp contacts; edit; delete | BR-19, BR-20, BR-30 |
| POST | `/items/{itemId}/seen` | Clears the "Updated" marker for the item's buyer | BR-19 |
| POST, DELETE | `/items/{itemId}/reservation` | Reserve; release | BR-23 |
| POST | `/items/{itemId}/purchase` | Mark as purchased, with an optional buyer note | BR-22, BR-25 |
| POST | `/items/{itemId}/unavailable` | Couldn't buy it, with a required note | BR-22, BR-25 |
| POST | `/items/{itemId}/undo` | Undo the last step | BR-24 |
| GET | `/me/to-buy` | Pending items for the buyer, filterable by group and list | FR-21 |
| GET | `/me/purchases` | The user's reserved and purchased items | FR-21 |
| GET, POST | `/groups/{groupId}/delivery-addresses` | List and add addresses | BR-27 |
| PATCH, DELETE | `/delivery-addresses/{addressId}` | Edit, make default, or delete | BR-27 |
| POST | `/groups/{groupId}/shipments` | Mark one or more items as shipped | BR-28 |
| PATCH | `/shipments/{shipmentId}` | Edit a shipment | BR-29 |

Outside `/api/v1`: `/api/auth/*` belongs to Better Auth, and `GET /api/cron/daily-email` is called only by Vercel Cron with the cron secret.

## 3. OpenAPI definition of the main endpoints

The complete OpenAPI document is generated from the code into `docs/openapi.yaml`. The three endpoints below cover the core cycle: requesting, reserving, and shipping.

```yaml
openapi: 3.1.0
info:
  title: ComproParaTi API
  version: 1.0.0
servers:
  - url: /api/v1
security:
  - sessionCookie: []
components:
  securitySchemes:
    sessionCookie:
      type: apiKey
      in: cookie
      name: __Secure-better-auth.session_token
  schemas:
    Error:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code: { type: string, example: VALIDATION_FAILED }
            message: { type: string, example: Check the highlighted fields. }
            reason: { type: string, example: LIST_NOT_DELETABLE }
            fields:
              type: object
              additionalProperties: { type: string }
    ItemStatus:
      type: string
      enum: [pending, reserved, purchased, shipped, unavailable]
    PersonRef:
      type: object
      required: [id, name]
      properties:
        id: { type: string, format: uuid }
        name: { type: string, description: '"Former user" for deleted accounts' }
    Item:
      type: object
      required: [id, listId, name, quantity, status, linkStatus, version, createdAt, updatedAt]
      properties:
        id: { type: string, format: uuid }
        listId: { type: string, format: uuid }
        name: { type: string, maxLength: 100 }
        notes: { type: [string, 'null'], maxLength: 1000 }
        url: { type: [string, 'null'], format: uri, maxLength: 2000 }
        storeName: { type: [string, 'null'] }
        thumbnailUrl: { type: [string, 'null'], format: uri }
        linkStatus: { type: string, enum: [none, pending, done, failed] }
        quantity: { type: integer, minimum: 1, maximum: 99 }
        status: { $ref: '#/components/schemas/ItemStatus' }
        recipient:
          oneOf: [{ $ref: '#/components/schemas/PersonRef' }, { type: 'null' }]
        buyer:
          oneOf: [{ $ref: '#/components/schemas/PersonRef' }, { type: 'null' }]
        buyerNote: { type: [string, 'null'] }
        shipmentId: { type: [string, 'null'], format: uuid }
        updatedAfterReservation: { type: boolean }
        version: { type: integer }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }
    CreateItemRequest:
      type: object
      required: [name]
      properties:
        name: { type: string, minLength: 1, maxLength: 100 }
        recipientId: { type: [string, 'null'], format: uuid }
        url: { type: [string, 'null'], format: uri, maxLength: 2000 }
        quantity: { type: integer, minimum: 1, maximum: 99, default: 1 }
        notes: { type: [string, 'null'], maxLength: 1000 }
    CreateShipmentRequest:
      type: object
      required: [itemIds, shipDate, agency, service]
      properties:
        itemIds:
          type: array
          minItems: 1
          items: { type: string, format: uuid }
        shipDate: { type: string, format: date, description: Not later than today }
        agency: { type: string, minLength: 1, maxLength: 80 }
        service: { type: string, enum: [maritime, air] }
        deliveryAddressId:
          type: [string, 'null']
          format: uuid
          description: Null only when the group has no delivery address
    Shipment:
      type: object
      required: [id, groupId, buyer, shipDate, agency, service, itemIds]
      properties:
        id: { type: string, format: uuid }
        groupId: { type: string, format: uuid }
        buyer: { $ref: '#/components/schemas/PersonRef' }
        shipDate: { type: string, format: date }
        agency: { type: string }
        service: { type: string, enum: [maritime, air] }
        address:
          description: Copy of the delivery address as shipped
          oneOf:
            - type: object
              properties:
                label: { type: string }
                receiverName: { type: string }
                phone: { type: string }
                address: { type: string }
                country: { type: string, minLength: 2, maxLength: 2 }
            - type: 'null'
        itemIds:
          type: array
          items: { type: string, format: uuid }
  responses:
    Unauthorized:
      description: Not signed in
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    Forbidden:
      description: The user cannot take this action (BR-12)
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    NotAvailable:
      description: Not in the user's groups, deleted, or archived (BR-13)
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    ValidationFailed:
      description: A field breaks BR-32 or is missing
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    RateLimited:
      description: Over a rate limit
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }

paths:
  /lists/{listId}/items:
    post:
      summary: Create an item
      description: >
        Members only. A name is enough (quick add). If a URL is included, the link
        lookup starts after the response and fills in storeName and thumbnailUrl
        without changing the typed name (BR-21).
      parameters:
        - { name: listId, in: path, required: true, schema: { type: string, format: uuid } }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateItemRequest' }
            example:
              name: Sports shoes
              recipientId: 3f1c2a9e-8d7b-4c1e-9a55-2b6f0e4d7a10
              url: https://store.example.com/shoes/123
              quantity: 1
              notes: In white, no laces
      responses:
        '201':
          description: Item created as pending
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Item' }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '403': { $ref: '#/components/responses/Forbidden' }
        '404': { $ref: '#/components/responses/NotAvailable' }
        '422': { $ref: '#/components/responses/ValidationFailed' }
        '429': { $ref: '#/components/responses/RateLimited' }

  /items/{itemId}/reservation:
    post:
      summary: Reserve an item ("I'll buy it")
      description: >
        Members and buyers of the item's group. Succeeds only if the item is still
        pending; the first of two simultaneous requests wins (BR-23).
      parameters:
        - { name: itemId, in: path, required: true, schema: { type: string, format: uuid } }
      responses:
        '200':
          description: Item reserved by the current user
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Item' }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '404': { $ref: '#/components/responses/NotAvailable' }
        '409':
          description: Already reserved by someone else, or no longer pending
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Error' }
              example:
                error: { code: ALREADY_RESERVED, message: Someone else already reserved it }
        '429': { $ref: '#/components/responses/RateLimited' }
    delete:
      summary: Release a reservation
      description: Only the item's buyer, while the item is reserved.
      parameters:
        - { name: itemId, in: path, required: true, schema: { type: string, format: uuid } }
      responses:
        '200':
          description: Item back to pending
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Item' }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '403': { $ref: '#/components/responses/Forbidden' }
        '404': { $ref: '#/components/responses/NotAvailable' }
        '409':
          description: The item is no longer reserved
          content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }

  /groups/{groupId}/shipments:
    post:
      summary: Mark items as shipped
      description: >
        All items must be purchased, reserved by the current user, and in this group.
        The delivery address is copied into the shipment (BR-28).
      parameters:
        - { name: groupId, in: path, required: true, schema: { type: string, format: uuid } }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateShipmentRequest' }
            example:
              itemIds:
                - 8a1d3c55-2f0b-4e6a-9c71-5d2e8b4f1a01
                - 0c9e7b21-6a4d-4f3e-8b12-7e5a1c9d3b02
              shipDate: '2026-10-10'
              agency: Express Cargo
              service: air
              deliveryAddressId: 5b7e2d10-4c3a-4f8e-a1b6-9d0c2e7f4a03
      responses:
        '201':
          description: Shipment created; the items are now shipped
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Shipment' }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '404': { $ref: '#/components/responses/NotAvailable' }
        '409':
          description: An item is not purchased, not the user's, or changed since loading
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Error' }
              example:
                error: { code: ITEM_CHANGED, message: This item changed. Showing the latest. }
        '422': { $ref: '#/components/responses/ValidationFailed' }
        '429': { $ref: '#/components/responses/RateLimited' }
```
