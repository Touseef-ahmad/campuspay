# SFMS User Stories

## Overview

This document contains comprehensive user stories for the Student Financial Management System (SFMS), organized by epic/feature area. Each story follows the format:

> As a [role], I want to [goal] so that [benefit]

---

## Epic 1: Authentication & Access Control

### US-1.1: Institute Registration

**As an** institute administrator  
**I want to** register my educational institute in the system  
**So that** I can start using the platform to manage student finances

**Acceptance Criteria:**

- Can access registration form from login page
- Form requires: institute name, email, password (min 8 chars), address, institute type
- Password confirmation must match
- Successful submission shows confirmation message
- Institute is created with `isApproved: false` status
- Admin user account is created and linked to institute
- Cannot access dashboard until institute is approved

**Story Points:** 5

---

### US-1.2: Staff Member Registration

**As a** staff member  
**I want to** register for an existing institute  
**So that** I can assist in managing student records and finances

**Acceptance Criteria:**

- Registration form allows selecting "Staff" registration type
- Must provide institute reference/code
- Form requires: name, email, password (min 6 chars)
- User created with `isApproved: false`
- User linked to specified institute
- Receives confirmation of pending approval
- Cannot access dashboard until approved by school admin

**Story Points:** 3

---

### US-1.3: User Login

**As a** registered user  
**I want to** log in with my email and password  
**So that** I can securely access my institute's data

**Acceptance Criteria:**

- Login form accepts email and password
- Invalid credentials show generic error (security)
- Successful login issues JWT token stored in HTTP-only cookie
- User redirected based on role and approval status:
  - Unapproved: Pending approval page
  - Approved: Dashboard
  - Unapproved Institute: Pending institute approval page

**Story Points:** 3

---

### US-1.4: User Logout

**As a** logged-in user  
**I want to** log out of the system  
**So that** my session is securely ended

**Acceptance Criteria:**

- Logout clears authentication token
- User redirected to login page
- Cannot access protected routes after logout
- "Remember me" sessions are also cleared

**Story Points:** 1

---

### US-1.5: View Current User Profile

**As a** logged-in user  
**I want to** view my profile information  
**So that** I can verify my account details

**Acceptance Criteria:**

- Can access profile via header/sidebar
- Shows: name, email, role, institute name
- Shows approval status
- Shows last login time (if tracked)

**Story Points:** 2

---

## Epic 2: Institute Management

### US-2.1: View All Institutes (System Admin)

**As a** system administrator  
**I want to** view a list of all registered institutes  
**So that** I can monitor and manage the platform

**Acceptance Criteria:**

- List shows all institutes regardless of approval status
- Displays: name, email, address, type, user count, approval status
- Pending institutes visually distinguished
- Search functionality by name
- Pagination for large lists

**Story Points:** 3

---

### US-2.2: Approve Institute

**As a** system administrator  
**I want to** approve a pending institute  
**So that** they can start using the system

**Acceptance Criteria:**

- Approve button visible on pending institutes
- Single-click approval
- Institute `isApproved` becomes `true`
- Institute admin receives access to dashboard
- Confirmation message shown
- Audit log entry created (if applicable)

**Story Points:** 2

---

### US-2.3: Reject Institute

**As a** system administrator  
**I want to** reject a pending institute registration  
**So that** invalid or fraudulent registrations are removed

**Acceptance Criteria:**

- Reject button visible on pending institutes
- Confirmation dialog before rejection
- Institute deleted from system
- Cascade deletes: all institute users, accounts
- Cannot undo rejection
- Optional: notification sent to institute email

**Story Points:** 3

---

### US-2.4: Search Institutes

**As a** system administrator  
**I want to** search institutes by name  
**So that** I can quickly find specific institutes

**Acceptance Criteria:**

- Search input filters results in real-time
- Case-insensitive matching
- Partial name matches work
- Shows "No results" if no matches

**Story Points:** 2

---

## Epic 3: User Management

### US-3.1: View Institute Users

**As a** school administrator  
**I want to** view all users in my institute  
**So that** I can manage staff access

**Acceptance Criteria:**

- Shows only users belonging to my institute
- Displays: name, email, role, approval status
- Can filter by approval status
- Cannot see users from other institutes

**Story Points:** 3

---

### US-3.2: Approve Staff Member

**As a** school administrator  
**I want to** approve pending staff registrations  
**So that** verified staff can access the system

**Acceptance Criteria:**

- See pending staff in user list
- Approve button triggers status change
- User `isApproved` becomes `true`
- User can now access dashboard
- Cannot approve self (system admin exemption)

**Story Points:** 2

---

### US-3.3: Reject Staff Member

**As a** school administrator  
**I want to** reject unauthorized staff registrations  
**So that** only verified personnel have access

**Acceptance Criteria:**

- Reject removes user from system
- Confirmation required before deletion
- Cannot reject self
- School admin can only reject own institute users
- System admin can reject any user

**Story Points:** 2

---

## Epic 4: Academic Structure Management

### US-4.1: Create Academic Term

**As a** school administrator  
**I want to** create academic terms/semesters  
**So that** I can organize the academic calendar

**Acceptance Criteria:**

- Can create term with name (e.g., "Fall 2026")
- Must specify start date and end date
- End date must be after start date
- Term linked to institute
- Appears in dropdowns for program offerings

**Story Points:** 2

---

### US-4.2: Create Program

**As a** school administrator  
**I want to** create academic programs/courses  
**So that** students can enroll in structured curricula

**Acceptance Criteria:**

- Form includes: code, title, department, credits, total semesters, duration
- Program code must be unique within institute
- Status defaults to ACTIVE
- Can set 1-12 semesters
- Program appears in program list

**Story Points:** 3

---

### US-4.3: Manage Program Status

**As a** school administrator  
**I want to** activate, deactivate, or archive programs  
**So that** I can manage program lifecycle

**Acceptance Criteria:**

- Status options: ACTIVE, INACTIVE, ARCHIVED
- Can change status from program edit
- ARCHIVED programs hidden from enrollment
- INACTIVE prevents new offerings
- Existing enrollments unaffected by status change

**Story Points:** 2

---

### US-4.4: Create Program Offering (Class)

**As a** school administrator  
**I want to** create program offerings for specific terms  
**So that** students can enroll in semester-specific classes

**Acceptance Criteria:**

- Select program, academic term, semester number
- Set max students (optional)
- Cannot duplicate (same program + term + semester)
- Creates enrollable class session

**Story Points:** 3

---

### US-4.5: View Program Offerings

**As a** staff member  
**I want to** view all program offerings  
**So that** I can see available classes and enrollments

**Acceptance Criteria:**

- List shows all offerings for institute
- Filter by program and/or term
- Shows: program name, term, semester, enrolled/max students
- Can see enrollment percentage

**Story Points:** 2

---

## Epic 5: Student Management

### US-5.1: Create Student

**As a** staff member  
**I want to** create new student records  
**So that** students are registered in the system

**Acceptance Criteria:**

- Form includes: first name, last name, department, enrollment date, academic year
- Student ID auto-generated or manually assigned
- Student ID unique within institute
- Status defaults to ACTIVE
- Can assign fees during creation

**Story Points:** 3

---

### US-5.2: Search Students

**As a** staff member  
**I want to** search students by name  
**So that** I can quickly find specific students

**Acceptance Criteria:**

- Search by first name or last name
- Case-insensitive matching
- Partial matches work
- Results update as user types (debounced)
- Shows "No students found" if empty

**Story Points:** 2

---

### US-5.3: View Student List

**As a** staff member  
**I want to** view all students in my institute  
**So that** I can see the student roster

**Acceptance Criteria:**

- Paginated list of students
- Shows: student ID, name, department, status
- Excludes archived students by default
- Can toggle to show archived
- Sorted by name or recent enrollment

**Story Points:** 2

---

### US-5.4: View Student Profile

**As a** staff member  
**I want to** view a student's complete profile  
**So that** I can see all their information in one place

**Acceptance Criteria:**

- Personal info section: name, ID, department, enrollment date, academic year
- Enrollment section: list of class enrollments with program/term/semester
- Financial summary: total fees, total paid, balance
- Payment history: list of all payments
- Quick actions: add payment, enroll, edit

**Story Points:** 5

---

### US-5.5: Edit Student Information

**As a** staff member  
**I want to** update student information  
**So that** records stay current and accurate

**Acceptance Criteria:**

- Can edit: first name, last name, department, academic year, enrollment date
- Can change status: ACTIVE, SUSPENDED, ARCHIVED
- Validation on required fields
- Changes reflected immediately

**Story Points:** 2

---

### US-5.6: Enroll Student in Class

**As a** staff member  
**I want to** enroll a student in a program offering  
**So that** they are registered for classes

**Acceptance Criteria:**

- Select from available program offerings
- Cannot enroll in same class twice
- Check max student capacity
- Create enrollment record linking student to offering
- Optionally assign fees at enrollment

**Story Points:** 3

---

### US-5.7: View Student Financial Statement

**As a** staff member  
**I want to** view a student's complete financial statement  
**So that** I can see their payment history and outstanding balance

**Acceptance Criteria:**

- Shows all assigned fees with due dates
- Shows all payments with dates and amounts
- Running balance calculation
- Export to PDF option (if applicable)
- Print-friendly format

**Story Points:** 3

---

### US-5.8: View Student Statistics

**As a** school administrator  
**I want to** see aggregate student statistics  
**So that** I can monitor enrollment and finances

**Acceptance Criteria:**

- Total student count
- Active student count
- Students with outstanding dues
- Total outstanding amount
- Visual representation (charts optional)

**Story Points:** 2

---

## Epic 6: Fee Management

### US-6.1: Create Fee Type

**As a** school administrator  
**I want to** create fee types with default amounts  
**So that** fees can be consistently applied to students

**Acceptance Criteria:**

- Form includes: fee name, default amount, fee type/category
- Fee linked to institute
- Appears in fee assignment dropdowns
- Can create multiple fee types (Tuition, Lab, Library, etc.)

**Story Points:** 2

---

### US-6.2: Assign Fees to Student

**As a** staff member  
**I want to** assign fees to a student  
**So that** they have a defined amount to pay

**Acceptance Criteria:**

- Select one or more fee types
- Can customize amount (or use default)
- Set due date
- Link to program offering (optional)
- Creates StudentFee records with PENDING status

**Story Points:** 3

---

### US-6.3: View Student Fees

**As a** staff member  
**I want to** view all fees assigned to a student  
**So that** I can track their financial obligations

**Acceptance Criteria:**

- List shows: fee name, amount due, amount paid, balance, status, due date
- Status: PENDING (no payment), PARTIAL (some paid), PAID (fully paid)
- Visual indicator for overdue fees
- Summary totals at bottom

**Story Points:** 2

---

### US-6.4: Filter Fees by Status

**As a** staff member  
**I want to** filter fees by payment status  
**So that** I can focus on pending or partial payments

**Acceptance Criteria:**

- Filter options: All, Pending, Partial, Paid
- Instant filter application
- Count shown for each status
- Persists during session

**Story Points:** 2

---

## Epic 7: Payment Processing

### US-7.1: Record Single Fee Payment

**As a** staff member  
**I want to** record a payment against a student's fee  
**So that** their balance is updated

**Acceptance Criteria:**

- Select fee to pay from student's pending fees
- Enter payment amount
- Select payment method (cash, bank transfer, etc.)
- Payment cannot exceed remaining balance
- Fee status updates: PENDING → PARTIAL or PAID
- Account balance increases
- Payment transaction created

**Story Points:** 3

---

### US-7.2: Record Bulk Payment

**As a** staff member  
**I want to** record a single payment covering multiple fees  
**So that** students can pay several fees at once

**Acceptance Criteria:**

- Select multiple fees
- Enter total payment amount
- System distributes across selected fees
- All affected fees update status
- Single transaction record created
- Account balance increases by total

**Story Points:** 5

---

### US-7.3: Prevent Overpayment

**As a** staff member  
**I want** the system to prevent overpayments  
**So that** financial records stay accurate

**Acceptance Criteria:**

- Cannot enter amount > remaining balance for single fee
- For bulk: total cannot exceed sum of all balances
- Clear error message when attempted
- Field shows maximum allowed

**Story Points:** 2

---

### US-7.4: View Payment History

**As a** staff member  
**I want to** view all payments made by a student  
**So that** I can track their payment behavior

**Acceptance Criteria:**

- List shows: date, amount, fee paid, payment method
- Sorted by date (newest first)
- Shows which financial account received payment
- Can see receipt number (if applicable)

**Story Points:** 2

---

## Epic 8: Financial Account Management

### US-8.1: Create Financial Account

**As a** school administrator  
**I want to** create bank and cash accounts  
**So that** I can track where money is received and spent

**Acceptance Criteria:**

- Form includes: account name, type (Bank/Cash)
- Option to set as default account
- Initial balance starts at 0
- Bank accounts may include: bank name, account number (optional)

**Story Points:** 2

---

### US-8.2: Set Default Account

**As a** school administrator  
**I want to** designate a default payment account  
**So that** payments are processed correctly

**Acceptance Criteria:**

- Can mark one account as default
- Default used automatically for payments
- Warning/error if no default when processing payment
- Only one default per institute

**Story Points:** 2

---

### US-8.3: View Account Balances

**As a** school administrator  
**I want to** view all account balances  
**So that** I can monitor cash flow

**Acceptance Criteria:**

- List shows all accounts with current balance
- Shows account type (Bank/Cash)
- Default account highlighted
- Total across all accounts shown

**Story Points:** 2

---

### US-8.4: Transfer Between Accounts

**As a** school administrator  
**I want to** transfer funds between accounts  
**So that** I can manage cash positions

**Acceptance Criteria:**

- Select source and destination accounts
- Enter transfer amount
- Amount cannot exceed source balance
- Source balance decreases
- Destination balance increases
- Transfer record created with date

**Story Points:** 3

---

### US-8.5: Record Expense

**As a** school administrator  
**I want to** record institutional expenses  
**So that** I can track outflows against income

**Acceptance Criteria:**

- Form includes: title, amount, category, date, account
- Amount cannot exceed account balance
- Account balance decreases
- Expense linked to category for reporting
- Transaction record created

**Story Points:** 3

---

### US-8.6: Manage Expense Categories

**As a** school administrator  
**I want to** create expense categories  
**So that** expenses are organized for reporting

**Acceptance Criteria:**

- Create categories: Salaries, Utilities, Supplies, Maintenance, etc.
- Categories scoped to institute
- Appear in expense form dropdown
- Can rename or delete (if no expenses linked)

**Story Points:** 2

---

### US-8.7: View Transactions

**As a** school administrator  
**I want to** view all financial transactions  
**So that** I can audit income and expenses

**Acceptance Criteria:**

- Combined view of payments and expenses
- Shows: date, type (credit/debit), description, amount, account
- Filter by date range
- Filter by type (payments only, expenses only, all)
- Sorted by date (newest first)

**Story Points:** 3

---

## Epic 9: Dashboard & Analytics

### US-9.1: View Dashboard Overview

**As a** school administrator  
**I want to** see a dashboard with key metrics  
**So that** I can quickly assess operational status

**Acceptance Criteria:**

- Dashboard loads as home page after login
- Shows cards with key metrics
- Data auto-refreshes or refresh button
- Mobile-responsive layout

**Story Points:** 3

---

### US-9.2: View Monthly Revenue

**As a** school administrator  
**I want to** see monthly fee collection totals  
**So that** I can track revenue trends

**Acceptance Criteria:**

- Shows current month's total collections
- Shows comparison with previous month
- Percentage change (up/down arrow)
- Click through to detailed view (optional)

**Story Points:** 2

---

### US-9.3: View Pending Dues

**As a** school administrator  
**I want to** see total outstanding student dues  
**So that** I can follow up on collections

**Acceptance Criteria:**

- Shows total unpaid amount (sum of amountDue - amountPaid)
- Shows count of students with dues
- Click through to see students with dues

**Story Points:** 2

---

### US-9.4: View Expense Summary

**As a** school administrator  
**I want to** see expense totals  
**So that** I can monitor spending

**Acceptance Criteria:**

- Shows total expenses (current month or configurable period)
- Shows comparison with previous period
- Breakdown by category (pie chart optional)

**Story Points:** 2

---

### US-9.5: View Student Statistics on Dashboard

**As a** school administrator  
**I want to** see student enrollment metrics  
**So that** I can monitor growth

**Acceptance Criteria:**

- Total enrolled students
- Active students count
- New enrollments this month
- Growth percentage

**Story Points:** 2

---

## Epic 10: Security & Access Control

### US-10.1: Role-Based Access

**As a** system administrator  
**I want** users to have role-based permissions  
**So that** data access is appropriately restricted

**Acceptance Criteria:**

- System Admin: full access to all data
- School Admin: full access to own institute
- Staff: limited to student management and payments
- Unauthorized actions return 403 error
- UI hides inaccessible features

**Story Points:** 5

---

### US-10.2: Institute Data Isolation

**As a** school administrator  
**I want** my institute's data to be isolated  
**So that** other institutes cannot access it

**Acceptance Criteria:**

- All queries filter by instituteId
- API returns only own institute data
- Cannot access other institute resources via direct URL
- System admin exemption for oversight

**Story Points:** 5

---

### US-10.3: Secure Password Requirements

**As a** user  
**I want** the system to enforce secure passwords  
**So that** my account is protected

**Acceptance Criteria:**

- Minimum 8 characters for institute registration
- Minimum 6 characters for other users
- Password stored with secure hashing
- No plain text passwords in logs

**Story Points:** 2

---

## Backlog Summary

| Epic                            | Story Count | Total Points |
| ------------------------------- | ----------- | ------------ |
| Authentication & Access Control | 5           | 14           |
| Institute Management            | 4           | 10           |
| User Management                 | 3           | 7            |
| Academic Structure Management   | 5           | 12           |
| Student Management              | 8           | 22           |
| Fee Management                  | 4           | 9            |
| Payment Processing              | 4           | 12           |
| Financial Account Management    | 7           | 17           |
| Dashboard & Analytics           | 5           | 11           |
| Security & Access Control       | 3           | 12           |
| **Total**                       | **48**      | **126**      |

---

## Version History

| Version | Date       | Author    | Changes              |
| ------- | ---------- | --------- | -------------------- |
| 1.0     | 2026-04-02 | Generated | Initial user stories |
