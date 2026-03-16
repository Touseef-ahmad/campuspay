Product Specification: School Financial Management System (Mini-ERP)

1. App Overview

A multi-tenant, SaaS-based financial management system designed for educational institutes. It manages student enrollments, on-demand fee invoicing, payment tracking, and internal school accounting (expenses and account transfers).

2. Tech Stack

Frontend: Next.js (App Router), React, Tailwind CSS, shadcn/ui, Lucide Icons.

Backend: Next.js Route Handlers (REST API).

Database: PostgreSQL.

ORM: Prisma.

3. User Roles & Authentication

The system uses Role-Based Access Control (RBAC) and supports multi-tenancy.

System Admin (SaaS Owner): institute_id is null. Has global access across all tenant schools.

School Admin (Tenant Owner): Tied to a specific institute_id. Full CRUD access for their school. Approves new staff accounts.

Staff/Accountant: Tied to a specific institute_id. Can manage fees, payments, and expenses. Must be approved by a School Admin before accessing the dashboard (is_approved = true).

4. Core Workflows

On-Demand Fee Application: Admins can create a "Fee Template" (e.g., "Trip Fee - $50") and apply it to individual students or groups at any time, generating a "Student Fee" invoice.

Payment Collection: When a student pays, a Payment Transaction is logged against their specific invoice. The system automatically updates the invoice status (Pending -> Partial -> Paid) and deposits the amount into a specified Financial Account (e.g., "Main Bank").

Internal Accounting: The school can track out-going money by logging Expenses against specific categories and deducting from Financial Accounts. Money can also be moved between accounts via Account Transfers.

5. Database Schema Structure (Prisma Models)

Administration & Security

Institute: id, name, address, createdAt

User: id, instituteId (nullable), roleId, email, passwordHash, isSystemAdmin, isApproved

Role: id, name, permissions

AuditLog: id, userId, action, targetTable, targetId, timestamp

Academics

AcademicTerm: id, instituteId, name, startDate, endDate

Course: id, instituteId, name, code

Student: id, instituteId, firstName, lastName, status

Enrollment: id, studentId, courseId, termId

Fee Engine (Invoicing)

Fee (Template): id, instituteId, name, defaultAmount, type

StudentFee (Invoice): id, studentId, feeId, termId, amountDue, dueDate, status (Pending, Partial, Paid)

Accounting & Cash Flow

FinancialAccount: id, instituteId, name, type (Bank/Cash), balance, isDefault

PaymentTransaction: id, studentFeeId, financialAccountId, amountPaid, date, method

ExpenseCategory: id, instituteId, name

Expense: id, instituteId, financialAccountId, categoryId, amount, date, title

AccountTransfer: id, instituteId, fromAccountId, toAccountId, amount, date

6. UI / UX Page Structure

Public / Auth Routes

/login: User authentication.

/onboarding: Register a new Institute and create the first School Admin account.

/pending-approval: View for staff who have registered but aren't yet approved by their School Admin.

Protected Admin Routes (Requires is_approved = true)

/ (Dashboard): KPI cards (Pending Dues, Collected, Available Funds). Unified transaction feed (Credits/Debits) with date filters.

/students: Searchable data table of students. "Add Student" modal.

/students/[id]: Detailed profile.

Academics Tab: Enrolled courses.

Financials Tab: Ledger of assigned fees, payment history, "Apply Fee" button, "Collect Payment" button.

/courses: Grid of available courses showing enrollment counts.

/accounts: Financial command center. Displays balances for Bank/Petty Cash. Modals for "Record Expense" and "Transfer Funds". List of recent expenses.

7. API Endpoints Map

All protected routes must extract instituteId from the auth token to scope data securely.

Users & Auth

POST /api/auth/login

POST /api/auth/register (Handles both institute creation and staff registration)

PUT /api/users/[id]/approve (School Admin action)

Academics

GET /api/students | POST /api/students

GET /api/courses | POST /api/courses

POST /api/enrollments

Fees & Payments

GET /api/fees | POST /api/fees (Manage Templates)

GET /api/student-fees (List invoices, filter by status)

POST /api/students/[id]/fees (Apply a fee template to a student)

GET /api/students/[id]/statement (Get a student's full financial ledger)

POST /api/student-fees/[id]/payments (Collect payment, update invoice status, credit Financial Account)

Accounting

GET /api/accounts (List accounts and balances)

GET /api/transactions (Unified ledger of payments in and expenses out)

POST /api/expenses (Log an expense, debit Financial Account)

POST /api/transfers (Move money between two Financial Accounts)
