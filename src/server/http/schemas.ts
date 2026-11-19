import "./zod-openapi";

import { z } from "zod";

import { LANGUAGES } from "../../shared/languages";
import { fieldLimits } from "../../shared/limits";
import {
  changesSomething,
  createInvitationRequestShape,
  createItemRequestShape,
  createListRequestShape,
  ITEM_STATUSES,
  itemFiltersShape,
  namesAField,
  onboardingRequestShape,
  purchaseRequestShape,
  toBuyFiltersShape,
  updateItemRequestShape,
  updateMeRequestShape,
} from "../../shared/requests";
import { openApiRegistry } from "./openapi";

// Response schemas shared by several endpoints, registered by name so the
// OpenAPI document refers to them (docs/05-API.md, section 3).

export const membershipTypeSchema = openApiRegistry.register(
  "MembershipType",
  z.enum(["member", "buyer"]),
);

export const personRefSchema = openApiRegistry.register(
  "PersonRef",
  z.object({
    id: z.uuid(),
    name: z
      .string()
      .meta({ description: '"Former user" for deleted accounts' }),
  }),
);

export const membershipSchema = openApiRegistry.register(
  "Membership",
  z.object({
    groupId: z.uuid(),
    groupName: z.string(),
    type: membershipTypeSchema,
    isOwner: z.boolean(),
  }),
);

export const meSchema = openApiRegistry.register(
  "Me",
  z.object({
    id: z.uuid(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    image: z.string().nullable(),
    language: z
      .enum(LANGUAGES)
      .nullable()
      .meta({ description: "Null until onboarding" }),
    whatsappNumber: z
      .string()
      .nullable()
      .meta({ description: "E.164; null until onboarding" }),
    receiveEmails: z.boolean(),
    onboarded: z.boolean(),
    hasPurchases: z.boolean().meta({
      description:
        "The user is the buyer of a reserved or purchased item, which gives a member the My purchases tab (FR-08)",
    }),
    memberships: z.array(membershipSchema),
  }),
);

export const groupSummarySchema = openApiRegistry.register(
  "GroupSummary",
  z.object({
    id: z.uuid(),
    name: z.string(),
    type: membershipTypeSchema,
    isOwner: z.boolean(),
  }),
);

export const groupListSchema = openApiRegistry.register(
  "GroupList",
  z.object({ groups: z.array(groupSummarySchema) }),
);

export const groupMemberSchema = openApiRegistry.register(
  "GroupMember",
  personRefSchema.extend({
    isOwner: z.boolean(),
    email: z
      .string()
      .nullable()
      .meta({ description: "Null for a deleted account (FR-07, BR-05)" }),
  }),
);

export const groupBuyerSchema = openApiRegistry.register(
  "GroupBuyer",
  personRefSchema.extend({
    whatsappNumber: z.string().nullable().meta({
      description: "E.164; null for a deleted account (BR-04, BR-05)",
    }),
  }),
);

export const groupSchema = openApiRegistry.register(
  "Group",
  z.object({
    id: z.uuid(),
    name: z.string(),
    members: z.array(groupMemberSchema),
    buyers: z.array(groupBuyerSchema),
  }),
);

// Invitations (docs/05-API.md, section 2; FR-06, BR-08, BR-09).

export const createInvitationRequestSchema = openApiRegistry.register(
  "CreateInvitationRequest",
  z.object(createInvitationRequestShape),
);

export const invitationSchema = openApiRegistry.register(
  "Invitation",
  z.object({
    id: z.uuid(),
    type: membershipTypeSchema,
    inviteeName: z
      .string()
      .nullable()
      .meta({ description: "The name the member gave, if any (BR-32)" }),
    expiresAt: z.iso.datetime(),
  }),
);

export const invitationCollectionSchema = openApiRegistry.register(
  "InvitationCollection",
  z.object({ invitations: z.array(invitationSchema) }),
);

export const createdInvitationSchema = openApiRegistry.register(
  "CreatedInvitation",
  invitationSchema.extend({
    link: z.url().meta({
      description:
        "The Invitation screen's address, holding the single-use code (BR-08)",
    }),
  }),
);

export const invitationPreviewSchema = openApiRegistry.register(
  "InvitationPreview",
  z.object({
    inviterName: z
      .string()
      .meta({ description: '"Former user" for a deleted account' }),
    groupName: z.string(),
    type: membershipTypeSchema,
    alreadyInGroup: z.boolean().meta({
      description:
        "The signed-in user already has the access the invitation gives (BR-09); false when signed out",
    }),
  }),
);

export const acceptedInvitationSchema = openApiRegistry.register(
  "AcceptedInvitation",
  z.object({ groupId: z.uuid(), type: membershipTypeSchema }),
);

// Lists and items (docs/05-API.md, section 3). Request schemas are rebuilt here
// from the shared shapes, so they can be named in the document.

export const listSchema = openApiRegistry.register(
  "List",
  z.object({ id: z.uuid(), name: z.string() }),
);

export const listCollectionSchema = openApiRegistry.register(
  "ListCollection",
  z.object({ lists: z.array(listSchema) }),
);

export const createListRequestSchema = openApiRegistry.register(
  "CreateListRequest",
  z.object(createListRequestShape),
);

export const itemStatusSchema = openApiRegistry.register(
  "ItemStatus",
  z.enum(ITEM_STATUSES),
);

export const itemSchema = openApiRegistry.register(
  "Item",
  z.object({
    id: z.uuid(),
    listId: z.uuid(),
    name: z.string().max(fieldLimits.name.max),
    notes: z.string().max(fieldLimits.note.max).nullable(),
    url: z.url().max(fieldLimits.link.max).nullable(),
    storeName: z.string().nullable(),
    thumbnailUrl: z.url().nullable(),
    linkStatus: z.enum(["none", "pending", "done", "failed"]),
    quantity: z
      .number()
      .int()
      .min(fieldLimits.quantity.min)
      .max(fieldLimits.quantity.max),
    status: itemStatusSchema,
    recipient: personRefSchema.nullable(),
    buyer: personRefSchema.nullable(),
    buyerNote: z.string().nullable(),
    shipmentId: z.uuid().nullable(),
    updatedAfterReservation: z.boolean(),
    version: z.number().int(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
);

export const itemCollectionSchema = openApiRegistry.register(
  "ItemCollection",
  z.object({ items: z.array(itemSchema) }),
);

export const createItemRequestSchema = openApiRegistry.register(
  "CreateItemRequest",
  z.object(createItemRequestShape),
);

export const updateItemRequestSchema = openApiRegistry.register(
  "UpdateItemRequest",
  z.object(updateItemRequestShape).refine(changesSomething, {
    message: "nothing to change",
  }),
);

export const itemFiltersSchema = z.object(itemFiltersShape);

// Buying (docs/05-API.md, section 2).

/** An item with the list and group it belongs to, for To buy and My purchases (FR-21). */
export const buyerItemSchema = openApiRegistry.register(
  "BuyerItem",
  itemSchema.extend({
    list: z.object({ id: z.uuid(), name: z.string() }),
    group: z.object({ id: z.uuid(), name: z.string() }),
  }),
);

export const buyerItemCollectionSchema = openApiRegistry.register(
  "BuyerItemCollection",
  z.object({ items: z.array(buyerItemSchema) }),
);

export const toBuyFiltersSchema = z.object(toBuyFiltersShape);

/** The body is optional: a request without one is read as an empty body. */
export const purchaseRequestSchema = openApiRegistry.register(
  "PurchaseRequest",
  z.object(purchaseRequestShape),
);

// Onboarding and profile (docs/05-API.md, section 2).

export const onboardingRequestSchema = openApiRegistry.register(
  "OnboardingRequest",
  z.object(onboardingRequestShape),
);

export const updateMeRequestSchema = openApiRegistry.register(
  "UpdateMeRequest",
  z.object(updateMeRequestShape).refine(namesAField, {
    message: "nothing to change",
  }),
);
