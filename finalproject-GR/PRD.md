# Product Requirements Document
## QA Automation Platform

**Version:** 1.1  
**Status:** Living Document  
**Audience:** Product, Design, and AI-driven implementation agents

---

## 1. Product Overview

The QA Automation Platform is a collaborative web application for software quality assurance teams. It centralises the definition, organisation, execution, and tracking of test cases alongside defect management, giving teams a single source of truth for their testing process. The platform supports both manual and automated test execution and provides health dashboards, trend analytics, and exportable reports to communicate quality status to stakeholders.

---

## 2. Core Concepts

Before describing individual screens and flows, it is important to understand the primary entities and how they relate to one another.

### 2.1 Workspace
The highest organisational container. A workspace represents a company or team. Every user belongs to at least one workspace. All projects, users, and settings live within a workspace.

### 2.2 Project
A project represents a single application or product under test. It is the primary unit that organises test cases, executions, bugs, environments, tags, and folders. A user may have access to multiple projects within the same workspace, each with independently assigned roles.

### 2.3 Folder
An organisational container for test cases, nestable up to four levels deep. Folders can be renamed, reordered, and moved.

### 2.4 Tag
A coloured, named label that can be applied to both test cases and bugs to aid filtering and categorisation. Tags are created and managed per project.

### 2.5 Test Case
The fundamental unit of the platform. A test case is a single scenario to be tested. It may be written as an executable scenario (in Given/When/Then format, known as Gherkin) or as a non-executable manual description. A test case accumulates a run history over time, which the platform uses to compute health signals.

### 2.6 Environment
A named target configuration for running tests. Each environment has a base URL, a default browser preference, and one or more sets of stored credentials (each identified by a friendly alias, with an email and password). Environments are defined at the project level and selected when creating a test execution.

### 2.7 Test Execution
A batched grouping of test cases to be executed together in a single session. An execution records the conditions under which tests were run (environment, browser, viewport, locale, timezone) and tracks the overall and per-case outcomes. An execution moves through a defined lifecycle from creation to sign-off.

### 2.8 Test Run
One instance of a single test case within an execution. Each run has its own outcome (Pass, Fail, Needs Review, etc.) and may hold multiple attempts, step-by-step results, AI confidence scores, and linked bug reports.

### 2.9 Bug
A defect report tied to a specific observation or failing test. Bugs have a severity, a lifecycle status, optional images, and optional links to the test run and test case that exposed them.

### 2.10 Activity Log
An immutable, chronological audit trail of every significant action taken within a project — who did what, to which entity, and when.

### 2.11 Trash
Deleting a test case, folder, execution, bug, or project does not remove it immediately. Deleted items move to a trash, where they can be restored for 30 days; after that they are permanently removed. While an item is in the trash it is hidden from all lists, dashboards, and reports.

How deletion affects related content:
- **Test case deleted:** a test case cannot be deleted while it is part of an execution that is Ready, In Progress, or Paused (a Draft execution does not block deletion; see ADR 0012); the Admin must first remove it from those executions. Once deleted, its past runs remain inside their executions, keeping the test case name and Gherkin script as they were when the execution started.
- **Execution deleted:** its runs are removed from all metrics, dashboards, and reports.
- **Folder deleted:** the folder is deleted together with all of its subfolders and test cases. A confirmation dialog shows how many items will be affected. A folder cannot be deleted while any test case inside it is part of a Ready, In Progress, or Paused (a Draft execution does not block deletion; see ADR 0012) execution.
- **Bug links to deleted items:** a bug that points to a deleted test case, run, or execution shows that link as "deleted" instead of a navigable link.
- **Project deleted:** the whole project, with everything in it, moves to the trash and can be restored by a Workspace Owner (Section 6.9).
- **Activity Log:** never deleted. Entries keep the name of the item as it was, even after the item is permanently removed.

---

## 3. User Roles & Permissions

Permissions operate at two levels: workspace and project. A user's workspace role is a ceiling that applies across all projects; their project role governs day-to-day access within a specific project.

### 3.1 Workspace Roles

| Role | Description |
|---|---|
| **Owner** | Full, unrestricted control over the workspace. Can create and delete projects, manage all members, rename the workspace, and transfer ownership. Automatically holds the Project Admin role on every project. |
| **Collaborator** | Can view the workspace and participate in projects to which they are explicitly invited. Cannot access workspace settings or create projects. May leave the workspace at any time. |

### 3.2 Project Roles

| Role | Capabilities |
|---|---|
| **Project Admin** | All Contributor capabilities plus: delete folders, delete test cases, delete bugs, delete executions, sign off completed executions, manage project settings (environments, project name, defaults), and restore deleted items from the Trash. |
| **Contributor** | Create and edit test cases, create and edit executions, start, pause, and resume executions, update run outcomes during active executions, file and update bugs, create tags, create and rename folders, and reveal environment credentials. Cannot delete. |
| **Viewer** | Read-only access to all project content, except that stored passwords stay masked. Cannot create, edit, or delete anything. |

**Key access rules:**
- Anyone can be invited to a project by email address, whether or not they already have an account (Section 3.3).
- Accepting a project invitation also adds the person to the workspace as a Collaborator, if they are not already a member.
- A Workspace Owner cannot leave the workspace until ownership has been transferred (Section 6.9).
- Destructive actions (delete) throughout the application are exclusively available to Project Admins and Workspace Owners.

### 3.3 Invitations

- A Project Admin or Workspace Owner invites someone by entering an email address and choosing a project role.
- **Existing users** receive an email and also see the invitation under Pending Invitations in the workspace switcher (Section 5).
- **New users** receive an email with a link. They sign up through it (no workspace name is requested and no workspace is created for them) and then see the invitation.
- Nobody is added automatically. A person joins only by explicitly accepting; they may also decline. Until accepted, an invitation grants no access.
- Accepting adds the person to the project with the invited role, and to the workspace as a Collaborator.
- Invitations expire after 7 days. Project Admins can revoke or resend pending invitations from Project Members (Section 6.8).
- Invitations can only be seen and accepted by an account whose email address is verified (Section 4.6). An invitation sent to an unverified account stays pending until the address is verified or the invitation expires. Signing up through the invitation link counts as verifying the invited address.
- Removing someone from a workspace removes them from all of its projects. Content they created remains, shown as created by "Former member" in the interface; the activity log keeps their name.

---

## 4. Authentication & Onboarding

### 4.1 Sign In
Users access the platform via an email and password form. On success, they are taken to the Test Cases screen for their last active project. On failure, an inline error message is shown. A link to the Sign Up screen is provided for new users, and a "Forgot password" link starts the password reset flow (Section 4.5).

### 4.2 Sign Up
New users register by providing: full name, work email, password (minimum 8 characters), and a workspace name. Submitting this form creates both the user account and their first workspace simultaneously. The new user is automatically signed in and redirected to the Onboarding screen, and a banner asks them to verify their email address (Section 4.6). Users who sign up through an invitation link (Section 3.3) are not asked for a workspace name and no workspace is created; they are taken to the pending invitation instead.

### 4.3 Onboarding Welcome Screen
Shown only on the first entry of a user who created a workspace at sign-up. Displays the newly created workspace name with a confirmation badge and presents three guided steps:
1. Create your first test case
2. Set up an environment
3. Run your first execution

Each step is a clickable card that navigates to the relevant section of the application. A "Go to the app" button allows the user to skip the guide and proceed directly to the main interface.

### 4.4 Sign Out
Available from the user menu in the sidebar. Signs the user out and redirects to the Sign In screen.

### 4.5 Password Reset
From the Sign In screen, the user enters their email address and receives an email with a reset link. The link opens a form for a new password (minimum 8 characters). The confirmation message is identical whether or not the email address belongs to an account, so the screen never reveals who is registered. After resetting, the user signs in with the new password.

### 4.6 Email Verification
After sign-up, a banner asks the user to verify their email address using a link sent by email; the user can keep using the application in the meantime. Until the address is verified, the account cannot see or accept invitations (Section 3.3). A "Resend verification email" option is available in the banner and on the User Profile. Because a user's email address cannot be changed, verification happens only once.

---

## 5. Navigation & Layout

The main application uses a persistent sidebar that contains:
- A **workspace switcher** at the very top. Its menu lists the user's workspaces (with a "Leave workspace" action for Collaborators), a **Pending Invitations** section where invitations can be accepted or declined, and a link to Workspace Settings (Owners only). The active workspace determines which projects appear in the project switcher. After signing in, the user lands on the last active project of the last active workspace.
- A **project switcher** just below it — a dropdown listing all projects the user can access in the active workspace. Selecting a project changes the active context for the entire application.
- Navigation links to all primary screens (Overview, Test Cases, Test Executions, Bugs, Test Automations, Activity, Project Settings, Project Members, and Trash for Project Admins and Workspace Owners).
- A user menu at the bottom linking to the User Profile and Sign Out.

---

## 6. Screens & Feature Specifications

---

### 6.1 Overview Dashboard

**Purpose:** A real-time health command centre for the active project, giving stakeholders an at-a-glance view of quality status and trends.

**Content:**

**KPI Tiles (7 total):**
1. **Health Score** — A composite score with a status label: Healthy, At Risk, or Critical (see the definition below).
2. **Total Test Cases** — Count of all test cases, with the percentage that are in "Ready" status shown as a sub-label.
3. **Coverage** — The percentage of test cases that have been run at least once.
4. **Pass Rate** — The pass rate over the last 30 days.
5. **Active Runs** — The number of executions currently in progress.
6. **Open Bugs** — Count of bugs in open states.
7. **Critical Bugs** — Count of bugs with Critical severity.

**Health Score definition:**
The Health Score is a number from 0 to 100 that combines four components:

| Component | Weight | How it is measured |
|---|---|---|
| Pass rate | 40% | Pass rate over the last 30 days |
| Coverage | 20% | Percentage of test cases that have been run at least once |
| Bug pressure | 25% | 100 minus a penalty for each open bug (25 points per Critical, 10 per High, 3 per Medium; Low bugs carry no penalty), never below 0 |
| Freshness | 15% | Percentage of Ready test cases that have been run in the last 14 days |

Status labels: **Healthy** 80–100, **At Risk** 60–79, **Critical** below 60. A project with no runs yet shows "No data" instead of a score. The Health Score trend chart shows the score as it stood on each day of the selected period.

**Charts (all selectable time ranges: 7, 15, 30, or 90 days):**
- **Health Score trend** — Line chart of health score over the selected period.
- **Pass Rate trend** — Line chart of pass rate over the selected period.
- **Bug Velocity** — Line chart comparing bugs reported versus bugs resolved over time.
- **Run Outcomes donut** — Split of Pass, Fail, and Needs Review for the last 30 days.

**Panels:**
- **Top Failing Tests** — A ranked list of the test cases with the highest failure rate, each clickable to navigate to that test case.
- **Urgent Bugs** — A list of open Critical and High severity bugs, each clickable to navigate to that bug.
- **Recent History** — A feed of the last ~10 activity events showing user avatar initials, action description, and relative timestamp. A "Full History" link opens a paginated modal with infinite scroll.

**User Actions:**
- Adjust the time range for any chart independently.
- Click items in the Top Failing Tests or Urgent Bugs panels to navigate.
- Open the full activity history modal.
- Download the dashboard as a PDF report.

---

### 6.2 Test Cases

**Purpose:** The authoring and management hub for all test cases, organised into a browsable folder hierarchy.

#### 6.2.1 Layout
The screen is split into two panels:
- **Left panel:** A folder tree showing all folders and their contained test cases.
- **Right panel:** Either a folder summary or a test case detail view, depending on what is selected.

#### 6.2.2 Folder Tree
- Folders are expandable and collapsible by clicking.
- Each test case in the tree shows a small coloured dot indicating its last run outcome (or no dot if it has never been run).
- A filter panel is available to narrow the tree by name, status, or tags.
- A Dashboard view toggle switches the right panel to an aggregate statistics view across all test cases.

#### 6.2.3 Test Case Detail View
When a test case is selected, the right panel shows:
- **Breadcrumb path** through the folder hierarchy.
- **Name** (editable inline by Contributors).
- **Status badge** (Draft, Ready, or Deprecated).
- **Source type badge** (Gherkin or Manual).
- **Tags** (editable inline by Contributors).
- **Health banners** — contextual alerts surfaced automatically:
  - *Orphan:* This test case has never been added to any execution.
  - *Never Run:* It has been added to an execution but never actually executed.
  - *Dormant:* Its last run was more than 14 days ago.
  - *Degrading:* Its pass rate over its last 5 runs is at least 20 percentage points lower than over the 5 runs before them (requires at least 10 runs).
  - *Improving:* The same comparison, at least 20 percentage points higher.
  - *Trend Reset:* The Gherkin script was edited recently; runs before the edit are excluded from the Degrading/Improving comparison until enough new runs accumulate.
- **Gherkin script editor** — A plain text area for the scenario script; saves automatically when the user clicks away.
- **Run history table** — The last 10 runs showing execution name, outcome, AI confidence %, duration, and date. A link to the full history is available.
- **Run button** with a dropdown offering two options: (a) create a brand-new execution containing this test case, or (b) add it to an existing execution.

#### 6.2.4 Test Cases Dashboard View
An aggregate statistics view showing:
- Status breakdown (pie/donut chart of Draft, Ready, Deprecated counts).
- Coverage gauge.
- Outcome distribution chart.
- Per-case health rows.
- A download button for the dashboard as a PDF report.

#### 6.2.5 User Actions

**Folder actions:**
- Create a new folder (via toolbar button or right-click context menu on an existing folder).
- Rename a folder (Contributors and above; inline editing).
- Delete a folder together with all its subfolders and test cases (Admins only; a confirmation shows how many items are affected, and deleted items go to the Trash, Section 2.11). Refused, with the executions listed, if any test case inside is part of a Ready, In Progress, or Paused (a Draft execution does not block deletion; see ADR 0012) execution.
- Drag folders to reorder them or move them within the hierarchy.

**Test case actions:**
- Create a new test case (via toolbar "+" button or right-click context menu on a folder).
- Select a test case to view its detail.
- Edit a test case's name inline.
- Edit the Gherkin script (auto-saves on blur).
- Run a test case (create a new execution or add to an existing one).
- Delete a test case (Admins only, via right-click menu; it goes to the Trash). Refused, with the executions listed, if the test case is part of a Ready, In Progress, or Paused (a Draft execution does not block deletion; see ADR 0012) execution.
- Drag test cases to reorder them or move them to a different folder.
- Filter the tree by name, status, or tags.
- Switch between tree view and dashboard view.

---

### 6.3 Test Executions

**Purpose:** The control centre for planning, running, and reviewing batches of test cases.

#### 6.3.1 Layout
Split into two panels:
- **Left panel:** A scrollable list of all executions.
- **Right panel:** The detail view for the selected execution.

A Dashboard view toggle switches to aggregate statistics across all executions.

#### 6.3.2 Execution List
Each entry in the list shows:
- Execution name.
- Status badge.
- Done/total run counts.
- Pass, Fail, and Needs Review counts.
- Last updated date.

Sorting options: last updated, creation date, status (ascending or descending).  
Filtering options: by name, status, environment, browser, and tags (an execution matches when it contains at least one test case carrying any of the selected tags).

#### 6.3.3 Execution Detail View
When an execution is selected, the right panel shows:

**Header area:**
- Execution name and description.
- Status badge with a live elapsed timer (it counts only while the execution is In Progress; time spent Paused is not counted).
- Metadata: app version, environment, browser, viewport size, locale, timezone. The environment entry opens a panel listing its credential aliases and emails; Contributors and Admins can reveal passwords there (Section 6.7).

**Stats bar (5 cells, each clickable to filter the runs table below):**
Total | Pass | Needs Review | Fail | Pending

**Progress bar:** colour-coded by outcome proportion.

**Test runs table:**
- Columns: position number, test case name, status, AI confidence %, duration.
- During an active automated run, the test case name cell shows a live, step-by-step progress display.
- Rows are draggable to reorder (Draft status only).
- Hovering a row reveals a link to open the test case in a new tab and (for Admins) a remove button.

**Run detail side panel:**
Slides in when a run row is clicked. Contains:
- Step-by-step results (step text, outcome, duration, error message).
- Attempt history (list of all re-runs of this run).
- Bug links (linked bugs with navigation).
- Controls: manually update the run's status, file a new bug (pre-filled from this run), link an existing bug.

**Console drawer:** A collapsible panel at the bottom showing live log output during automated runs.

**Activity history panel:** A list of changes made to this specific execution over its lifetime.

**Traceability button:** Opens a visual graph (see Section 6.3.5).

**Download buttons:** Export as HTML report or PDF report.

#### 6.3.4 Execution Lifecycle & Actions

The execution moves through the following states, with available actions at each:

| Status | Available Actions |
|---|---|
| **Draft** | Edit (opens the creation modal pre-filled), Mark as Ready, Delete (Admins only), reorder runs, remove individual runs |
| **Ready** | Back to Draft, Run All |
| **In Progress** | Pause, Cancel |
| **Paused** | Resume, Cancel |
| **Completed** | Sign Off (Admins), Try Again |
| **Done / Canceled** | Try Again |

**Run All** opens a confirmation dialog asking the user to choose execution mode:
- *Manual:* The user marks each test case outcome themselves via the side panel.
- *Automated:* An automated engine runs the test cases. Note: this mode is currently under reconstruction and is temporarily unavailable.

Run All, Pause, and Resume are available to Contributors and Project Admins; Viewers do not see them. Run All cannot start an execution that contains no test runs: the user is asked to add at least one test case first. When an execution starts, each run records the name and Gherkin script of its test case as they are at that moment.

**Try Again** (from Done or Canceled) offers:
- Duplicate the execution with a custom subset of test cases (a new execution is created).
- Restart the current execution (all results are reset and the execution is re-run from scratch).

#### 6.3.5 Traceability Graph
Accessible from any execution detail view. Opens a full-screen visual graph with four columns:
- Test Cases → Executions → Test Runs → Bugs

Directed edges connect related entities. Hovering a node highlights its entire lineage (all ancestors and descendants). Clicking a node navigates to that entity's detail view.

#### 6.3.6 Executions Dashboard View
An aggregate view showing outcome trends, execution volume, and other cross-execution statistics. Includes a download button for the dashboard as a PDF report.

---

### 6.4 Bugs

**Purpose:** Defect tracking tightly integrated with the test execution workflow.

#### 6.4.1 Layout
Split into two panels:
- **Left panel:** A scrollable list of all bugs.
- **Right panel:** The detail view for the selected bug.

A Dashboard view toggle switches to aggregate statistics.

#### 6.4.2 Bug List
Each entry shows:
- Title.
- Severity indicator (colour-coded dot).
- Status badge.
- Tags.

Sorting options: last updated, creation date, status, severity.  
Filtering options: by name, status, severity.

#### 6.4.3 Bug Detail View
- **Title** (editable inline by Contributors).
- **Status** (changeable inline: Open → In Progress → Resolved → Closed / Won't Fix).
- **Severity** (changeable inline: Critical, High, Medium, Low).
- **Reporter name.**
- **Tags** (editable inline via a tag picker).
- **Linked test run** section: shows the run's status, date, duration, failed step, and a link to navigate to the execution.
- **Linked test case** section: shows the test case name with a link.
- **Gherkin script snapshot:** the script that was captured at the moment the bug was created, with the failed step highlighted in red.
- **Description** (free text).
- **Steps to reproduce** (free text).
- **Image attachment gallery:** up to 5 thumbnails. Clicking a thumbnail opens a full-screen lightbox viewer. Images can be removed.
- **Activity history panel:** a log of all changes to this bug.
- **Delete button** (Admins only).

#### 6.4.4 Bugs Dashboard View
Aggregate charts covering bug status distribution, severity distribution, and trends over time. Includes a download button for the dashboard as a PDF report.

---

### 6.5 Test Automations

**Purpose:** A view of test cases that have been successfully run by the automated engine, intended as a source for generating automation artefacts.

**Content:**
- A table listing all test cases whose last automated run resulted in a Pass.
- Columns: test case name, folder, AI confidence score, last run date.
- Row-level and bulk checkboxes for selection.
- A "Generate Code" button appears when one or more items are selected.

> **Note:** The code generation feature is currently under reconstruction. Clicking the button displays a "being rebuilt" notice rather than generating output. Once rebuilt, this feature will produce downloadable automation script files that can be previewed in a file-tab panel on the right side of the screen.

---

### 6.6 Activity

**Purpose:** A full, filterable, paginated audit trail for the active project.

**Content:**
- A chronological feed of all activity events, grouped by day (Today, Yesterday, named weekdays for the current week, then by date).
- Each event shows: user avatar (initials), who did the action, the action description (colour-coded by action type), entity type icon, and relative timestamp.

**Filter pills (row at the top):**
All | Test Cases | Executions | Runs | Bugs | Folders | Environments | Projects | Tags

Event categories: invitations (sent, accepted, declined, revoked) and membership or role changes appear under Projects; revealing environment credentials appears under Environments; deleting or restoring an item appears under that item's own type.

**User Actions:**
- Click a filter pill to narrow the feed to a specific entity type.
- Click "Load more" at the bottom to fetch older entries (paginated).

---

### 6.7 Project Settings

**Purpose:** Configuration for the active project. Accessible to Project Admins and Workspace Owners only.

**Sections:**

**General**
- Edit the project name (saved immediately).
- View the project slug (read-only; set once at creation and never changed).

**Environments**
- View the list of environments attached to the project with their name and base URL.
- Edit an environment (opens the environment editor modal): name, base URL, default browser, and credentials (each with alias, email, password).
- Delete an environment.
- Add a new environment (same modal).

**Execution Defaults**
- Toggle headless mode default (saved). Determines whether executions default to running the browser invisibly.
- Set execution timeout in milliseconds (not yet persisted).
- Set screenshot policy (On Failure / All Steps / Never; not yet persisted).

**Integrations** *(placeholder, not yet functional)*
- Fields for an Atlassian/Jira workspace URL and API token.
- Fields for a GitHub/GitLab repository URL and token.

**AI / LLM Configuration** *(placeholder, not yet functional)*
- AI provider selector (multiple providers available).
- Model selector (changes based on provider).
- API key input.

**Project Context** *(placeholder, not yet functional)*
- A free-text description of the project, intended to provide context to AI-assisted features.

**Handling of stored secrets**
- *Environment credentials:* passwords are always masked. Contributors and Admins can reveal a password on demand (Admins in the environment editor; Contributors and Admins in the environment panel of an execution). Every reveal is recorded in the Activity log. Viewers see only the alias and email.
- *Integration tokens and AI/LLM API keys:* write-only. After saving, the field shows only that a value is set; Project Admins can replace it, but it can never be viewed again.
- Stored secrets never appear in reports or exports (Section 8).

---

### 6.8 Project Members

**Purpose:** Manage who has access to the active project and at what role level. Accessible to Project Admins and Workspace Owners.

**Content:**
- A table of all project members showing: display name, email, project role.
- For Admins: each row has a role picker (to promote or demote the member) and a remove button.
- An invite form at the top of the page with an email field and a role selector. Submitting this sends an invitation (Section 3.3); the person joins only after accepting.
- A list of pending invitations (email, role, date sent, expiry date), with Resend and Revoke actions for Admins.

---

### 6.9 Workspace Settings

**Purpose:** Workspace-wide administration. Accessible to Workspace Owners only.

**Sections:**

**Workspace Name**
- Displayed at the top; editable inline by Owners only.

**Projects**
- A list of all projects in the workspace, each showing: project name, test case count, execution count.
- Each project has links to manage its members and edit its settings.
- Workspace Owners see a "New Project" button that opens the project creation flow.
- Owners can delete a project. It moves to the Trash for 30 days (Section 2.11).
- A "Recently deleted" list shows deleted projects with a Restore action until they are permanently removed.

**Members** *(Owners only)*
- A list of the workspace's members with their name, email, and the projects they belong to.
- Owners can remove a Collaborator from the workspace, which removes them from all of its projects (Section 3.3).
- The Owner cannot leave the workspace until ownership has been transferred.

**Transfer Ownership** *(Owners only)*
- Enter the email of an existing workspace member (a Collaborator), confirm the action with a checkbox, and submit. An email that does not belong to a current member is rejected, so a transfer never adds anyone to the workspace. This permanently transfers workspace ownership to the specified member.
- After the transfer, the previous Owner becomes a Collaborator and keeps the Project Admin role on every project that exists at the time of transfer, so they are not locked out of ongoing work. These become ordinary project memberships that Project Admins can change or remove. They do not receive access to projects created later.

---

### 6.10 User Profile

**Purpose:** Personal account settings for the signed-in user.

**Content & Actions:**
- **Display name:** Editable inline.
- **Email address:** Shown as read-only (cannot be changed). Shows whether the address has been verified, with a "Resend verification email" option if not.
- **Appearance toggle:** Switch between dark and light mode.
- **Change password form:** Requires the current password, a new password, and a confirmation field. Errors surface inline.

### 6.11 Trash

**Purpose:** Recover deleted items. Accessible to Project Admins and Workspace Owners.

**Content:**
- A list of the project's deleted test cases, folders, executions, and bugs, showing item type, name, who deleted it, when, and how many days remain before permanent removal.
- A filter by item type.

**User Actions:**
- Restore an item to where it was. Restoring an item whose containing folder is also in the trash restores that folder as well.
- Items are removed permanently and automatically after 30 days.
- Deleted projects are restored from Workspace Settings (Section 6.9), not from this screen.

---

## 7. Creation Flows

### 7.1 New Test Case Flow

1. Click the "+" button in the Test Cases toolbar, or use the right-click context menu on a folder.
2. The **New Test Case** modal opens.
3. The user selects a destination folder from a tree picker.
4. The user enters a name for the test case.
5. The user may optionally write a Gherkin script directly in the modal.
6. Clicking Save creates the test case and opens it in the detail view.

> A "Generate from Sources" mode is scaffolded in the UI where the user would provide URLs or upload files and select an exhaustiveness level for AI-generated test scenarios. This mode is currently disabled.

---

### 7.2 New Execution Flow

1. Click the "+" button in the Test Executions toolbar, or use the Run button on a test case.
2. The **New Execution** modal opens.
3. The user configures:
   - **Name** (required)
   - **Description** (optional)
   - **Test case selection** using the folder tree picker (one or more test cases)
   - **Environment** (select from the project's environments, or leave unset)
   - **Browser** (Chromium, Firefox, or WebKit)
   - **Auto-create bug on failure** toggle
   - **Viewport preset** (common screen sizes, or custom width × height)
   - **Locale** (e.g. English US, Japanese, Portuguese Brazil)
   - **Timezone** (e.g. America/New_York, Europe/Paris, Asia/Tokyo)
4. Clicking Save creates the execution in **Draft** status.
5. The user reviews and optionally reorders the runs list.
6. The user clicks **Mark as Ready**, then **Run All** to start execution.
7. A mode confirmation dialog is presented (Manual or Automated — see Section 6.3.4).

---

### 7.3 New Bug Flow (Manual)

1. Click the "+" button in the Bugs toolbar, or click "File Bug" in a run detail side panel.
2. The **New Bug** modal opens.
3. The user fills in:
   - **Title** (required)
   - **Description** (optional)
   - **Steps to reproduce** (optional)
   - **Severity** (Critical, High, Medium, Low)
   - **Tags** (optional)
   - **Image attachments** (up to 5 files, JPEG/PNG/WebP/GIF, up to 5 MB each)
4. If opened from a run detail panel, the title and Gherkin snapshot are pre-filled.
5. Clicking Save creates the bug and adds it to the bug list.

---

### 7.4 Automatic Bug Creation

When an execution has **Auto-create bug on failure** enabled, the system automatically creates a bug report for each failing run. The bug is pre-populated with:
- The test case name as the title.
- The Gherkin script snapshot.
- The specific failed step highlighted.

---

### 7.5 New Project Flow (Workspace Owners only)

1. Click "New Project" on the Workspace Settings screen.
2. A multi-section form is presented (identical to the Edit Project page).
3. At minimum, the user provides a project name.
4. Environments can be added during creation or later via Project Settings.
5. Saving creates the project and adds the Owner as a Project Admin automatically.

---

## 8. Reporting & Exports

The platform provides downloadable reports at multiple levels:

| Report | Source | Format | Contents |
|---|---|---|---|
| **Execution HTML Report** | Execution detail view | Standalone HTML file | Execution metadata, all test runs with step-by-step results, Gherkin scripts, linked bugs, and image attachments embedded in the file (no internet connection required to view) |
| **Execution PDF Report** | Execution detail view | PDF | Same data as the HTML report, in a print-ready format |
| **Overview Dashboard PDF** | Overview screen | PDF | Project health KPIs and trend charts for the selected time range |
| **Test Cases Dashboard PDF** | Test Cases dashboard view | PDF | Test case status breakdown, coverage, and outcome distribution |
| **Executions Dashboard PDF** | Executions dashboard view | PDF | Execution outcome trends and aggregate statistics |
| **Bugs Dashboard PDF** | Bugs dashboard view | PDF | Bug status distribution, severity breakdown, and trend charts |

Reports are generated in the background: the user sees a "generating" state and is notified, with a download link, when the file is ready.

No report or export ever contains stored credentials, tokens, or API keys.

---

## 9. In-Progress / Roadmap Features

The following features are partially scaffolded in the UI but are not yet fully functional. They represent committed product direction for near-future releases.

| Feature | Current State | Description |
|---|---|---|
| **Automated execution engine** | Disabled (rebuilt from scratch) | Runs Gherkin test cases automatically using a Playwright-backed engine with AI-assisted step mapping. Users see a "being rebuilt" notice when attempting to use it. Once complete, the "Run All → Automated" path will be restored. |
| **Test case generation from sources** | UI scaffold visible but disabled | Allows users to provide documentation URLs or uploaded files, choose an exhaustiveness level, and have the system generate draft Gherkin test cases automatically. |
| **Playwright code generation** | UI visible but disabled | From the Test Automations screen, generates downloadable Playwright spec files for passing, high-confidence test cases. |
| **Integration with issue trackers** | Placeholder fields in Project Settings | Jira and GitHub/GitLab integration for syncing bugs and test results. |
| **AI/LLM configuration** | Placeholder fields in Project Settings | Per-project configuration of AI provider and model for all AI-assisted features. |
| **Screenshot policy & execution timeout settings** | Fields visible but not yet persisted | Additional execution configuration options. |
| **Project context for AI** | Field visible but not yet persisted | A free-text description of the project fed as context to AI features. |

---

## 10. Key User Journeys

### 10.1 Onboarding a New Team
1. One person signs up, creating the workspace.
2. They are guided through the onboarding steps: create a test case → set up an environment → run an execution.
3. They invite teammates by navigating to Project Members and entering their emails.
4. Teammates receive an invitation by email. Existing users also see it in their workspace switcher; new users sign up through the email link. Each person accepts the invitation to join.

### 10.2 Writing and Organising Test Cases
1. A Contributor creates folders in the folder tree to reflect the feature areas of the application.
2. They create test cases within each folder, writing Gherkin scripts or leaving them as manual descriptions.
3. They apply tags for cross-cutting concerns (e.g. "smoke", "regression").
4. They can drag and drop test cases and folders to reorganise at any time.

### 10.3 Running a Test Suite
1. A Contributor creates a new execution, selects the relevant test cases, chooses the environment and browser, and saves.
2. The execution is reviewed in Draft, then marked as Ready.
3. The team runs manually: each person opens a run, performs the test, and updates the outcome.
4. Failing runs trigger bug reports (manually or automatically).
5. Once all runs have outcomes, a Project Admin signs off the execution.

### 10.4 Investigating a Bug
1. A team member notices a failing run and clicks "File Bug" from the run side panel.
2. The bug is created pre-filled with the Gherkin script and failed step.
3. They add a description and screenshots.
4. A developer takes ownership by changing the status to "In Progress".
5. Once fixed, they mark it "Resolved".
6. A tester re-runs the test and, if it passes, marks the bug "Closed".

### 10.5 Reviewing Project Health
1. A manager opens the Overview Dashboard.
2. They review the Health Score and trend charts.
3. They spot a rise in the bug velocity chart and click into the Urgent Bugs panel.
4. They click a critical bug to open its detail and see which test case surfaced it.
5. They use the traceability graph to follow the chain from bug → run → execution → test case.
6. They download the Overview Dashboard PDF to share with stakeholders.

---

*End of Document*
