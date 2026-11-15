# UX design

**Assisted Shopping Platform: ComproParaTi** · **Version:** 1.12 · **Date:** November 15, 2026

Part of the project documentation ([readme](../readme.md)). IDs (`BR`, `FR`, `E`, `US`, `AC`) are defined in the [PRD](01-PRD.md).

---

## 1. User flows

**A. New user**
1. Chooses a language and taps **Continue with Google**.
2. Confirms the language, prefilled with the one chosen on Welcome, checks the 18-or-older and terms box, and enters their WhatsApp number.
3. The app creates their group and first list (BR-06). The group name can be changed in Group.
4. Lands on Lists, on their first list, and can add an item right away. People and delivery addresses are optional and can be added later; People and Group each have an empty state that prompts for them ([section 2.7](#27-empty-states-loading-and-errors)).

**B. Add an item**
1. Types the name in the quick field and presses Enter, or taps **+ Add** for the full form.
2. If they paste a link, "Looking up the product…" appears and they can keep typing. When the data arrives, the image and title are shown without overwriting what they already typed.
3. If the link fails: "We couldn't read that link. No problem, we saved it anyway."

**C. Invite**
1. In Group, a member taps "Invite a member" or "Invite a buyer", can type the person's name, and taps **Create link**.
2. They tap **Share on WhatsApp**, and WhatsApp opens with a message and the link ([section 2.6](#26-whatsapp-and-email-content)). They can also copy the link.
3. The invitee opens the link, taps **Continue with Google**, completes step 2 of flow A, and accepts. They join that group, and no group of their own is created. A member lands on Lists; a buyer lands on To buy.
4. If the link was used, expired, or cancelled (BR-08): "This invitation is no longer valid. Ask for a new one."
5. If the user already belongs to the group with that access: "You're already in this group." (BR-09)

**D. Notify the buyer:** in the list, a member taps **Notify** and WhatsApp opens with "I added things to the Medicine list: {link}". If there are several buyers, they choose who.

**E. Purchase**
1. The buyer opens **To buy** and sees the pending items by person.
2. Taps **I'll buy it** on the card.
3. Opens the item, reads the notes and the person's details, opens the store, and buys.
4. Taps **I bought it**, with an optional note.

**F. Ship**
1. In **My purchases**, the buyer selects the purchased items going in the same box.
2. Taps **Ship N selected**, chooses the delivery address (the default is preselected), copies it into the agency's form if needed, checks the date, agency, and service, and taps **Done**.
3. The items change to `Shipped`, show the shipping details, and the group's members receive the grouped email.

**G. Couldn't buy it**
1. The buyer taps **Couldn't buy it** and writes why.
2. Members receive an email and see the item first in their list.
3. A member taps **Edit** (the item returns to pending) or **Delete**. If they want to talk about it, they use the WhatsApp button.

**H. A member who also buys:** in the list, the member opens a pending item and taps **I'll buy it**. The My purchases tab appears, and from there they continue with flows E and F.

**I. Remove someone or leave:** a member removes buyers in Group, and the owner removes members there too. Members and buyers leave from Profile › Groups. Confirmation: "{Name} will no longer see the lists. Anything they reserved will be released." The owner first picks a new owner in Group with **Make owner**; if they are the only member, leaving shows "This will delete the group and its lists" (BR-07).

**J. Create a group:** any user taps **Create a group** in Profile and enters a name, prefilled with "{First name}'s group". The app creates the group and "My list" and switches to it. A user who had no member access until then also gets the Lists, People, and Group tabs.

**K. Fix a mistake:** the item's buyer taps **Undo** on a purchased, shipped, or unavailable item and confirms; the item returns to the previous status (BR-24). On a shipped item, **Edit shipment** opens the shipping sheet with the saved values (BR-29).

**L. Delete account:** in Profile, the user taps **Delete account** and confirms: "Anything you reserved will be released, and items you bought but didn't ship will go back to pending." Owners pick a new owner first (BR-05).

---

## 2. Interface design

### 2.1 Design principles

Colors, typography, components, and the screen mockups are in the [design system](../DESIGN.md). This section and the PRD take precedence over the mockups.

1. **Mobile first and built for little digital experience:** one main action per screen, 16 to 18 px text, buttons at least 48 px tall.
2. **Ask for the minimum:** a name is enough to create an item.
3. **One place for details:** everything specific goes in Notes, both on the item and on the person.
4. **Everyday language:** "Group", "People", "I'll buy it".
5. **Show only what each person can do:** there are no modes to switch. Screens and buttons appear according to the user's memberships and the item's status.
6. **WhatsApp one tap away** from any item. The app does not compete with WhatsApp: it holds the list and the status.
7. **Never block:** if something fails, the user can continue by hand.
8. **Status always visible:** every item shows which step it is in and what comes next.

### 2.2 Navigation

```
Bottom bar (tabs appear according to the user)

Lists         member of at least one group
People        member of at least one group
Group         member of at least one group
To buy        buyer in at least one group
My purchases  buyers always; members while
              they have reserved or purchased items

Header:  [García Group ▾]      ↻     (avatar)
```

- A person who only requests sees Lists, People, and Group. A person who only buys sees To buy and My purchases. A member who reserves an item also gets My purchases while they have reserved or purchased items, with no mode switch.
- The group selector chooses the group that Lists, People, and Group show. It lists the groups the user is a member of and appears only when there are two or more; the choice is remembered on the device. With one such group the header shows its name, and with none, the product name. To buy and My purchases show all the user's groups, with their own filters.
- Profile opens from the avatar in the header, for every user. The avatar shows the user's initials.
- **Main screen:** the user's first tab, or Profile when they have none. A signed-in user lands there, and "This page isn't available" leads back to it.
- **Refresh (↻)** in the header reloads the current screen. Screens also load fresh data when opened; there are no live updates.
- Lists has a floating **+ Add** button.
- On desktop: a sidebar with the same tabs, and list and item side by side.

### 2.3 Screens

| # | Screen | Shown to | Main content | FR |
|---|---|---|---|---|
| 1 | Welcome | All | Product name ([PRD §16](01-PRD.md#16-product-decisions)), language selector, "Continue with Google" button | 01, 37 |
| 2 | One last step | All | Language, prefilled with the Welcome choice; checkbox "I am 18 or older and accept the terms"; WhatsApp number | 02, 03, 33 |
| 3 | Invitation | Invitee | Who is inviting, to which group, and as member or buyer, "Accept" and "Decline" buttons; message if the link was used, expired, or cancelled, or if the user already belongs to the group | 05, 06, 17 |
| 4 | Lists | Members | Lists, items with their status, quick add, "Notify buyer", rename, archive, and delete list | 05, 11, 12, 13, 35 |
| 5 | Add or edit item | Members | Short form (see [section 2.4](#24-key-screens)) | 13, 14, 16 |
| 6 | Item page | All | Item notes, person's details, status and timeline, buyer note, shipping details, WhatsApp, "Updated" marker for the buyer, and the actions the user can take (see [section 2.4](#24-key-screens) and [section 2.5](#25-item-statuses-and-actions)) | 15, 16, 22 to 26, 29 to 32, 34 |
| 7 | People | Members | List of people, and a page for each with details, notes, and delete | 09, 10 |
| 8 | Group | Members | Group name (rename), members, buyers, pending invitations, delivery addresses, invite, remove, transfer ownership | 06, 07, 17, 19, 27 |
| 9 | To buy | Buyers | Pending items from their groups, grouped by person, filters by group and list | 18, 21, 24 |
| 10 | My purchases | Buyers, and members with reserved or purchased items | Reserved and purchased items; select purchased items to ship them together | 25, 29, 31 |
| 11 | Mark as shipped | The item's buyer | Sheet with delivery address, ship date, shipping agency, and service (see [section 2.4](#24-key-screens)); also used to edit a shipment | 28, 29 |
| 12 | Profile | All | Language, WhatsApp, emails, groups (leave), create a group, sign out, delete account, report a problem | 04, 05, 19, 20, 36 |

An item has six fields and a person has three.

### 2.4 Key screens

**Lists (member, mobile)**

```
┌───────────────────────────────┐
│ Medicine ▾       [ Notify ]   │
│ [ Type what you want…     ]   │
│                               │
│ ⚠ Brown hair dye              │
│   Unavailable · See note      │
│ ○ Vitamins · Grandma          │
│   Pending                     │
│ ◐ Shoes · Anthony             │
│   Reserved by Juan            │
│ ● Coffee · Mom                │
│   Purchased by Juan           │
│ ▸ Shipped (8)                 │
└───────────────────────────────┘
```

- Lists opens the group's first list, in the order the lists were created, or the list chosen in the list menu, which the address keeps.
- `Unavailable` items appear first, because they are waiting for a decision from a member. The other items follow, newest first, so an item added with the quick field appears right under it.
- Shipped items are grouped at the end, collapsed, with their count.
- Simple filters above the list: by person ("All", each person with items in the list, and "No person" when an item has none) and by status ("All", and each status in the list, with its count). Both apply together. When no item matches, the list says "No items match these filters."
- The list menu (**Medicine ▾**) switches lists, offers **New list**, which asks for the list's name, and offers **Rename**, **Archive**, and **Delete**. When an action is not allowed, the menu says why ([section 2.7](#27-empty-states-loading-and-errors)).
- On desktop, the item side shows "Choose an item to see it here." until an item is chosen.

**Add item (member, mobile)**

```
┌───────────────────────────────┐
│ ←  Add item                   │
│ Paste a link (optional)       │
│ [ https://...               ] │
│ ┌────┐ Sports shoes           │
│ │img │ Store                  │
│ └────┘                        │
│ Name *                        │
│ [ Sports shoes              ] │
│ Who is it for? [ Anthony  ▾ ] │
│ List       [ Birthday     ▾ ] │
│ Quantity   [ 1 ]              │
│ Notes                         │
│ [ In white, no laces        ] │
│ [           Save            ] │
└───────────────────────────────┘
```

- Everything fits on one screen, with no "More options" section. Field limits follow BR-32.
- Help text under Notes: "Size, color, brand, dose, or anything the buyer should know."
- The preview with the image appears only if the link returned data.

**Person page (member):** name, a list of "detail and value" rows with an "Add detail" button (e.g. Shoe: 4), and a notes field. When a person is created, "Clothing", "Shoe", and "Allergies" are suggested as examples and can be deleted. Members can delete a person (BR-15).

**Group (member):**

- The group name, with the subtitle "Shared family shopping space · Managed by {name}" under it, naming the owner.
- **Invite a member** and **Invite a buyer**. Either one opens a sheet with the field "Who are you inviting? (optional)" (BR-32) and **Create link**; the sheet then shows the link, **Share on WhatsApp**, **Copy link**, and when the link expires (BR-08).
- The pending invitations. Each row shows the invitee's name, or the invitation type when it has no name, then "Invited as {type}", when it expires, and **Cancel invitation**.
- The members, each with their email, and an **Owner** tag on the owner.
- The buyers, each with their WhatsApp number (BR-04).
- The delivery addresses, below.

**Delivery addresses (member, in Group):** a card for each address, showing its place name, receiver, phone, address, and country, and a "Default" tag on the default. **+ Add address** opens a form with Place name (e.g. "Grandma's house"), Receiver's name, Phone, Address (several lines of free text), and Country. Country offers every country, with names from the translation files, and is stored as its ISO 3166-1 alpha-2 code ([Data model §2](04-DATA-MODEL.md#2-entities)). Each card has **Edit**, which opens the same form with the saved values, **Make default** on the cards that aren't the default, and **Delete**, which follows BR-27 for the default address. The form has no default option: the default changes only through **Make default**. Buyers see the addresses but cannot change them (BR-12).

**Item page (all users, mobile)**

The same page serves everyone. The example shows the buyer who reserved the item.

```
┌───────────────────────────────┐
│ ←  Sports shoes          ⋯    │
│ [img]  Reserved by you        │
│ For: Anthony · Quantity: 1    │
│ ┌─ Item notes ──────────────┐ │
│ │ In white, no laces        │ │
│ └───────────────────────────┘ │
│ ┌─ Anthony's details ───────┐ │
│ │ Shoe: 4                   │ │
│ │ Note: prefers blue        │ │
│ └───────────────────────────┘ │
│ [ Open in store ↗ ]           │
│ [ Message on WhatsApp ]       │
│ [       I bought it         ] │
│ Release · Couldn't buy it     │
└───────────────────────────────┘
```

- The item's notes come before the person's details and take precedence over them.
- The main button and the secondary actions change with the user and the status ([section 2.5](#25-item-statuses-and-actions)). Members find Edit and Delete in the **⋯** menu while the item is not purchased.
- **Delete** asks for confirmation, naming the item.
- **I bought it** opens a sheet with an optional field "Want to leave a note?" and a "Done" button.
- **Couldn't buy it** requires a note.
- If a member edits an item after it was reserved, the buyer sees an **Updated** tag on the item card and at the top of the item page until they open it.
- On a purchased item, the item's buyer sees **Undo** under **I shipped it**. On an unavailable item, the buyer sees **Undo** until a member edits it. Undo asks for confirmation and returns the item to Reserved.
- A shipped item shows a shipping block instead of action buttons. The item's buyer also sees **Edit shipment** and **Undo**:

```
┌─ Shipped ─────────────────────┐
│ October 10, 2026 · Air        │
│ Express Cargo                 │
│ To: Grandma's house           │
│ Same shipment: 2 more items › │
│ Edit shipment · Undo          │
└───────────────────────────────┘
```

- **Edit shipment** opens the shipping sheet with the saved values; changes apply to every item in the shipment. **Undo** moves only this item back to Purchased.

**My purchases (buyer, mobile)**

```
┌───────────────────────────────┐
│ My purchases                  │
│                               │
│ Reserved (2)                  │
│ ◐ Shoes · Anthony             │
│ ◐ Vitamins · Grandma          │
│                               │
│ Purchased · García Group (3)  │
│ ☑ Coffee · Mom                │
│ ☑ Soap · Grandma              │
│ ☐ Hair dye · Mom              │
│                               │
│ [    Ship 2 selected        ] │
└───────────────────────────────┘
```

- Purchased items are grouped by group, and a selection can include items from only one group (BR-28).
- **I shipped it** on the item page opens the same sheet for that single item.

**Mark as shipped (sheet)**

```
┌───────────────────────────────┐
│ Mark as shipped (2 items)     │
│ Ship to                       │
│ [ Grandma's house       ▾ ]   │
│ María Pérez · +53 5 123 4567  │
│ Calle 23 #456 e/ A y B,       │
│ Vedado, La Habana, Cuba       │
│                     [ Copy ]  │
│ Ship date                     │
│ [ October 10, 2026        ]   │
│ Shipping agency               │
│ [ Express Cargo           ]   │
│ Service                       │
│ ( ) Maritime    (•) Air       │
│ [           Done          ]   │
└───────────────────────────────┘
```

- The default address is preselected. **Copy** copies the receiver's name, phone, and address, ready to paste into the agency's form.
- The date defaults to today. Agency and service start with the values the buyer used last.
- If a required field is missing (BR-28), "Done" points to it.
- When editing a shipment, the title is "Edit shipment (N items)" and the fields start with the saved values.
- If the group has no address, the sheet shows "This group has no delivery address yet" with a "Message on WhatsApp" button, and the items can still be marked as shipped.

### 2.5 Item statuses and actions

| Status | Label (EN / ES) | Who sees the main button | Main button | Secondary |
|---|---|---|---|---|
| Pending | Pending / Pendiente | Members and buyers | "I'll buy it" | Members: Edit, Delete |
| Reserved | Reserved / Reservado | The item's buyer | "I bought it" | "Release", "Couldn't buy it" |
| Reserved | Reserved / Reservado | Everyone else | None; shows "Reserved by {name}" | Members: Edit |
| Purchased | Purchased / Comprado | The item's buyer | "I shipped it" | "Undo" |
| Shipped | Shipped / Enviado | Everyone | None; shows date, agency, service, and address | The item's buyer: "Edit shipment", "Undo" |
| Unavailable | Unavailable / No disponible | Members | "Edit" | "Delete" |
| Unavailable | Unavailable / No disponible | The item's buyer | None | "Undo" (until a member edits the item) |

- Each status is shown with an icon, text, and color; color is never the only indicator.
- Which transitions are allowed, and who can edit or delete in each status: BR-22 and BR-19.
- **Undo** asks for confirmation before returning the item to its previous status.

### 2.6 WhatsApp and email content

- **"Message on WhatsApp" button** on every item. Prefilled message:
  - EN: "Hi, I'm writing about "Sports shoes" for Anthony: {link}"
  - ES: «Hola, te escribo por "Zapatos deportivos" para Anthony: {enlace}»
- **Who receives it:** BR-30. When the user has to choose, a short picker lists the names.
- **Invitation message** (**Share on WhatsApp**, flow C), in the inviting member's language:
  - EN: "Hi {name}, {inviter} invited you to {group} on ComproParaTi as a {type}: {link}", with the type in lowercase (member or buyer). Without an invitee name, it starts "Hi,".
  - ES: «Hola {nombre}, {invitador} te invitó a {grupo} en ComproParaTi como {tipo}: {enlace}», with the type in lowercase (miembro o comprador). Without an invitee name, it starts «Hola,».
- **Reminder** under the button: "If you agree on a change, write it in the item's notes."
- **Daily email (FR-36, BR-31):** subject "Updates in {group}", one line per item grouped by Purchased, Shipped, and Unavailable, and a **View list** button. Turned on or off with one switch in Profile.

### 2.7 Empty states, loading, and errors

- **Empty states with guidance:** "No people yet. Add the first one.", "No items yet. Type what you want above.", in To buy, "Nothing to buy. When your group adds something, it will show up here.", and in My purchases, "You haven't reserved anything yet. Items you reserve will show up here."
- **No buyer:** if the group has no buyers, the list shows "Invite the person who will buy" with the invitation button.
- **No delivery address:** Group shows "Add where things should be sent". In the shipping sheet the buyer sees "This group has no delivery address yet" with a "Message on WhatsApp" button, and can still mark the items as shipped.
- **Loading:** skeletons in lists and in the link preview.
- **Errors with a way out:** "Couldn't save. Check your connection and try again", keeping what the user typed.
- **Success toast:** a short message confirms each of these actions in Group: an invitation cancelled, and an address saved, deleted, or made the default. Creating an invitation has no toast, because the sheet already shows the new link ([section 2.10](#210-spanish-interface-strings)). On phones it appears above the bottom bar. It has a **Close** button, is announced politely to screen readers, and closes after about 5 seconds, waiting while the pointer is over it or it has focus. Errors never use a toast; they stay inline, as described in this section.
- **No access (BR-13):** "This page isn't available." with a button back to the main screen.
- **No groups:** a user with no remaining group access sees "You're not in any group yet.", a **Create a group** button, and "Ask someone to invite you." above every screen. If they still have purchased items to ship (BR-11), they also get My purchases, which is their main screen; otherwise their main screen is Profile.
- **Session expired (BR-03):** after signing in again, the user is back on the same screen with their text filled in.
- **Field limits (BR-32):** text fields show a character counter as they near their limit and stop accepting text at it. Invalid values, such as a quantity of 0 or a link that isn't a web address, are pointed out under the field.
- **Default address (BR-27):** "Choose another default address first."
- **Reservation conflict:** "Someone else already reserved it", and the list refreshes.
- **No lists:** "No lists yet. Create one."
- **Can't delete a list (BR-18):** "This list has items in progress or already shipped. You can archive it instead." (Archive is offered only when allowed.)
- **Can't archive a list (BR-17):** "This list has items that are reserved or not shipped yet."
- **Can't delete a person (BR-15):** "{Name} has items that haven't shipped yet, in: {lists}."
- **Item changed:** if an item changed since the screen loaded and the action no longer applies: "This item changed. Showing the latest." and the screen refreshes. When saving an edit, what the member typed is kept so they can apply it again.

### 2.8 Accessibility, language, and responsive behavior

- Layout from 360 px wide.
- Minimum contrast 4.5:1, touch targets 48 px or larger, labels always visible, keyboard navigation, and screen reader support (WCAG 2.1 AA).
- Language follows the browser, with a selector on Welcome, on One last step, and in Profile. Changing it switches the screen's language right away.
- Phone field with country selector and automatic formatting.
- Date field with a native date picker, in the user's language format.

### 2.9 Usability targets

- A new user adds their first item in under 30 seconds after signing in.
- A buyer reserves in one tap and reaches WhatsApp in 2 taps from the item page.
- A buyer marks a box of several items as shipped in one step, with the agency, service, and default address already filled in.
- The usability test with older adults is a launch criterion ([PRD §8](01-PRD.md#8-release-plan-and-launch-criteria)).

### 2.10 Spanish interface strings

| English | Spanish |
|---|---|
| Continue with Google | Continuar con Google |
| Group | Grupo |
| People | Personas |
| Lists | Listas |
| To buy | Por comprar |
| My purchases | Mis compras |
| Profile | Perfil |
| One last step | Un último paso |
| Language | Idioma |
| I am 18 or older and accept the terms | Tengo 18 años o más y acepto los términos |
| WhatsApp number | Número de WhatsApp |
| Continue | Continuar |
| Save | Guardar |
| Daily email with the group's changes | Correo diario con los cambios del grupo |
| Sign out | Cerrar sesión |
| Couldn't save. Check your connection and try again | No se pudo guardar. Revisa tu conexión e inténtalo de nuevo |
| Development sign-in | Acceso de desarrollo |
| Refresh | Actualizar |
| Choose a group | Elegir grupo |
| Go to the start | Ir al inicio |
| Loading… | Cargando… |
| Member / Buyer | Miembro / Comprador |
| Invite a member | Invitar a un miembro |
| Invite a buyer | Invitar a un comprador |
| Shared family shopping space · Managed by {name} | Espacio compartido de compras familiares · A cargo de {nombre} |
| Owner | Propietario |
| Who are you inviting? (optional) | ¿A quién invitas? (opcional) |
| Create link | Crear enlace |
| Share on WhatsApp | Compartir por WhatsApp |
| Copy link | Copiar enlace |
| Pending invitations ({count}) | Invitaciones pendientes ({count}) |
| Invited as {type} | Invitado como {tipo} |
| Expires in 1 day | Expira en 1 día |
| Expires in {count} days | Expira en {count} días |
| Expires today | Expira hoy |
| Cancel invitation | Cancelar invitación |
| Invitation cancelled | Invitación cancelada |
| Create a group | Crear un grupo |
| {First name}'s group | Grupo de {nombre} |
| My list | Mi lista |
| + Add | + Agregar |
| Notes | Notas |
| Who is it for? | ¿Para quién? |
| Notify buyer | Avisar al comprador |
| I'll buy it | Yo lo compro |
| I bought it | Ya lo compré |
| I shipped it | Ya lo envié |
| Release | Liberar |
| Couldn't buy it | No lo pude comprar |
| Message on WhatsApp | Escribir por WhatsApp |
| Open in store | Abrir en la tienda |
| Mark as shipped | Marcar como enviado |
| Ship date | Fecha de envío |
| Shipping agency | Agencia de envío |
| Service | Servicio |
| Maritime / Air | Marítimo / Aéreo |
| Ship N selected | Enviar N seleccionados |
| Same shipment | Mismo envío |
| Delivery addresses | Direcciones de entrega |
| + Add address | + Agregar dirección |
| Ship to | Enviar a |
| Place name | Nombre del lugar |
| Receiver's name | Nombre de quien recibe |
| Phone | Teléfono |
| Address | Dirección |
| Country | País |
| Default | Predeterminada |
| Make default | Hacer predeterminada |
| Address saved | Dirección guardada |
| Address deleted | Dirección eliminada |
| {place} is now the default address | {lugar} es ahora la dirección predeterminada |
| Copy | Copiar |
| Add where things should be sent | Agrega a dónde enviar las cosas |
| This group has no delivery address yet | Este grupo todavía no tiene dirección de entrega |
| Someone else already reserved it | Otra persona ya lo reservó |
| This invitation is no longer valid. Ask for a new one. | Esta invitación ya no es válida. Pide una nueva. |
| You're already in this group. | Ya perteneces a este grupo. |
| Refresh | Actualizar |
| Updated | Actualizado |
| Undo | Deshacer |
| Edit shipment | Editar envío |
| Rename | Cambiar nombre |
| Archive | Archivar |
| Delete | Eliminar |
| Make owner | Hacer propietario |
| Leave group | Salir del grupo |
| Delete account | Eliminar cuenta |
| Former user | Antiguo usuario |
| No person | Sin persona |
| No lists yet. Create one. | Todavía no hay listas. Crea una. |
| This item changed. Showing the latest. | Este artículo cambió. Mostrando lo más reciente. |
| This page isn't available. | Esta página no está disponible. |
| You're not in any group yet. | Todavía no perteneces a ningún grupo. |
| Ask someone to invite you. | Pide a alguien que te invite. |
| Choose another default address first. | Primero elige otra dirección predeterminada. |
| New list | Nueva lista |
| List name | Nombre de la lista |
| List | Lista |
| Create | Crear |
| Cancel | Cancelar |
| Close | Cerrar |
| Type what you want… | Escribe lo que quieres… |
| Add | Agregar |
| Added: {name} | Agregado: {nombre} |
| Add item | Agregar artículo |
| Edit item | Editar artículo |
| Edit | Editar |
| Back | Volver |
| Name | Nombre |
| Paste a link (optional) | Pega un enlace (opcional) |
| Quantity | Cantidad |
| Size, color, brand, dose, or anything the buyer should know. | Talla, color, marca, dosis o lo que el comprador deba saber. |
| Enter a name. | Escribe un nombre. |
| Use {max} characters or fewer. | Usa {max} caracteres o menos. |
| Enter a web address that starts with https:// or http://. | Escribe una dirección web que empiece con https:// o http://. |
| Enter a quantity from 1 to 99. | Escribe una cantidad del 1 al 99. |
| {count} of {max} characters | {count} de {max} caracteres |
| Limit reached | Límite alcanzado |
| No items yet. Type what you want above. | Todavía no hay artículos. Escribe arriba lo que quieres. |
| All | Todos |
| Person | Persona |
| Status | Estado |
| Shipped (N) | Enviados (N) |
| Reserved by {name} | Reservado por {nombre} |
| Reserved by you | Reservado por ti |
| Purchased by {name} | Comprado por {nombre} |
| Purchased by you | Comprado por ti |
| For: {name} | Para: {nombre} |
| Quantity: N | Cantidad: N |
| Item notes | Notas del artículo |
| Opens in a new tab | Se abre en una pestaña nueva |
| More actions | Más acciones |
| Delete "{name}"? | ¿Eliminar "{nombre}"? |
| It's removed from the list for everyone. | Se quita de la lista para todos. |
| Choose an item to see it here. | Elige un artículo para verlo aquí. |
| No items match these filters. | Ningún artículo coincide con estos filtros. |
