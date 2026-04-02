# SFMS (Student Financial Management System) - Smoke Test Plan

## Overview

This document outlines the comprehensive smoke test plan for the Student Financial Management System (SFMS), covering all features with associated user stories and test scenarios.

**Application Type:** Next.js Web Application  
**Purpose:** Multi-tenant financial management system for educational institutes  
**User Roles:** System Admin, School Admin, Staff

---

## Table of Contents

1. [Authentication & Authorization](#1-authentication--authorization)
2. [Institute Management](#2-institute-management)
3. [User Management](#3-user-management)
4. [Academic Management](#4-academic-management)
5. [Student Management](#5-student-management)
6. [Fee Management](#6-fee-management)
7. [Financial Management](#7-financial-management)
8. [Dashboard & Reporting](#8-dashboard--reporting)
9. [End-to-End Scenarios](#9-end-to-end-scenarios)

---

## 1. Authentication & Authorization

### User Stories

| ID       | User Story                                                                                                   | Acceptance Criteria                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-001 | As an institute administrator, I want to register my institute so that I can start managing student finances | - Can submit registration form with institute details<br>- Receives confirmation of pending approval<br>- Cannot access system until approved |
| AUTH-002 | As a staff member, I want to register for an existing institute so that I can help manage student data       | - Can register with institute code/reference<br>- Account marked as pending approval<br>- Sees pending approval page after login              |
| AUTH-003 | As a registered user, I want to log in with my credentials so that I can access the system                   | - Can login with valid email/password<br>- Receives authentication token<br>- Redirected to appropriate dashboard                             |
| AUTH-004 | As a logged-in user, I want to log out so that my session is securely terminated                             | - Session/token is cleared<br>- Redirected to login page<br>- Cannot access protected routes after logout                                     |
| AUTH-005 | As a user, I want invalid login attempts to be rejected so that my account is secure                         | - Invalid credentials show error message<br>- System does not reveal which field is incorrect                                                 |

### Smoke Tests

| Test ID     | Test Case                  | Steps                                                                                                                                    | Expected Result                                                                                     | Priority |
| ----------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------- |
| ST-AUTH-001 | Institute Registration     | 1. Navigate to registration page<br>2. Fill institute details (name, email, password, address)<br>3. Submit form                         | - Success message displayed<br>- Institute created with `isApproved: false`<br>- Admin user created | High     |
| ST-AUTH-002 | Staff Registration         | 1. Navigate to registration page<br>2. Select "Staff" registration type<br>3. Enter details with existing institute ID<br>4. Submit form | - User created with `isApproved: false`<br>- Linked to correct institute                            | High     |
| ST-AUTH-003 | Valid Login                | 1. Navigate to login page<br>2. Enter valid email/password<br>3. Click login                                                             | - JWT token issued<br>- Redirected to dashboard                                                     | High     |
| ST-AUTH-004 | Invalid Login              | 1. Navigate to login page<br>2. Enter invalid credentials<br>3. Click login                                                              | - Error message displayed<br>- No token issued                                                      | High     |
| ST-AUTH-005 | Get Current User           | 1. Login successfully<br>2. Call GET /api/auth/me                                                                                        | - Returns user info<br>- Includes institute details                                                 | Medium   |
| ST-AUTH-006 | Logout                     | 1. Login successfully<br>2. Click logout<br>3. Attempt to access protected page                                                          | - Token cleared<br>- Redirected to login                                                            | High     |
| ST-AUTH-007 | Password Validation        | 1. Try registering with password < 8 chars                                                                                               | - Validation error displayed<br>- Registration fails                                                | Medium   |
| ST-AUTH-008 | Duplicate Email Prevention | 1. Register with email X<br>2. Try registering again with email X                                                                        | - Error: Email already exists                                                                       | Medium   |

---

## 2. Institute Management

### User Stories

| ID       | User Story                                                                                      | Acceptance Criteria                                                                                               |
| -------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| INST-001 | As a system admin, I want to view all registered institutes so that I can manage them           | - See list of all institutes<br>- See approval status<br>- See user count per institute                           |
| INST-002 | As a system admin, I want to approve pending institutes so that they can access the system      | - Can approve with one click<br>- Institute status changes to approved<br>- Institute admin can now access system |
| INST-003 | As a system admin, I want to reject institutes so that invalid registrations are removed        | - Can reject with one click<br>- Institute and related data are deleted<br>- Users are notified (if applicable)   |
| INST-004 | As a system admin, I want to search institutes by name so that I can find specific ones quickly | - Search field filters results<br>- Case-insensitive matching                                                     |

### Smoke Tests

| Test ID     | Test Case                         | Steps                                                                     | Expected Result                                                                         | Priority |
| ----------- | --------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- |
| ST-INST-001 | List Institutes                   | 1. Login as system admin<br>2. Navigate to institutes page                | - All institutes displayed<br>- Shows name, email, status, user count                   | High     |
| ST-INST-002 | Approve Institute                 | 1. Login as system admin<br>2. Find pending institute<br>3. Click approve | - Institute `isApproved` = true<br>- Institute admin can now login and access dashboard | High     |
| ST-INST-003 | Reject Institute                  | 1. Login as system admin<br>2. Find pending institute<br>3. Click reject  | - Institute deleted<br>- Associated users deleted<br>- Associated accounts deleted      | High     |
| ST-INST-004 | Search Institutes                 | 1. Enter search term in search box                                        | - Results filtered by institute name<br>- Case-insensitive                              | Medium   |
| ST-INST-005 | Unapproved Institute Access Block | 1. Login as unapproved institute admin<br>2. Try accessing dashboard      | - Redirected to pending-approval page<br>- Cannot access protected routes               | High     |

---

## 3. User Management

### User Stories

| ID       | User Story                                                                                        | Acceptance Criteria                                                      |
| -------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| USER-001 | As a school admin, I want to view all users in my institute so that I can manage staff            | - See list of institute users<br>- See approval status and roles         |
| USER-002 | As a school admin, I want to approve pending staff members so that they can access the system     | - Can approve staff with one click<br>- User status changes to approved  |
| USER-003 | As a school admin, I want to reject staff registrations so that unauthorized users are removed    | - Can reject with one click<br>- User is deleted from system             |
| USER-004 | As a system admin, I want to approve users from any institute so that I can help with escalations | - Can view all users across institutes<br>- Can approve any pending user |

### Smoke Tests

| Test ID     | Test Case                    | Steps                                                                    | Expected Result                                                               | Priority |
| ----------- | ---------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | -------- |
| ST-USER-001 | List Users (School Admin)    | 1. Login as school admin<br>2. Navigate to users page                    | - Only institute's users shown<br>- Does not show other institute users       | High     |
| ST-USER-002 | Approve User                 | 1. Login as school admin<br>2. Find pending user<br>3. Click approve     | - User `isApproved` = true<br>- User can now access dashboard                 | High     |
| ST-USER-003 | Reject User                  | 1. Login as school admin<br>2. Find pending user<br>3. Click reject      | - User deleted from system                                                    | High     |
| ST-USER-004 | Cannot Reject Self           | 1. Try to reject own user account                                        | - Error: Cannot reject yourself<br>- Operation fails                          | Medium   |
| ST-USER-005 | Cross-Institute Isolation    | 1. Login as Institute A admin<br>2. Try to view/modify Institute B users | - Only Institute A users visible<br>- Cannot modify other institute users     | High     |
| ST-USER-006 | System Admin User Management | 1. Login as system admin<br>2. View users                                | - Can see users from all institutes<br>- Can approve users from any institute | Medium   |

---

## 4. Academic Management

### User Stories

| ID       | User Story                                                                                                | Acceptance Criteria                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| ACAD-001 | As a school admin, I want to create academic terms so that I can organize semesters/sessions              | - Can create term with name and dates<br>- Term appears in dropdown for program offerings               |
| ACAD-002 | As a school admin, I want to create programs so that I can define degree courses                          | - Can create program with code, title, semesters<br>- Program appears for offering creation             |
| ACAD-003 | As a school admin, I want to create program offerings (classes) so that students can enroll               | - Can link program to term and semester<br>- Can set max students<br>- Cannot create duplicate offering |
| ACAD-004 | As a staff member, I want to enroll students in program offerings so that they are registered for classes | - Can select student and class<br>- Enrollment is created<br>- Cannot duplicate enrollment              |

### Smoke Tests

| Test ID     | Test Case                                    | Steps                                                                                                             | Expected Result                                         | Priority |
| ----------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| ST-ACAD-001 | Create Academic Term                         | 1. Navigate to programs page<br>2. Click "Create Semester"<br>3. Enter name, start date, end date<br>4. Submit    | - Term created<br>- Appears in term list                | High     |
| ST-ACAD-002 | List Academic Terms                          | 1. Open term dropdown                                                                                             | - Terms listed<br>- Ordered by start date               | Medium   |
| ST-ACAD-003 | Create Program                               | 1. Navigate to programs page<br>2. Click "Add Program"<br>3. Fill code, title, department, semesters<br>4. Submit | - Program created<br>- Appears in programs list         | High     |
| ST-ACAD-004 | Program Code Uniqueness                      | 1. Create program with code "BSCS"<br>2. Try creating another with same code                                      | - Error: Duplicate code<br>- Second creation fails      | Medium   |
| ST-ACAD-005 | Create Program Offering                      | 1. Select program and term<br>2. Click "Add Class"<br>3. Select semester number and max students<br>4. Submit     | - Program offering created<br>- Shows in offerings list | High     |
| ST-ACAD-006 | Duplicate Offering Prevention                | 1. Create offering for Program A, Term B, Semester 3<br>2. Try creating same combination                          | - Error: Duplicate offering<br>- Creation fails         | Medium   |
| ST-ACAD-007 | Enroll Student in Class                      | 1. Navigate to students<br>2. Select student<br>3. Click enroll<br>4. Select program offering<br>5. Submit        | - Enrollment created<br>- Student linked to class       | High     |
| ST-ACAD-008 | Duplicate Enrollment Prevention              | 1. Enroll student A in class X<br>2. Try enrolling same student in same class                                     | - Error: Already enrolled<br>- Fails                    | Medium   |
| ST-ACAD-009 | View Program Offerings with Enrollment Count | 1. View program offerings list                                                                                    | - Shows enrolled student count<br>- Shows max capacity  | Medium   |

---

## 5. Student Management

### User Stories

| ID      | User Story                                                                                     | Acceptance Criteria                                                                               |
| ------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| STU-001 | As a staff member, I want to create student records so that I can track their academic journey | - Can enter student details<br>- Student ID auto-generated or manual<br>- Student appears in list |
| STU-002 | As a staff member, I want to search students by name so that I can find them quickly           | - Search filters by first/last name<br>- Case-insensitive matching                                |
| STU-003 | As a staff member, I want to view student profile so that I can see their complete information | - See personal details<br>- See enrollments<br>- See financial summary                            |
| STU-004 | As a staff member, I want to edit student information so that records stay current             | - Can update all fields<br>- Can change status (active/suspended/archived)                        |
| STU-005 | As a school admin, I want to view student statistics so that I can monitor enrollment          | - See total students<br>- See active students<br>- See students with dues                         |

### Smoke Tests

| Test ID    | Test Case                     | Steps                                                                                                            | Expected Result                                                                                                | Priority |
| ---------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------- |
| ST-STU-001 | Create Student                | 1. Navigate to students page<br>2. Click "Add Student"<br>3. Fill first name, last name, department<br>4. Submit | - Student created<br>- Unique student ID assigned<br>- Appears in list                                         | High     |
| ST-STU-002 | List Students                 | 1. Navigate to students page                                                                                     | - Students displayed<br>- Shows name, ID, status<br>- Excludes archived students                               | High     |
| ST-STU-003 | Search Students by First Name | 1. Enter first name in search box                                                                                | - Results filtered<br>- Case-insensitive                                                                       | High     |
| ST-STU-004 | Search Students by Last Name  | 1. Enter last name in search box                                                                                 | - Results filtered<br>- Case-insensitive                                                                       | Medium   |
| ST-STU-005 | View Student Profile          | 1. Click on student row<br>2. View student detail page                                                           | - Personal info displayed<br>- Enrollments listed<br>- Financial summary shown                                 | High     |
| ST-STU-006 | Edit Student                  | 1. Navigate to student edit page<br>2. Modify department<br>3. Save                                              | - Changes saved<br>- Updated info displayed                                                                    | High     |
| ST-STU-007 | Change Student Status         | 1. Edit student<br>2. Change status to "suspended"<br>3. Save                                                    | - Status updated<br>- Student still visible                                                                    | Medium   |
| ST-STU-008 | Archive Student               | 1. Edit student<br>2. Change status to "archived"<br>3. Save                                                     | - Status updated<br>- Student hidden from lists                                                                | Medium   |
| ST-STU-009 | Student Statistics            | 1. Call GET /api/students/stats                                                                                  | - Returns total count<br>- Returns active count<br>- Returns students with dues<br>- Returns total dues amount | Medium   |
| ST-STU-010 | View Student Statement        | 1. Navigate to student profile<br>2. View statement                                                              | - Shows all fees<br>- Shows all payments<br>- Shows balance                                                    | High     |

---

## 6. Fee Management

### User Stories

| ID      | User Story                                                                                     | Acceptance Criteria                                                                                  |
| ------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| FEE-001 | As a school admin, I want to create fee types so that I can define tuition, lab fees, etc.     | - Can create fee with name and default amount<br>- Fee appears for assignment                        |
| FEE-002 | As a staff member, I want to assign fees to students so that they know what they owe           | - Can assign one or more fees<br>- Can set due date<br>- Fee tracking begins                         |
| FEE-003 | As a staff member, I want to view student fees so that I can track what's pending              | - See all fees for student<br>- See amount due, paid, balance<br>- See status (pending/partial/paid) |
| FEE-004 | As a staff member, I want to filter fees by status so that I can follow up on pending payments | - Can filter by PENDING<br>- Can filter by PARTIAL<br>- Can filter by PAID                           |

### Smoke Tests

| Test ID    | Test Case                           | Steps                                                                                             | Expected Result                                                         | Priority |
| ---------- | ----------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------- |
| ST-FEE-001 | Create Fee Type                     | 1. Navigate to fee management<br>2. Click "Add Fee"<br>3. Enter name, default amount<br>4. Submit | - Fee created<br>- Appears in fee list                                  | High     |
| ST-FEE-002 | List Fee Types                      | 1. View fees list                                                                                 | - All fees displayed<br>- Shows name and default amount                 | Medium   |
| ST-FEE-003 | Assign Fees During Student Creation | 1. Create student with fees array<br>2. Select multiple fee types<br>3. Submit                    | - Student created<br>- StudentFee records created<br>- Status = PENDING | High     |
| ST-FEE-004 | Assign Fees to Existing Student     | 1. View student profile<br>2. Add fee<br>3. Set amount and due date                               | - StudentFee created<br>- Linked to program offering                    | High     |
| ST-FEE-005 | View Student Fees                   | 1. Navigate to student profile<br>2. View fees section                                            | - All fees listed<br>- Shows due, paid, balance, status                 | High     |
| ST-FEE-006 | Filter Fees by Status               | 1. Call GET /api/student-fees?status=PENDING                                                      | - Only pending fees returned                                            | Medium   |
| ST-FEE-007 | Fee Balance Calculation             | 1. Assign fee of $500<br>2. Record payment of $200<br>3. View fee                                 | - amountDue = 500<br>- amountPaid = 200<br>- Balance = 300              | High     |
| ST-FEE-008 | Fee Status Auto-Update - Partial    | 1. Record partial payment                                                                         | - Status changes to PARTIAL                                             | High     |
| ST-FEE-009 | Fee Status Auto-Update - Paid       | 1. Record full payment                                                                            | - Status changes to PAID                                                | High     |

---

## 7. Financial Management

### User Stories

| ID      | User Story                                                                                        | Acceptance Criteria                                                                   |
| ------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| FIN-001 | As a school admin, I want to create financial accounts so that I can track cash and bank balances | - Can create bank account<br>- Can create cash account<br>- Can set as default        |
| FIN-002 | As a staff member, I want to record student payments so that fees are marked as paid              | - Can record payment amount<br>- Fee balance updates<br>- Account balance increases   |
| FIN-003 | As a school admin, I want to record expenses so that I can track outflows                         | - Can create expense with category<br>- Account balance decreases<br>- Expense logged |
| FIN-004 | As a school admin, I want to transfer funds between accounts so that I can manage cash flow       | - Can transfer from Account A to B<br>- Source decreases<br>- Destination increases   |
| FIN-005 | As a school admin, I want to manage expense categories so that expenses are organized             | - Can create categories<br>- Categories appear in expense form                        |
| FIN-006 | As a staff member, I want to view all transactions so that I can audit financial activity         | - See all payments (credits)<br>- See all expenses (debits)<br>- Filter by date range |

### Smoke Tests

| Test ID    | Test Case                         | Steps                                                                                                  | Expected Result                                                            | Priority |
| ---------- | --------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------- |
| ST-FIN-001 | Create Bank Account               | 1. Navigate to accounts page<br>2. Click "Add Account"<br>3. Select type=Bank, enter name<br>4. Submit | - Account created<br>- Balance = 0                                         | High     |
| ST-FIN-002 | Create Cash Account               | 1. Create account with type=Cash                                                                       | - Cash account created                                                     | High     |
| ST-FIN-003 | Set Default Account               | 1. Create account<br>2. Mark as default                                                                | - Account marked as default<br>- Other defaults unset                      | High     |
| ST-FIN-004 | Record Payment - Full             | 1. Navigate to student<br>2. Click "Add Payment"<br>3. Select fee and enter full amount<br>4. Submit   | - Payment recorded<br>- Fee status = PAID<br>- Account balance increases   | High     |
| ST-FIN-005 | Record Payment - Partial          | 1. Record payment less than due amount                                                                 | - Payment recorded<br>- Fee status = PARTIAL<br>- Balance reflects partial | High     |
| ST-FIN-006 | Record Payment - Multiple Fees    | 1. Select multiple fees<br>2. Distribute payment amount<br>3. Submit via /api/payments/process         | - All fees updated<br>- Single transaction recorded                        | High     |
| ST-FIN-007 | Prevent Overpayment               | 1. Try paying more than remaining balance                                                              | - Error: Cannot exceed balance<br>- Payment rejected                       | High     |
| ST-FIN-008 | Require Default Account           | 1. Remove all default accounts<br>2. Try recording payment                                             | - Error: No default account<br>- Payment fails                             | High     |
| ST-FIN-009 | Create Expense Category           | 1. Create category "Salaries"                                                                          | - Category created<br>- Appears in expense form                            | Medium   |
| ST-FIN-010 | Record Expense                    | 1. Create expense with category and amount<br>2. Select account<br>3. Submit                           | - Expense recorded<br>- Account balance decreases                          | High     |
| ST-FIN-011 | Prevent Expense Exceeding Balance | 1. Try creating expense > account balance                                                              | - Error: Insufficient funds<br>- Expense rejected                          | High     |
| ST-FIN-012 | Transfer Funds                    | 1. Enter amount and select source/destination<br>2. Submit                                             | - Source balance decreases<br>- Destination balance increases              | High     |
| ST-FIN-013 | Prevent Same Account Transfer     | 1. Try transferring to same account                                                                    | - Error: Same account<br>- Transfer rejected                               | Medium   |
| ST-FIN-014 | View Transactions                 | 1. Navigate to transactions<br>2. View list                                                            | - Shows payments and expenses<br>- Shows type, amount, date                | High     |
| ST-FIN-015 | Filter Transactions by Date       | 1. Set from and to date<br>2. Apply filter                                                             | - Only transactions in range shown                                         | Medium   |

---

## 8. Dashboard & Reporting

### User Stories

| ID       | User Story                                                                             | Acceptance Criteria                                                         |
| -------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| DASH-001 | As a school admin, I want to see monthly revenue so that I can track fee collections   | - Shows current month collections<br>- Shows comparison with previous month |
| DASH-002 | As a school admin, I want to see pending dues so that I can follow up on collections   | - Shows total pending amount<br>- Shows number of students with dues        |
| DASH-003 | As a school admin, I want to see expenses summary so that I can track outflows         | - Shows total expenses<br>- Shows by category breakdown                     |
| DASH-004 | As a school admin, I want to see overall financial health so that I can make decisions | - Shows total collected<br>- Shows account balances<br>- Shows net position |

### Smoke Tests

| Test ID     | Test Case                       | Steps                                                    | Expected Result                                                | Priority |
| ----------- | ------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------- | -------- |
| ST-DASH-001 | View Dashboard                  | 1. Navigate to dashboard                                 | - Dashboard loads<br>- Shows all metrics                       | High     |
| ST-DASH-002 | Monthly Revenue Calculation     | 1. Record payments in current month<br>2. View dashboard | - Monthly revenue reflects payments<br>- Correct sum displayed | High     |
| ST-DASH-003 | Revenue Change Indicator        | 1. Compare with previous month                           | - Shows percentage change<br>- Positive/negative indicator     | Medium   |
| ST-DASH-004 | Pending Dues Total              | 1. View dashboard                                        | - Shows sum of all unpaid fees<br>- (amountDue - amountPaid)   | High     |
| ST-DASH-005 | Total Collected                 | 1. View dashboard                                        | - Shows sum of all payments                                    | Medium   |
| ST-DASH-006 | Total Expenses                  | 1. View dashboard                                        | - Shows sum of all expenses                                    | Medium   |
| ST-DASH-007 | Student Statistics on Dashboard | 1. View dashboard                                        | - Shows total students<br>- Shows active students              | Medium   |

---

## 9. End-to-End Scenarios

### Scenario 1: Complete Institute Onboarding & First Payment

**Objective:** Verify complete flow from institute registration to first student payment

| Step | Action                                             | Expected Result                            |
| ---- | -------------------------------------------------- | ------------------------------------------ |
| 1    | Register new institute "ABC University"            | Institute created, pending approval        |
| 2    | System admin approves institute                    | Institute isApproved = true                |
| 3    | Institute admin logs in                            | Redirected to dashboard                    |
| 4    | Create bank account as default                     | Account created with balance 0             |
| 5    | Create fee "Tuition" with amount $5000             | Fee template created                       |
| 6    | Create academic term "Fall 2026"                   | Term created                               |
| 7    | Create program "BSCS" with 8 semesters             | Program created                            |
| 8    | Create program offering for BSCS, Fall 2026, Sem 1 | Class created                              |
| 9    | Create student "John Doe"                          | Student created with unique ID             |
| 10   | Enroll John in BSCS Fall 2026 Sem 1                | Enrollment created                         |
| 11   | Assign Tuition fee to John                         | StudentFee created, status PENDING         |
| 12   | Record payment of $5000                            | Fee status = PAID, account balance = $5000 |
| 13   | View dashboard                                     | Shows $5000 monthly revenue                |

### Scenario 2: Multi-Institute Data Isolation

**Objective:** Verify institutes cannot access each other's data

| Step | Action                                   | Expected Result                   |
| ---- | ---------------------------------------- | --------------------------------- |
| 1    | Create and approve Institute A           | Active institute                  |
| 2    | Create and approve Institute B           | Active institute                  |
| 3    | Create staff in Institute A              | Staff approved                    |
| 4    | Create student in Institute A            | Student created                   |
| 5    | Login as Institute B admin               | Access granted                    |
| 6    | View students                            | Only Institute B students (empty) |
| 7    | Try API call with Institute A student ID | 404 Not Found or 403 Forbidden    |

### Scenario 3: Partial Payment & Fee Status Flow

**Objective:** Verify fee status transitions correctly

| Step | Action                           | Expected Result               |
| ---- | -------------------------------- | ----------------------------- |
| 1    | Create student with $1000 fee    | Fee status = PENDING          |
| 2    | Record payment of $300           | Status = PARTIAL, paid = $300 |
| 3    | Record payment of $400           | Status = PARTIAL, paid = $700 |
| 4    | Record payment of $300           | Status = PAID, paid = $1000   |
| 5    | Try recording additional payment | Error: Already fully paid     |

### Scenario 4: Financial Account Operations

**Objective:** Verify account balance updates correctly

| Step | Action                                 | Expected Result             |
| ---- | -------------------------------------- | --------------------------- |
| 1    | Create Bank Account, initial balance 0 | Balance = $0                |
| 2    | Create Cash Account, initial balance 0 | Balance = $0                |
| 3    | Record student payment $500 to Bank    | Bank balance = $500         |
| 4    | Transfer $200 from Bank to Cash        | Bank = $300, Cash = $200    |
| 5    | Record expense $50 from Cash           | Cash = $150                 |
| 6    | Try expense $400 from Cash             | Error: Insufficient balance |

### Scenario 5: Staff Approval Workflow

**Objective:** Verify staff cannot access system until approved

| Step | Action                                   | Expected Result                     |
| ---- | ---------------------------------------- | ----------------------------------- |
| 1    | Register as staff for approved institute | User created, isApproved = false    |
| 2    | Staff tries to login                     | Login succeeds                      |
| 3    | Staff tries to access dashboard          | Redirected to pending-approval page |
| 4    | School admin approves staff              | Staff isApproved = true             |
| 5    | Staff refreshes / re-accesses dashboard  | Dashboard loads successfully        |

---

## Test Priority Legend

- **High**: Critical functionality, must pass for release
- **Medium**: Important functionality, should pass for quality release
- **Low**: Nice-to-have, can be deferred if needed

---

## Test Execution Checklist

### Pre-Requisites

- [ ] Clean database or test data reset
- [ ] All environment variables configured
- [ ] Application running locally or on test server
- [ ] Test user accounts created (System Admin, School Admin, Staff)

### Authentication & Authorization

- [ ] ST-AUTH-001 through ST-AUTH-008

### Institute Management

- [ ] ST-INST-001 through ST-INST-005

### User Management

- [ ] ST-USER-001 through ST-USER-006

### Academic Management

- [ ] ST-ACAD-001 through ST-ACAD-009

### Student Management

- [ ] ST-STU-001 through ST-STU-010

### Fee Management

- [ ] ST-FEE-001 through ST-FEE-009

### Financial Management

- [ ] ST-FIN-001 through ST-FIN-015

### Dashboard & Reporting

- [ ] ST-DASH-001 through ST-DASH-007

### End-to-End Scenarios

- [ ] Scenario 1: Complete Institute Onboarding
- [ ] Scenario 2: Multi-Institute Isolation
- [ ] Scenario 3: Partial Payment Flow
- [ ] Scenario 4: Financial Account Operations
- [ ] Scenario 5: Staff Approval Workflow

---

## Defect Severity Classification

| Severity | Description                            | Example                                       |
| -------- | -------------------------------------- | --------------------------------------------- |
| Critical | System unusable, data loss             | Login broken, payments corrupt data           |
| High     | Major feature broken, no workaround    | Cannot create students, fee calculation wrong |
| Medium   | Feature impaired but workaround exists | Search not working, must scroll to find       |
| Low      | Minor issue, cosmetic                  | UI alignment, typo                            |

---

## Version History

| Version | Date       | Author    | Changes                 |
| ------- | ---------- | --------- | ----------------------- |
| 1.0     | 2026-04-02 | Generated | Initial smoke test plan |
