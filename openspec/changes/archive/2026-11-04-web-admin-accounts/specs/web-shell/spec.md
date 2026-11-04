# Delta — web-shell

## MODIFIED Requirements

### Requirement: Navegación filtrada por permisos
La barra lateral SHALL mostrar el mapa de pantallas MVP de README §1.3 en sus grupos (Reconciliation, Settlements, Search, Reports, Administration), y SHALL ocultar cada entrada cuyo permiso requerido no tenga el rol; un grupo sin entradas visibles SHALL ocultarse. Las entradas aún no construidas SHALL mostrarse deshabilitadas, no como enlaces. La ficha de una cuenta, con todas sus pestañas, SHALL marcar activa la entrada Accounts.

#### Scenario: viewer
- **GIVEN** el usuario `viewer` (permisos `fee.view`, `reports.view`)
- **WHEN** entra
- **THEN** no ve el grupo Reconciliation (New Reconciliation, In Progress) ni la entrada Payments, ni Users & Roles ni Audit Log
- **AND** ve Dashboard, Settlements › Settlement List, Administration › Accounts, Administration › Fees y Administration › Channel Assignment como enlaces

#### Scenario: analyst
- **GIVEN** el usuario `analyst` (`settlement.process`, `fee.view`, `reports.view`)
- **WHEN** entra
- **THEN** ve New Reconciliation como enlace a `/reconciliations/new`, Settlement List como enlace a `/settlements`, Fees como enlace a `/fees`, Channel Assignment como enlace a `/channel-assignment`, In Progress deshabilitada mientras no exista, y no ve Payments ni Users & Roles

#### Scenario: admin
- **GIVEN** el usuario `admin` (los siete permisos)
- **WHEN** entra
- **THEN** ve todas las entradas MVP de §1.3; solo Dashboard, New Reconciliation, Settlement List, Accounts, Fees y Channel Assignment son enlaces en este tramo

#### Scenario: Sin fee.view
- **GIVEN** un rol sin `fee.view`
- **WHEN** entra
- **THEN** no ve la entrada Administration › Fees

#### Scenario: Entrada deshabilitada
- **WHEN** un usuario pulsa una entrada aún no construida
- **THEN** no cambia de ruta y la entrada se anuncia como no disponible a los lectores de pantalla

#### Scenario: Entrada activa en el espacio de un import
- **GIVEN** `analyst` en `/imports/<importId>`
- **WHEN** mira la barra lateral
- **THEN** New Reconciliation aparece como la entrada activa

#### Scenario: Entrada activa en la lista de settlements
- **GIVEN** `viewer` en `/settlements?accountId=<ProviderA-USD>&status=paid`
- **WHEN** mira la barra lateral
- **THEN** Settlement List aparece como la entrada activa

#### Scenario: Entrada activa en la ficha de una cuenta
- **GIVEN** `viewer` en `/accounts/<ProviderA-USD>`
- **WHEN** mira la barra lateral
- **THEN** Accounts aparece como la entrada activa

#### Scenario: Entrada activa en los fees de una cuenta
- **GIVEN** `viewer` en `/accounts/<ProviderA-USD>/fees`
- **WHEN** mira la barra lateral
- **THEN** Accounts aparece como la entrada activa, y Fees no

#### Scenario: Entrada activa en Channel Assignment
- **GIVEN** `viewer` en `/channel-assignment?merchantId=1`
- **WHEN** mira la barra lateral
- **THEN** Channel Assignment aparece como la entrada activa
