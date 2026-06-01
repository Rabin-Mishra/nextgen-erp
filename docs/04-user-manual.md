# NextGen ERP User Manual — Staff Operations Guide

## SECTION 1: Welcome & Introduction

Welcome to your new enterprise resource planning (ERP) software, built specifically for the day-to-day operations of **NextGen Interior And Waterproofing**, Jhapa, Nepal. This ERP system acts as the central brain of your business. It runs entirely inside your web browser (Google Chrome, Microsoft Edge, or Safari), meaning you do not need to install any heavy programs on your office computers or mobile phones. You can manage transactions from anywhere with a basic internet connection.

### The 5 Main Pillars of Your ERP System:
1. **Your Stock and Materials (Inventory)**: Real-time tracking of what products (cement, pipe, waterproofing compounds, putties) are currently available in which warehouse locations.
2. **What You Bought (Purchase)**: Log purchase orders sent to suppliers, track shipments as they arrive at your warehouses, and manage accounts payables.
3. **What You Sold (Sales)**: Issue professional tax invoices (Retail, Wholesale, or Project-based billing), process customer cash payments, track credit sales, and log returns.
4. **Your Money In and Out (Cash Book & Expense Ledgers)**: View cash balances, register daily operating expenses (rent, transport, payroll), and manage rolling ledger balances.
5. **Your Construction Project Margins**: Issue materials to Gauradaha or other construction job sites, measure materials cost, and automatically calculate gross profit margins.

---

## SECTION 2: Logging In

Your account is secured by your email address and password. Follow these steps to log in and begin using the system.

### How to Log In:
1. Open your web browser and navigate to the ERP system website address (your unique firm domain).
2. The **Login Screen** will appear. Enter your registered work email address and password.
3. Click the red **Sign In** button.
4. If the credentials are correct, you will be redirected to the main **Owner/Staff Dashboard**. If you see a red message saying `"Invalid email or password"`, check your spelling and try again.

### What to Do If You Forget Your Password:
1. On the login screen, click the **Forgot Password?** link below the password field.
2. Enter your registered email address and click **Send Recovery Code**.
3. Open your email inbox in a new tab. You will receive a message containing a **6-digit Recovery OTP Code**.
4. Return to the recovery screen in the ERP browser tab. Enter the **6-digit OTP Code** and click **Verify**.
5. Enter a new secure password in the next screen, repeat it to confirm, and click **Reset Password**.
6. The system will say `"Password reset successfully"`. You can now log in using your email and new password.

### How to Log Out:
1. When you are finished with your work shift, click the user profile icon or your name in the top-right corner of the header.
2. Click the **Log Out** option. The system will clear your security session and redirect you back to the login screen.

---

## SECTION 3: Understanding the Dashboard

The dashboard provides a visual snapshot of your business health. When you log in, the screen displays several visual panels (widgets) summarizing sales, stocks, and costs:

- **Revenue This Month**: The total NPR value of all tax invoices generated during the current month. A green or red badge shows whether this represents an increase or decrease compared to the previous month.
- **Expenses This Month**: The sum of all registered operational costs (salary, transport, rent). A higher number indicates higher overhead expenses.
- **Active Construction Sites**: The count of projects currently marked as `ACTIVE` or `PLANNING` (e.g., Gauradaha Commercial Complex).
- **Low Stock Alerts**: Displays the count of items that are currently running below their minimum warehouse reorder limits, warning you that it is time to buy more from suppliers.
- **Sales Revenue Chart (3 Colors)**:
  - **Blue**: Represents Retail (walk-in) cash/credit invoice revenues.
  - **Green**: Represents Wholesale business-to-business bulk supply revenues.
  - **Purple**: Represents Project contract supply revenues.
- **Cash Flow Chart**: A monthly visual comparison of cash coming in (payments collected) versus cash going out (vendor settlements, expenses paid), helping you monitor liquidity.
- **Recent Invoices**: A rolling list of the last 5 invoices issued, showing the customer name, date, invoice type, total value, and payment status (`DRAFT`, `SENT`, `PARTIAL`, `PAID`, `OVERDUE`).
- **Low Stock Widget**: Lists the actual names of the low-stock products (e.g. Maruti Cement) and their available quantities, so you don't have to search the full catalog.
- **Pending Vendor Payments**: Summarizes suppliers who have outstanding bills, along with their payment due dates.

---

## SECTION 4: Managing Your Products (Inventory)

### 4.1 Adding a New Product to the Catalog:
1. Go to the left navigation sidebar and click **Inventory** -> **Products** -> click **Add Product**.
2. **Step 1: Core Details**: Fill in the **Product Name** (e.g., *OPC Cement 43 Grade*), select a **Category** (e.g., *Cement*), select a **Brand** (e.g., *Maruti*), and select a **Unit of Measurement** (e.g., *BAG*).
3. **Step 2: Stock Limits**: Fill in **Min Stock Level** (the alert threshold, e.g. `20`) and **Reorder Level** (the stock level that triggers purchase reminders, e.g. `50`).
4. **Step 3: Vendor Pricing Matrix**: Assign which supplier supplies this product, enter the **Purchase Price** (e.g., `720.00`), and fill in the three selling prices:
   - **Retail Price**: Price for walk-in retail buyers (e.g., `830.00`).
   - **Wholesale Price**: Price for bulk traders (e.g., `780.00`).
   - **Project Price**: Price for site contracts (e.g., `750.00`).
5. Click **Save Product**. The item is added to the system catalog and assigned a unique code (e.g., `ITM-0001`).

### 4.2 Understanding Stock Status Colors:
- **Green (Healthy)**: Stock is well above your min limit. You can sell it safely.
- **Amber (Low Stock)**: Stock has dropped below your reorder limit. Create a Purchase Order soon to avoid running out.
- **Red (Out of Stock)**: Available quantity is zero. The invoicing screen will block sales for this item.

### 4.3 Adjusting Stock (Audit Corrections):
*Use this option only during manual stock counts, or if inventory is damaged, broken, or lost.*
1. In the **Inventory** panel, click **Stock Adjustments** -> click **Create Adjustment**.
2. Select the **Warehouse** (e.g. *Main Warehouse*) and search for the **Product**.
3. Select the type: **Stock In** (adds stock, e.g. found items) or **Stock Out** (reduces stock, e.g. damaged putty).
4. Enter the **Adjustment Quantity** (always positive) and type a mandatory **Reason** (e.g. `"Water damage during rain"`).
5. Click **Submit Adjustment**. The warehouse quantity updates immediately, and an immutable log is recorded.

---

## SECTION 5: Buying from Suppliers (Purchase)

### 5.1 Adding a New Supplier:
1. Go to **Purchase** sidebar -> click **Suppliers** -> click **New Supplier**.
2. Fill in the **Supplier Name** (e.g. *Maruti Cement Ltd*), **Phone**, **Email**, **Address**, and **PAN Number** (Nepali 9-digit tax number).
3. Fill in the **Opening Balance** if you have an outstanding debt carried forward from previous bookkeeping (otherwise enter `0.00`).
4. Click **Save Supplier**. The profile is registered under an auto-generated code (e.g. `SUP-0001`).

### 5.2 Creating a Purchase Order (PO):
*A PO is a formal record of what you are ordering. It does not affect your stock or accounting ledgers until you receive the goods.*
1. Click **Purchase** -> click **Purchase Orders** -> click **New PO**.
2. Select the **Supplier**. The system loads their profile details automatically.
3. Select the expected delivery date and add items to the order: choose the product, specify the quantity, and verify the supplier's unit cost.
4. Click **Create PO**. The order is saved in **DRAFT** status.
5. Review the draft, then click **Submit PO**. The status changes to **ORDERED**, signaling that the order has been officially placed.

### 5.3 Receiving Goods (Dispatches):
*When the truck arrives at your warehouse, you must record what actually arrived. This increases your warehouse stock levels.*
1. Go to **Purchase Orders** list -> click on the specific **PO** marked **ORDERED**.
2. Click **Receive Shipment**.
3. Select the target **Warehouse** where the goods are being unloaded.
4. For each line item, enter the **Received Quantity** (if some bags were damaged or missing, only enter the count of good items unloaded).
5. Check the **Apply 13% VAT** box if the supplier issued a standard tax invoice.
6. Click **Confirm Goods Receipt**. 
   - Available warehouse stock increases immediately.
   - If all items arrived, status changes to **RECEIVED**. If some items are missing, status becomes **PARTIAL**.
   - A **Ledger Credit Entry** is posted, recording that you now owe the supplier for this receipt.

### 5.4 Recording a Supplier Payment:
1. Go to **Purchase** -> click **Record Payment**.
2. Choose the **Supplier** and select the **PO** or invoice you are paying against.
3. Enter the paid **Amount** (e.g. `NPR 50,000.00`) and select the **Payment Method** (*CASH*, *BANK*, *CHEQUE*, *eSEWA*, etc.).
4. Enter payment notes (e.g. `"Bank transfer voucher no. 9282"`) and click **Save Payment**. This reduces your cash book balance and decreases your outstanding debt to the supplier.

---

## SECTION 6: Selling to Customers (Sales)

### 6.1 Understanding Invoice Types:
- **RETAIL (Blue)**: For walk-in customers buying small quantities. Uses standard retail pricing.
- **WHOLESALE (Green)**: For bulk traders and distribution shops. Automatically loads wholesale pricing and requires a customer PAN.
- **PROJECT (Purple)**: For contractors and site works. Automatically uses project pricing and requires a link to an active `Project` card.

### 6.2 Issuing a New Invoice:
1. Go to **Sales** sidebar -> click **Invoices** -> click **Create Invoice**.
2. Select the **Invoice Type** (*RETAIL*, *WHOLESALE*, or *PROJECT*).
3. Select the **Customer**. (If they are a project client, also select the target **Project Site**).
4. Add products to the items list:
   - Select the product. The system automatically pulls the correct price tier (Retail/Wholesale/Project price variant).
   - Enter the **Quantity** and any specific line-item **Discount %** (e.g., `2.5%`).
5. Choose whether to **Apply 13% VAT** (this adds 13% tax to the taxable subtotal).
6. Under **Payment Status**:
   - If they paid cash, enter the paid amount under **Initial Payment Amount** and select the cash/bank method.
   - If it is a credit sale, leave the initial payment amount as `0.00`.
7. Click **Confirm Invoice**.
   - Available stock drops immediately.
   - The invoice displays. You can click **Download PDF** to print or share it.

### 6.3 Processing a Customer Return (Sales Return):
*Use this option if a customer returns unused or defective materials. The returned items are credited back to inventory, and the customer's outstanding balance decreases.*
1. Go to **Sales** -> **Invoices** -> click on the **Invoice** they are returning items from.
2. In the invoice details, click the red **Create Return** button.
3. Enter a mandatory **Reason for Return** (e.g. `"Excess waterproofing material returned by contractor"`).
4. Select the **Refund Issuance Method** (e.g. *CASH* if refunding cash, or select *CREDIT* if adjusting their credit account).
5. For each item listed, enter the **Return Qty** (this cannot exceed what they originally purchased).
6. Click **Confirm Return Note**.
   - Warehouse stock increases for returned items.
   - A Credit Note is generated.
   - The original invoice is **dynamically updated** to show original, returned, and remaining quantities/totals in a single table, ensuring billing consistency.

---

## SECTION 7: Construction Projects

### 7.1 What is a Project?
A **Project** represents a contract where you supply materials over time to a site (such as Gauradaha Commercial Complex). The system tracks the cost of materials sent, invoices generated, and actual gross profit margins.

### 7.2 Creating a Project:
1. Go to **Projects** -> click **New Project**.
2. Enter the **Project Name** and select the **Client (Customer)**.
3. Enter the **Contract Amount** (total billing contract value, e.g. `NPR 10,00,000.00`) and the **Budget Amount** (allocated budget, e.g. `NPR 8,00,000.00`).
4. Select the start and expected end dates and click **Save Project**. The project card is created in **PLANNING** status.

### 7.3 Issuing Materials to a Site:
1. Open the **Projects** directory -> click on your **Project**.
2. Click **Issue Supply**.
3. Select the target **Warehouse** from which materials are being loaded.
4. Add products, quantities, and verify pricing.
5. Click **Confirm Site Supply**. This decreases warehouse inventory and logs a project-specific invoice, adding to the total project billing cost.

### 7.4 Reading Project Profitability:
Open the project card to view real-time margins:
- **Contract Amount**: Total signed project value.
- **Total Billed**: The sum of all material issue invoices sent to the site.
- **Material Cost**: The original purchase cost value of the issued materials.
- **Gross Profit**: `Total Billed - Material Cost`.
- **Margin %**: The profit margin percentage (e.g. `25%`), helping you monitor project viability.

---

## SECTION 8: Recording Expenses

Operating expenses represent day-to-day overhead costs that are not inventory purchases.

### How to Record an Expense:
1. Go to the sidebar and click **Expenses** -> click **Add Expense**.
2. Select an **Expense Category**:
   - **Shop Rent**: Physical building rent.
   - **Transport Cost**: Delivery vehicle fuel, repairs, or truck hires.
   - **Staff Salary**: Worker wages.
   - **Miscellaneous**: Printing papers, office teas, or utility bills.
3. Enter the paid **Amount** (e.g. `NPR 1,500.00`), **Expense Date**, and the **Payment Method** (e.g. *CASH* or *BANK*).
4. Enter notes (e.g., `"Shop rent for Jestha 2083"`) and click **Save Expense**. This automatically records a cash outflow in the daily Cash Book.

---

## SECTION 9: Cash Book

The **Cash Book** serves as your automated daily cash register diary, showing every rupee entering and leaving your firm.

- **How to read it**: Go to **Accounting** -> **Cash Book**. It lists date, description, party name, transaction type (**RECEIVED** or **PAID**), payment mode, transaction amount, and the running cash balance.
- **Closing Balances**: Use the date filter at the top to select any calendar day. The system will display that day's **Opening cash balance**, all transactions, and the **Closing cash balance** to make physical cash verification simple.
- **Manual Cash Entries**: If you receive non-invoice cash or pay cash outside of standard operations, use the **Add Cash Entry** button to record manual inputs/outflows.

---

## SECTION 10: Ledger (Customer & Vendor Accounts)

The **Ledger** tracks your outstanding debit/credit account balances, functioning like a bank statement for each client or supplier.

- **How to look up a customer**: Go to **Sales** -> **Customers** -> select the customer name. The system displays their registered profile, current total balance, and a chronological ledger table.
- **Understanding Ledger Entries**:
  - **DEBIT (Inbound)**: Increases customer outstanding debt. Occurs when a Sales Invoice is issued.
  - **CREDIT (Outbound)**: Decreases customer debt. Occurs when they make a payment or return products.
- **Filtering and Exporting**:
  - Use filters to isolate sales channels (Retail vs Wholesale vs Project sales).
  - Click **Download PDF** to print an elegant account statement to share with the customer, or click **Export Excel** for detailed accounting reconciliations.

---

## SECTION 11: Financial Reports

*These reports are used by the business owner and accounting staff to audit trading activity and compile tax sheets.*

- **Profit & Loss Statement**: Select a month and year. The report calculates total revenue, subtracts the Cost of Goods Sold (COGS), and subtracts operating expenses to calculate your **Net Profit**.
- **Balance Sheet**: Provides a snapshot of assets (what the business owns: bank balances, outstanding customer invoices, fixed assets, warehouse stock value) and liabilities (what the business owes: supplier balances). Both columns must balance perfectly.
- **Trading Account**: Calculates direct gross profit margins from buying and selling physical goods before accounting for operating overheads.
- **Cash Flow Statement**: Categorizes cash movements by operations, investments, and financings, tracking actual cash liquidity.
- **Trial Balance**: Lists closing balances of all ledger categories. If total debits do not equal total credits, a data entry error has occurred.
- **Outstanding Dues (Aging)**: Categorizes customer debts by age: `0-30 days`, `31-60 days`, `61-90 days`, and `90+ days` (overdue). It highlights customers who are late on payments so you can pursue collections.

---

## SECTION 12: Settings

*Access to the Settings panel is restricted strictly to users logged in as SUPERADMIN or OWNER.*

- **Business Profile**: Change your firm name, update the PAN tax number, edit phone numbers, or modify Jhapa business addresses. Changes reflect immediately on all invoice headers.
- **Invoice Settings**: Customize default prefix codes (e.g. `INV`), standard tax VAT percent, and distinct color codes for Retail, Wholesale, and Project invoices.
- **Fiscal Years**: Create a new fiscal year period (every July/Shrawan) to segment your accounting data, or mark a completed year as `CLOSED` to lock historical records from modification.

---

## SECTION 13: Managing Staff Access

Only users logged in as `SUPERADMIN` can access user directories.

### The 6 Access Levels:
1. **SUPERADMIN**: Total system control. Can add or delete staff, run full database data resets, and manage all settings.
2. **OWNER**: Identical to SuperAdmin, but cannot run full system resets or delete administrative user records.
3. **MANAGER**: Access to sales, purchases, projects, ledgers, and financial reports. Cannot edit users or modify business PAN profiles.
4. **SALES_STAFF**: Restricted strictly to invoicing, customer payments, cash book sheets, and project site dispatches. Cannot see purchase costs or operating expense lists.
5. **PURCHASE_STAFF**: Restricted strictly to registering products, editing cost sheets, receiving PO shipments, and updating supplier cards. Cannot see customer invoice sheets or net company profits.
6. **VIEWER**: Read-only access to search product stocks and look up customer profiles. Cannot download files or modify records.

### How to Deactivate a Staff Member:
1. Go to **Settings** -> **Staff Management** -> click on the specific employee profile.
2. Toggle the **Is Active** switch to off and click **Save**. 
3. The deactivated staff member is immediately blocked from logging into the ERP system. *Note: All transactions and audit logs previously entered by them remain fully preserved for historical audit security.*

---

## SECTION 14: Common Problems & Solutions

#### Q: I cannot create a sales invoice — the system blocks me saying "insufficient stock".
**A**: The ERP prevents negative inventory values. Go to **Inventory** -> **Products** and check the stock levels. If a shipment recently arrived but hasn't been logged yet, go to **Purchase** -> **Purchase Orders** and complete the **Receive Goods** transaction to increase available quantities before invoicing.

#### Q: I entered a wrong amount in a customer ledger entry. How do I delete it?
**A**: To protect accounting compliance, you cannot delete or update ledger entries. You must log an offsetting transaction (such as registering a refund payment or creating a credit note return) to reverse the incorrect balance.

#### Q: I forgot my login password and recovery email is not arriving.
**A**: Check your email spam or junk folder. If it is still missing, ask your system **SuperAdmin** to navigate to **Staff Management**, select your account, and assign a new temp password manually.

#### Q: A customer returned some materials. Where do I record it?
**A**: Do not enter a manual cash outflow. Go to the **Sales** list, open the customer's original **Invoice**, and click the red **Create Return** button. This automatically increases inventory and credits their ledger account.

#### Q: I cannot delete an old customer card.
**A**: Customers or suppliers linked to historic invoices or payments cannot be deleted because it would break database reports. Open the customer card, click the edit profile option, toggle the **Is Active** flag to off, and click save. They will no longer appear in active dropdown selections.
