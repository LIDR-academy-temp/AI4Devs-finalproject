// The data in docs/04-DATA-MODEL.md, section 3. Dates are fixed and every row has a fixed
// ID, so two loads give the same rows, and tests can refer to rows through `seedIds`.
import type { Database } from "../src/server/db/client";
import {
  deliveryAddresses,
  groups,
  invitations,
  items,
  lists,
  memberships,
  recipientDetails,
  recipients,
  shipments,
  statusHistory,
  users,
} from "../src/server/db/schema";

function seedId(area: number, row: number) {
  const suffix = String(area * 1000 + row).padStart(12, "0");
  return `00000000-0000-4000-8000-${suffix}`;
}

export const seedIds = {
  users: {
    ana: seedId(1, 1),
    rosa: seedId(1, 2),
    juan: seedId(1, 3),
    luis: seedId(1, 4),
    pedro: seedId(1, 5),
  },
  groups: { garcia: seedId(2, 1), perez: seedId(2, 2) },
  recipients: {
    anthony: seedId(3, 1),
    grandma: seedId(3, 2),
    mom: seedId(3, 3),
  },
  lists: {
    birthday: seedId(4, 1),
    medicine: seedId(4, 2),
    archived: seedId(4, 3),
    errands: seedId(4, 4),
  },
  addresses: { grandmasHouse: seedId(5, 1), momsHouse: seedId(5, 2) },
  shipments: { juansShipment: seedId(6, 1) },
  items: {
    pending: seedId(7, 1),
    reservedByJuan: seedId(7, 2),
    purchasedByJuan: seedId(7, 3),
    shippedFirst: seedId(7, 4),
    shippedSecond: seedId(7, 5),
    unavailable: seedId(7, 6),
    purchasedByPedro: seedId(7, 7),
    pendingNoRecipient: seedId(7, 8),
    perezPending: seedId(7, 9),
  },
  invitations: {
    pending: seedId(8, 1),
    expired: seedId(8, 2),
    accepted: seedId(8, 3),
    cancelled: seedId(8, 4),
    declined: seedId(8, 5),
  },
} as const;

function day(dayOfJanuary: number) {
  const date = String(dayOfJanuary).padStart(2, "0");
  return new Date(`2026-01-${date}T12:00:00Z`);
}

// Invitation codes are the length real ones have, but plainly not random.
function invitationCode(name: string) {
  return `seed-${name}-`.padEnd(43, "0");
}

const { ana, rosa, juan, luis, pedro } = seedIds.users;
const { garcia, perez } = seedIds.groups;

function person(id: string, name: string, language: "es" | "en", row: number) {
  return {
    id,
    name,
    email: `${name.toLowerCase()}@example.com`,
    emailVerified: true,
    language,
    whatsappNumber: `+1202555010${row}`,
    termsAcceptedAt: day(1),
    onboardedAt: day(1),
    createdAt: day(1),
    updatedAt: day(1),
  };
}

const seedUsers = [
  person(ana, "Ana", "en", 1),
  person(rosa, "Rosa", "es", 2),
  person(juan, "Juan", "es", 3),
  person(luis, "Luis", "es", 4),
  person(pedro, "Pedro", "es", 5),
];

const seedGroups = [
  {
    id: garcia,
    name: "García Group",
    ownerId: ana,
    createdAt: day(1),
    updatedAt: day(1),
  },
  {
    id: perez,
    name: "Pérez Group",
    ownerId: luis,
    createdAt: day(1),
    updatedAt: day(1),
  },
];

const seedMemberships = [
  {
    id: seedId(9, 1),
    groupId: garcia,
    userId: ana,
    type: "member",
    joinedAt: day(1),
  },
  {
    id: seedId(9, 2),
    groupId: garcia,
    userId: rosa,
    type: "member",
    joinedAt: day(1),
  },
  {
    id: seedId(9, 3),
    groupId: garcia,
    userId: juan,
    type: "buyer",
    joinedAt: day(2),
  },
  {
    id: seedId(9, 4),
    groupId: garcia,
    userId: luis,
    type: "buyer",
    joinedAt: day(2),
  },
  {
    id: seedId(9, 5),
    groupId: garcia,
    userId: pedro,
    type: "buyer",
    status: "ended",
    joinedAt: day(2),
    endedAt: day(10),
  },
  {
    id: seedId(9, 6),
    groupId: perez,
    userId: luis,
    type: "member",
    joinedAt: day(1),
  },
] satisfies (typeof memberships.$inferInsert)[];

const seedInvitations = [
  {
    id: seedIds.invitations.pending,
    groupId: garcia,
    type: "buyer",
    inviteeName: "Carlos",
    code: invitationCode("pending"),
    createdBy: ana,
    // Far away on purpose: a second load skips this row, so a date near the load would
    // expire in a long-lived development database.
    expiresAt: new Date("2099-01-01T00:00:00Z"),
    createdAt: day(1),
  },
  {
    id: seedIds.invitations.expired,
    groupId: garcia,
    type: "member",
    code: invitationCode("expired"),
    createdBy: ana,
    expiresAt: day(8),
    createdAt: day(1),
  },
  {
    id: seedIds.invitations.accepted,
    groupId: garcia,
    type: "buyer",
    code: invitationCode("accepted"),
    status: "accepted",
    createdBy: ana,
    expiresAt: day(8),
    acceptedBy: juan,
    acceptedAt: day(2),
    createdAt: day(1),
  },
  {
    id: seedIds.invitations.cancelled,
    groupId: garcia,
    type: "buyer",
    code: invitationCode("cancelled"),
    status: "cancelled",
    createdBy: ana,
    expiresAt: day(8),
    createdAt: day(1),
  },
  {
    id: seedIds.invitations.declined,
    groupId: garcia,
    type: "member",
    code: invitationCode("declined"),
    status: "declined",
    createdBy: rosa,
    expiresAt: day(9),
    createdAt: day(2),
  },
] satisfies (typeof invitations.$inferInsert)[];

const { anthony, grandma, mom } = seedIds.recipients;

const seedRecipients = [
  { id: anthony, name: "Anthony" },
  { id: grandma, name: "Grandma" },
  { id: mom, name: "Mom" },
].map((recipient) => ({
  ...recipient,
  groupId: garcia,
  createdAt: day(1),
  updatedAt: day(1),
}));

const seedRecipientDetails = [
  {
    id: seedId(10, 1),
    recipientId: anthony,
    name: "Shoe",
    value: "4",
    position: 0,
  },
  {
    id: seedId(10, 2),
    recipientId: anthony,
    name: "Shirt",
    value: "M",
    position: 1,
  },
  {
    id: seedId(10, 3),
    recipientId: grandma,
    name: "Allergy",
    value: "penicillin",
    position: 0,
  },
];

const { birthday, medicine, archived, errands } = seedIds.lists;

const seedLists = [
  { id: birthday, groupId: garcia, name: "Anthony's birthday" },
  { id: medicine, groupId: garcia, name: "Medicine" },
  { id: archived, groupId: garcia, name: "Last Christmas", archivedAt: day(5) },
  { id: errands, groupId: perez, name: "Errands" },
].map((list) => ({ ...list, createdAt: day(1), updatedAt: day(1) }));

const grandmasHouse = {
  label: "Grandma's house",
  receiverName: "Carmen García",
  phone: "+12025550106",
  address: "123 Example Street",
  country: "CU",
};

const seedAddresses = [
  {
    id: seedIds.addresses.grandmasHouse,
    ...grandmasHouse,
    isDefault: true,
  },
  {
    id: seedIds.addresses.momsHouse,
    label: "Mom's house",
    receiverName: "Marta García",
    phone: "+12025550107",
    address: "456 Sample Avenue",
    country: "CU",
  },
].map((address) => ({
  ...address,
  groupId: garcia,
  createdAt: day(1),
  updatedAt: day(1),
}));

const seedShipments = [
  {
    id: seedIds.shipments.juansShipment,
    groupId: garcia,
    buyerId: juan,
    shipDate: "2026-01-06",
    agency: "Example Cargo",
    service: "maritime",
    deliveryAddressId: seedIds.addresses.grandmasHouse,
    addressLabel: grandmasHouse.label,
    addressReceiverName: grandmasHouse.receiverName,
    addressPhone: grandmasHouse.phone,
    addressText: grandmasHouse.address,
    addressCountry: grandmasHouse.country,
    createdAt: day(6),
    updatedAt: day(6),
  },
] satisfies (typeof shipments.$inferInsert)[];

type ItemStatus = NonNullable<(typeof items.$inferInsert)["status"]>;

// The status changes that led to each status, from creation (BR-22).
const STATUS_PATHS: Record<ItemStatus, ItemStatus[]> = {
  pending: ["pending"],
  reserved: ["pending", "reserved"],
  purchased: ["pending", "reserved", "purchased"],
  shipped: ["pending", "reserved", "purchased", "shipped"],
  unavailable: ["pending", "reserved", "unavailable"],
};

const seedItemDefinitions: (Omit<
  typeof items.$inferInsert,
  "version" | "createdAt" | "updatedAt"
> & { id: string; status: ItemStatus; addedBy: string })[] = [
  {
    id: seedIds.items.pending,
    listId: birthday,
    recipientId: anthony,
    name: "Building blocks",
    status: "pending",
    addedBy: ana,
  },
  {
    id: seedIds.items.reservedByJuan,
    listId: birthday,
    recipientId: anthony,
    name: "Running shoes",
    notes: "Size 4, blue if possible",
    status: "reserved",
    buyerId: juan,
    addedBy: ana,
  },
  {
    id: seedIds.items.purchasedByJuan,
    listId: birthday,
    recipientId: anthony,
    name: "Backpack",
    status: "purchased",
    buyerId: juan,
    buyerNote: "Bought the green one",
    addedBy: rosa,
  },
  {
    id: seedIds.items.shippedFirst,
    listId: birthday,
    recipientId: anthony,
    name: "T-shirt",
    quantity: 2,
    status: "shipped",
    buyerId: juan,
    shipmentId: seedIds.shipments.juansShipment,
    addedBy: ana,
  },
  {
    id: seedIds.items.shippedSecond,
    listId: birthday,
    recipientId: anthony,
    name: "Socks",
    status: "shipped",
    buyerId: juan,
    shipmentId: seedIds.shipments.juansShipment,
    addedBy: ana,
  },
  {
    id: seedIds.items.unavailable,
    listId: medicine,
    recipientId: grandma,
    name: "Ibuprofen",
    status: "unavailable",
    buyerId: luis,
    unavailableNote: "Out of stock at every store nearby",
    addedBy: rosa,
  },
  {
    id: seedIds.items.purchasedByPedro,
    listId: medicine,
    recipientId: mom,
    name: "Vitamins",
    status: "purchased",
    buyerId: pedro,
    addedBy: rosa,
  },
  {
    id: seedIds.items.pendingNoRecipient,
    listId: medicine,
    name: "Bandages",
    status: "pending",
    addedBy: rosa,
  },
  {
    id: seedIds.items.perezPending,
    listId: errands,
    name: "Coffee",
    status: "pending",
    addedBy: luis,
  },
];

// Each status change happens on the next day, with the item's version going up each time.
const seedItems = seedItemDefinitions.map((item) => {
  const changes = STATUS_PATHS[item.status].length - 1;
  return {
    ...item,
    version: 1 + changes,
    createdAt: day(3),
    updatedAt: day(3 + changes),
  };
});

const seedStatusHistory = seedItemDefinitions.flatMap((item, itemIndex) => {
  const path = STATUS_PATHS[item.status];
  return path.map((toStatus, step) => ({
    id: seedId(11, itemIndex * 10 + step),
    itemId: item.id,
    fromStatus: step === 0 ? null : (path[step - 1] ?? null),
    toStatus,
    authorId: step === 0 ? item.addedBy : (item.buyerId ?? item.addedBy),
    createdAt: day(3 + step),
  }));
});

/**
 * Inserts the seed data, parents first, in one transaction. A row whose ID already
 * exists is skipped, so a second load keeps developers' changes. Any other conflict
 * stops the load, rather than leaving a seed person silently missing.
 */
export async function loadSeedData(db: Database) {
  await db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values(seedUsers)
      .onConflictDoNothing({ target: users.id });
    await tx
      .insert(groups)
      .values(seedGroups)
      .onConflictDoNothing({ target: groups.id });
    await tx
      .insert(memberships)
      .values(seedMemberships)
      .onConflictDoNothing({ target: memberships.id });
    await tx
      .insert(invitations)
      .values(seedInvitations)
      .onConflictDoNothing({ target: invitations.id });
    await tx
      .insert(recipients)
      .values(seedRecipients)
      .onConflictDoNothing({ target: recipients.id });
    await tx
      .insert(recipientDetails)
      .values(seedRecipientDetails)
      .onConflictDoNothing({ target: recipientDetails.id });
    await tx
      .insert(lists)
      .values(seedLists)
      .onConflictDoNothing({ target: lists.id });
    await tx
      .insert(deliveryAddresses)
      .values(seedAddresses)
      .onConflictDoNothing({ target: deliveryAddresses.id });
    await tx
      .insert(shipments)
      .values(seedShipments)
      .onConflictDoNothing({ target: shipments.id });
    await tx
      .insert(items)
      .values(seedItems)
      .onConflictDoNothing({ target: items.id });
    await tx
      .insert(statusHistory)
      .values(seedStatusHistory)
      .onConflictDoNothing({ target: statusHistory.id });
  });
}
