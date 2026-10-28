/**
 * The ShopFlow demo dataset (specs/demo-seed, design.md decision 6): plain data with
 * stable keys, no SQL. Times are "days ago" relative to the moment the seed runs;
 * demo-seed.ts turns keys into deterministic ids and offsets into timestamps.
 */

export type Actor = 'owner' | 'contributor';
export type TestCaseStatus = 'Draft' | 'Ready' | 'Deprecated';
export type RunOutcome = 'Pending' | 'Pass' | 'Fail' | 'NeedsReview';
export type ExecutionStatus = 'Draft' | 'Ready' | 'InProgress' | 'Paused' | 'Completed' | 'Done';
export type Browser = 'Chromium' | 'Firefox' | 'WebKit';
export type BugSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type BugStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed' | 'WontFix';

export interface DemoTeammate {
  key: 'contributor' | 'viewer';
  displayName: string;
  email: string;
  projectRole: 'Contributor' | 'Viewer';
}

export interface DemoFolder {
  key: string;
  name: string;
  parentKey: string | null;
  createdDaysAgo: number;
}

export interface DemoTestCase {
  key: string;
  name: string;
  folderKey: string;
  status: TestCaseStatus;
  gherkin: string;
  createdDaysAgo: number;
}

export interface DemoCredential {
  key: string;
  alias: string;
  email: string;
  password: string;
}

export interface DemoEnvironment {
  key: string;
  name: string;
  baseUrl: string;
  defaultBrowser: Browser;
  createdDaysAgo: number;
  credentials: DemoCredential[];
}

export interface DemoRun {
  testCaseKey: string;
  /** Pending (the default) means no outcome recorded yet. */
  outcome?: Exclude<RunOutcome, 'Pending'>;
  /** Who recorded the outcome; defaults to the contributor. */
  by?: Actor;
}

export interface DemoExecution {
  key: string;
  name: string;
  description: string;
  status: ExecutionStatus;
  environmentKey: string | null;
  browser: Browser;
  viewport: [number, number];
  locale: string;
  timezone: string;
  autoCreateBug: boolean;
  createdBy: Actor;
  createdDaysAgo: number;
  readyDaysAgo?: number;
  startedDaysAgo?: number;
  /** Paused: when it was paused. */
  pausedDaysAgo?: number;
  completedDaysAgo?: number;
  /** Done: signed off by the owner. */
  signedOffDaysAgo?: number;
  /** Active time from finished InProgress periods. */
  elapsedMinutes: number;
  /** InProgress: the current period started this many minutes ago. */
  resumedMinutesAgo?: number;
  runs: DemoRun[];
}

export interface DemoBug {
  key: string;
  title: string;
  severity: BugSeverity;
  status: BugStatus;
  description: string | null;
  stepsToReproduce: string | null;
  /** Filed from this run (must be a Fail run of a started execution). */
  run?: { executionKey: string; testCaseKey: string };
  /** A line of the run's script; null for none (always null when auto-created). */
  failedStep: string | null;
  autoCreated: boolean;
  reporter: Actor;
  createdDaysAgo: number;
  /** A later status change, logged as bug.updated. */
  statusChange?: { from: BugStatus; daysAgo: number; by: Actor };
}

export const MARKER_FOLDER_KEY = 'shopflow';

export const TEAMMATES: DemoTeammate[] = [
  { key: 'contributor', displayName: 'Priya Shah', email: 'priya.shah@shopflow.test', projectRole: 'Contributor' },
  { key: 'viewer', displayName: 'Marco Rossi', email: 'marco.rossi@shopflow.test', projectRole: 'Viewer' },
];

export const FOLDERS: DemoFolder[] = [
  { key: MARKER_FOLDER_KEY, name: 'ShopFlow', parentKey: null, createdDaysAgo: 21 },
  { key: 'auth', name: 'Authentication', parentKey: MARKER_FOLDER_KEY, createdDaysAgo: 21 },
  { key: 'catalog', name: 'Catalog & Search', parentKey: MARKER_FOLDER_KEY, createdDaysAgo: 21 },
  { key: 'cart', name: 'Cart', parentKey: MARKER_FOLDER_KEY, createdDaysAgo: 21 },
  { key: 'checkout', name: 'Checkout', parentKey: MARKER_FOLDER_KEY, createdDaysAgo: 21 },
  { key: 'payments', name: 'Payments', parentKey: 'checkout', createdDaysAgo: 20 },
  { key: 'cards', name: 'Cards', parentKey: 'payments', createdDaysAgo: 20 },
  { key: 'wallets', name: 'Wallets', parentKey: 'payments', createdDaysAgo: 20 },
  { key: 'account', name: 'Account', parentKey: MARKER_FOLDER_KEY, createdDaysAgo: 20 },
  { key: 'profile', name: 'Profile', parentKey: 'account', createdDaysAgo: 20 },
];

/** Builds a Gherkin script: one feature, one scenario, steps as given. */
function gherkin(feature: string, scenario: string, steps: string[]): string {
  return [`Feature: ${feature}`, '', `  Scenario: ${scenario}`, ...steps.map((step) => `    ${step}`)].join('\n');
}

const tc = (
  key: string,
  name: string,
  folderKey: string,
  status: TestCaseStatus,
  feature: string,
  steps: string[],
  createdDaysAgo = 20,
): DemoTestCase => ({ key, name, folderKey, status, gherkin: gherkin(feature, name, steps), createdDaysAgo });

export const TEST_CASES: DemoTestCase[] = [
  tc('smoke-home', 'Home page loads with featured products', MARKER_FOLDER_KEY, 'Ready', 'Storefront', [
    'Given I am a visitor',
    'When I open the home page',
    'Then I see at least 8 featured products',
    'And each product shows its price',
  ]),
  tc('page-404', 'Unknown page shows a friendly 404', MARKER_FOLDER_KEY, 'Ready', 'Storefront', [
    'Given I am a visitor',
    'When I open "/this-page-does-not-exist"',
    'Then I see the "Page not found" message',
    'And I see a link back to the home page',
  ]),
  tc('login-valid', 'Sign in with valid credentials', 'auth', 'Ready', 'Sign in', [
    'Given I am on the sign-in page',
    'When I sign in as "shopper"',
    'Then I land on my account dashboard',
    'And the header shows my first name',
  ]),
  tc('login-invalid', 'Sign in rejects a wrong password', 'auth', 'Ready', 'Sign in', [
    'Given I am on the sign-in page',
    'When I sign in as "shopper" with password "wrong-password"',
    'Then I see "Email or password is incorrect"',
    'And I am still on the sign-in page',
  ]),
  tc('lockout', 'Account locks after five failed sign-ins', 'auth', 'Ready', 'Sign in', [
    'Given I am on the sign-in page',
    'When I sign in as "shopper" with a wrong password 5 times',
    'Then the account is locked for 15 minutes',
    'And I receive an "Account locked" email',
  ]),
  tc('reset-password', 'Reset password by email link', 'auth', 'Ready', 'Password reset', [
    'Given I requested a password reset for "shopper"',
    'When I open the reset link from the email',
    'And I set the new password "N3w-Passw0rd!"',
    'Then I can sign in with the new password',
  ]),
  tc('signup', 'Sign up with a new email', 'auth', 'Ready', 'Sign up', [
    'Given I am on the sign-up page',
    'When I register with a new email address',
    'And I confirm the email',
    'Then my account is active',
  ]),
  tc('sso-google', 'Sign in with Google', 'auth', 'Draft', 'Single sign-on', [
    'Given I am on the sign-in page',
    'When I choose "Continue with Google"',
    'Then I am signed in with my Google account',
  ], 6),
  tc('remember-me', 'Remember me keeps the session for 30 days', 'auth', 'Deprecated', 'Sign in', [
    'Given I signed in with "Remember me" checked',
    'When I come back after 29 days',
    'Then I am still signed in',
  ], 21),
  tc('search-keyword', 'Search by keyword', 'catalog', 'Ready', 'Search', [
    'Given I am on the home page',
    'When I search for "running shoes"',
    'Then every result mentions "running" or "shoe"',
    'And the results count is shown',
  ]),
  tc('search-empty', 'Search with no results suggests alternatives', 'catalog', 'Ready', 'Search', [
    'Given I am on the home page',
    'When I search for "xyzzy-no-such-product"',
    'Then I see "No products found"',
    'And I see at least 3 suggested categories',
  ]),
  tc('filter-price', 'Filter products by price range', 'catalog', 'Ready', 'Catalog filters', [
    'Given I am browsing "Shoes"',
    'When I set the price range from $50 to $100',
    'Then every product costs between $50 and $100',
  ]),
  tc('sort-price', 'Sort results by price', 'catalog', 'Ready', 'Catalog sorting', [
    'Given I am browsing "Shoes"',
    'When I sort by "Price: low to high"',
    'Then the products are in ascending price order',
  ]),
  tc('product-detail', 'Product page shows price, stock and images', 'catalog', 'Ready', 'Product page', [
    'Given a product "Trail Runner 2" is in stock',
    'When I open its product page',
    'Then I see its price and "In stock"',
    'And the image gallery has at least 3 images',
  ]),
  tc('search-typo', 'Search tolerates a one-letter typo', 'catalog', 'Draft', 'Search', [
    'Given I am on the home page',
    'When I search for "runing shoes"',
    'Then I see results for "running shoes"',
  ], 4),
  tc('cart-add', 'Add a product to the cart', 'cart', 'Ready', 'Cart', [
    'Given I am on the product page of "Trail Runner 2"',
    'When I add it to the cart',
    'Then the cart badge shows 1',
    'And the cart total equals the product price',
  ]),
  tc('cart-quantity', 'Change quantity in the cart', 'cart', 'Ready', 'Cart', [
    'Given my cart has 1 "Trail Runner 2"',
    'When I change the quantity to 3',
    'Then the line total is 3 times the price',
  ]),
  tc('cart-remove', 'Remove a product from the cart', 'cart', 'Ready', 'Cart', [
    'Given my cart has 2 different products',
    'When I remove "Trail Runner 2"',
    'Then the cart has 1 product',
  ]),
  tc('cart-persist', 'Cart persists after signing in', 'cart', 'Ready', 'Cart', [
    'Given I added a product to the cart as a visitor',
    'When I sign in as "shopper"',
    'Then the product is still in my cart',
  ]),
  tc('legacy-coupon', 'Apply a legacy coupon code', 'cart', 'Deprecated', 'Coupons', [
    'Given my cart has a product',
    'When I apply the coupon "SUMMER19"',
    'Then a 10% discount is applied',
  ], 21),
  tc('guest-checkout', 'Guest checkout with shipping address', 'checkout', 'Ready', 'Checkout', [
    'Given my cart has a product and I am not signed in',
    'When I check out as a guest',
    'And I enter a shipping address',
    'And I go back to the cart and return to checkout',
    'Then the shipping address is still filled in',
  ]),
  tc('shipping-cost', 'Shipping cost updates with the address', 'checkout', 'Ready', 'Checkout', [
    'Given I am at the shipping step',
    'When I change the country from "United States" to "Canada"',
    'Then the shipping cost is recalculated',
  ]),
  tc('tax-region', 'Tax is calculated for the shipping region', 'checkout', 'Draft', 'Checkout', [
    'Given I am at the review step',
    'When the shipping address is in Ontario',
    'Then 13% HST is added',
  ], 3),
  tc('payment-declined', 'Declined payment shows a clear error', 'payments', 'Ready', 'Payments', [
    'Given I am at the payment step',
    'When I pay with the test card "4000 0000 0000 0002"',
    'Then I see "Your card was declined"',
    'And my order is not placed',
  ]),
  tc('card-visa', 'Pay with a Visa card', 'cards', 'Ready', 'Card payments', [
    'Given I am at the payment step',
    'When I pay with the test card "4242 4242 4242 4242"',
    'Then my order is confirmed',
    'And I receive an order confirmation email',
  ]),
  tc('card-3ds', 'Pay with a card requiring 3-D Secure', 'cards', 'Ready', 'Card payments', [
    'Given I am at the payment step',
    'When I pay with the test card "4000 0027 6000 3184"',
    'And I approve the 3-D Secure challenge',
    'Then my order is confirmed',
  ]),
  tc('card-saved', 'Pay with a saved card', 'cards', 'Draft', 'Card payments', [
    'Given I have a saved Visa card',
    'When I pay with the saved card',
    'Then my order is confirmed without re-entering the card',
  ], 5),
  tc('wallet-paypal', 'Pay with PayPal', 'wallets', 'Ready', 'Wallet payments', [
    'Given I am at the payment step',
    'When I choose PayPal and approve the payment',
    'Then I return to ShopFlow',
    'And my order is confirmed',
  ]),
  tc('wallet-apple', 'Pay with Apple Pay', 'wallets', 'Draft', 'Wallet payments', [
    'Given I use Safari on a device with Apple Pay',
    'When I choose Apple Pay',
    'Then my order is confirmed',
  ], 2),
  tc('order-history', 'Order history lists past orders', 'account', 'Ready', 'Account', [
    'Given I am signed in as "shopper" with 3 past orders',
    'When I open "My orders"',
    'Then I see 3 orders, newest first',
  ]),
  tc('delete-account', 'Delete account', 'account', 'Deprecated', 'Account', [
    'Given I am signed in',
    'When I delete my account',
    'Then I am signed out and cannot sign in again',
  ], 21),
  tc('profile-edit', 'Edit name and phone number', 'profile', 'Ready', 'Profile', [
    'Given I am signed in as "shopper"',
    'When I change my phone number to "+1 555 0100"',
    'Then my profile shows "+1 555 0100"',
  ]),
  tc('profile-email', 'Change email requires re-verification', 'profile', 'Ready', 'Profile', [
    'Given I am signed in as "shopper"',
    'When I change my email address',
    'Then I must confirm the new address before it is used',
  ]),
];

export const ENVIRONMENTS: DemoEnvironment[] = [
  {
    key: 'staging',
    name: 'Staging',
    baseUrl: 'https://staging.shopflow.test',
    defaultBrowser: 'Chromium',
    createdDaysAgo: 21,
    credentials: [
      { key: 'staging-admin', alias: 'admin', email: 'admin@shopflow.test', password: 'Demo-Staging-Admin-1!' },
      { key: 'staging-shopper', alias: 'shopper', email: 'shopper@shopflow.test', password: 'Demo-Staging-1!' },
    ],
  },
  {
    key: 'qa',
    name: 'QA',
    baseUrl: 'https://qa.shopflow.test',
    defaultBrowser: 'Firefox',
    createdDaysAgo: 14,
    credentials: [{ key: 'qa-shopper', alias: 'shopper', email: 'shopper@shopflow.test', password: 'Demo-QA-1!' }],
  },
];

export const EXECUTIONS: DemoExecution[] = [
  {
    key: 'release-2-3',
    name: 'Release 2.3 regression',
    description: 'Full regression before the 2.3 release.',
    status: 'Done',
    environmentKey: 'staging',
    browser: 'Chromium',
    viewport: [1366, 768],
    locale: 'en-US',
    timezone: 'America/New_York',
    autoCreateBug: false,
    createdBy: 'owner',
    createdDaysAgo: 19,
    readyDaysAgo: 18.6,
    startedDaysAgo: 18,
    completedDaysAgo: 16,
    signedOffDaysAgo: 15.5,
    elapsedMinutes: 340,
    runs: [
      { testCaseKey: 'login-valid', outcome: 'Pass' },
      { testCaseKey: 'login-invalid', outcome: 'Pass' },
      { testCaseKey: 'lockout', outcome: 'Fail' },
      { testCaseKey: 'reset-password', outcome: 'Pass' },
      { testCaseKey: 'signup', outcome: 'Pass', by: 'owner' },
      { testCaseKey: 'search-keyword', outcome: 'Pass' },
      { testCaseKey: 'filter-price', outcome: 'Pass' },
      { testCaseKey: 'cart-add', outcome: 'Pass', by: 'owner' },
      { testCaseKey: 'cart-quantity', outcome: 'Pass' },
      { testCaseKey: 'guest-checkout', outcome: 'Fail' },
      { testCaseKey: 'card-visa', outcome: 'Pass' },
      { testCaseKey: 'order-history', outcome: 'Pass', by: 'owner' },
    ],
  },
  {
    key: 'payments-smoke',
    name: 'Payments smoke',
    description: 'Quick check of every payment method after the gateway upgrade.',
    status: 'Completed',
    environmentKey: 'staging',
    browser: 'Chromium',
    viewport: [1280, 720],
    locale: 'en-US',
    timezone: 'UTC',
    autoCreateBug: true,
    createdBy: 'contributor',
    createdDaysAgo: 10,
    readyDaysAgo: 9.5,
    startedDaysAgo: 9,
    completedDaysAgo: 8.9,
    elapsedMinutes: 75,
    runs: [
      { testCaseKey: 'card-visa', outcome: 'Pass' },
      { testCaseKey: 'card-3ds', outcome: 'Fail' },
      { testCaseKey: 'wallet-paypal', outcome: 'NeedsReview' },
      { testCaseKey: 'payment-declined', outcome: 'Pass' },
      { testCaseKey: 'shipping-cost', outcome: 'Pass' },
    ],
  },
  {
    key: 'release-2-4',
    name: 'Release 2.4 regression',
    description: 'Full regression before the 2.4 release.',
    status: 'InProgress',
    environmentKey: 'qa',
    browser: 'Firefox',
    viewport: [1920, 1080],
    locale: 'en-US',
    timezone: 'America/New_York',
    autoCreateBug: false,
    createdBy: 'owner',
    createdDaysAgo: 3,
    readyDaysAgo: 2,
    startedDaysAgo: 1,
    elapsedMinutes: 130,
    resumedMinutesAgo: 40,
    runs: [
      { testCaseKey: 'login-valid', outcome: 'Pass' },
      { testCaseKey: 'login-invalid', outcome: 'Pass' },
      { testCaseKey: 'lockout', outcome: 'Fail' },
      { testCaseKey: 'reset-password', outcome: 'Fail' },
      { testCaseKey: 'signup', outcome: 'Pass', by: 'owner' },
      { testCaseKey: 'search-keyword', outcome: 'Pass' },
      { testCaseKey: 'search-empty', outcome: 'NeedsReview' },
      { testCaseKey: 'filter-price', outcome: 'Pass' },
      { testCaseKey: 'cart-add', outcome: 'Pass' },
      { testCaseKey: 'sort-price' },
      { testCaseKey: 'product-detail' },
      { testCaseKey: 'cart-persist' },
      { testCaseKey: 'guest-checkout' },
      { testCaseKey: 'profile-edit' },
    ],
  },
  {
    key: 'search-pass',
    name: 'Search & catalog pass',
    description: 'Exploratory pass over search and catalog browsing on Safari.',
    status: 'Paused',
    environmentKey: 'qa',
    browser: 'WebKit',
    viewport: [390, 844],
    locale: 'en-GB',
    timezone: 'Europe/London',
    autoCreateBug: false,
    createdBy: 'contributor',
    createdDaysAgo: 6,
    readyDaysAgo: 5,
    startedDaysAgo: 4,
    pausedDaysAgo: 3.9,
    elapsedMinutes: 50,
    runs: [
      { testCaseKey: 'search-keyword', outcome: 'Pass' },
      { testCaseKey: 'search-empty', outcome: 'Fail' },
      { testCaseKey: 'filter-price' },
      { testCaseKey: 'sort-price' },
      { testCaseKey: 'product-detail' },
      { testCaseKey: 'smoke-home' },
    ],
  },
  {
    key: 'checkout-hotfix',
    name: 'Checkout hotfix verification',
    description: 'Verify the guest checkout fix before it ships.',
    status: 'Ready',
    environmentKey: 'staging',
    browser: 'Chromium',
    viewport: [1280, 720],
    locale: 'en-US',
    timezone: 'UTC',
    autoCreateBug: true,
    createdBy: 'contributor',
    createdDaysAgo: 2,
    readyDaysAgo: 1.5,
    elapsedMinutes: 0,
    runs: [
      { testCaseKey: 'guest-checkout' },
      { testCaseKey: 'shipping-cost' },
      { testCaseKey: 'card-visa' },
      { testCaseKey: 'payment-declined' },
    ],
  },
  {
    key: 'account-planning',
    name: 'Account settings (planning)',
    description: 'Planned coverage for the account settings redesign.',
    status: 'Draft',
    environmentKey: null,
    browser: 'Chromium',
    viewport: [1280, 720],
    locale: 'en-US',
    timezone: 'UTC',
    autoCreateBug: false,
    createdBy: 'owner',
    createdDaysAgo: 0.5,
    elapsedMinutes: 0,
    runs: [{ testCaseKey: 'profile-edit' }, { testCaseKey: 'profile-email' }, { testCaseKey: 'order-history' }],
  },
];

export const BUGS: DemoBug[] = [
  {
    key: 'lockout-not-locking',
    title: 'Account does not lock after five failed sign-ins',
    severity: 'High',
    status: 'Resolved',
    description: 'After five wrong passwords the sixth attempt is still accepted; no lock email is sent.',
    stepsToReproduce: '1. Sign in as "shopper" with a wrong password 5 times\n2. Sign in with the right password',
    run: { executionKey: 'release-2-3', testCaseKey: 'lockout' },
    failedStep: 'Then the account is locked for 15 minutes',
    autoCreated: false,
    reporter: 'contributor',
    createdDaysAgo: 17.5,
    statusChange: { from: 'Open', daysAgo: 12, by: 'owner' },
  },
  {
    key: 'guest-address-lost',
    title: 'Guest checkout loses the shipping address on back navigation',
    severity: 'Critical',
    status: 'Closed',
    description: 'Going back to the cart and returning to checkout clears every address field.',
    stepsToReproduce: '1. Check out as a guest\n2. Enter a shipping address\n3. Go back to the cart, then return to checkout',
    run: { executionKey: 'release-2-3', testCaseKey: 'guest-checkout' },
    failedStep: 'Then the shipping address is still filled in',
    autoCreated: false,
    reporter: 'contributor',
    createdDaysAgo: 16.5,
    statusChange: { from: 'Open', daysAgo: 13, by: 'owner' },
  },
  {
    key: 'three-ds-auto',
    title: 'Pay with a card requiring 3-D Secure',
    // AUTO_CREATED_SEVERITY: what the API gives an auto-created bug.
    severity: 'Medium',
    status: 'InProgress',
    description: null,
    stepsToReproduce: null,
    run: { executionKey: 'payments-smoke', testCaseKey: 'card-3ds' },
    failedStep: null,
    autoCreated: true,
    reporter: 'contributor',
    createdDaysAgo: 8.95,
    statusChange: { from: 'Open', daysAgo: 8, by: 'owner' },
  },
  {
    key: 'reset-link-expired',
    title: 'Password reset link expires immediately',
    severity: 'Critical',
    status: 'Open',
    description: 'The reset link says "This link has expired" even when opened seconds after the email arrives.',
    stepsToReproduce: '1. Request a password reset\n2. Open the link from the email right away',
    run: { executionKey: 'release-2-4', testCaseKey: 'reset-password' },
    failedStep: 'When I open the reset link from the email',
    autoCreated: false,
    reporter: 'contributor',
    createdDaysAgo: 0.8,
  },
  {
    key: 'lockout-counter-reset',
    title: 'Lockout counter resets after a page reload',
    severity: 'High',
    status: 'Open',
    description: 'Reloading the sign-in page between attempts resets the failed-attempt count.',
    stepsToReproduce: '1. Fail sign-in 4 times\n2. Reload the page\n3. Fail once more: the account is not locked',
    run: { executionKey: 'release-2-4', testCaseKey: 'lockout' },
    failedStep: 'Then the account is locked for 15 minutes',
    autoCreated: false,
    reporter: 'owner',
    createdDaysAgo: 0.9,
  },
  {
    key: 'empty-search-error',
    title: 'Empty search shows a server error instead of suggestions',
    severity: 'Medium',
    status: 'InProgress',
    description: 'Searching for a term with no matches returns HTTP 500 on Safari.',
    stepsToReproduce: '1. Search for "xyzzy-no-such-product" on iPhone Safari',
    run: { executionKey: 'search-pass', testCaseKey: 'search-empty' },
    failedStep: 'Then I see "No products found"',
    autoCreated: false,
    reporter: 'contributor',
    createdDaysAgo: 3.95,
    statusChange: { from: 'Open', daysAgo: 3, by: 'contributor' },
  },
  {
    key: 'footer-help-links',
    title: 'Footer links point to the old help centre',
    severity: 'Low',
    status: 'Open',
    description: 'The "Help" and "Returns" footer links go to help.shopflow-legacy.test.',
    stepsToReproduce: '1. Scroll to the footer on any page\n2. Click "Help"',
    failedStep: null,
    autoCreated: false,
    reporter: 'owner',
    createdDaysAgo: 11,
  },
  {
    key: 'mobile-images-slow',
    title: 'Product images load slowly on mobile',
    severity: 'Medium',
    status: 'WontFix',
    description: 'Gallery images are served at full resolution on mobile. Accepted until the CDN migration.',
    stepsToReproduce: '1. Open any product page on a throttled 3G connection',
    failedStep: null,
    autoCreated: false,
    reporter: 'contributor',
    createdDaysAgo: 13,
    statusChange: { from: 'Open', daysAgo: 10, by: 'owner' },
  },
];
