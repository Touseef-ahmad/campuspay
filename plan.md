This plan outlines the transition of your student management app from a "flat" fee tracker to a **Multi-Term Academic Engine**. This architecture supports multiple institutions, automated promotions, and historical financial integrity.

---

## Phase 1: Schema Enhancements (The Foundation)

To support recurring semesters and graduation, we need to add "Program" logic and "Fee Frequencies" to your existing Prisma schema.

### 1.1 New Models & Enums

- **`Program` Model:** Defines the course of study (e.g., "Diploma in IT"). It stores `totalSemesters` (e.g., 6) so the system knows when a student is finished.
- **`StudentStatus` Enum:** Change the string status to an Enum: `ACTIVE`, `GRADUATED`, `DROPPED`, `ALUMNI`.
- **`FeeFrequency` Enum:** Categorize fees as `ONCE` (Admission), `MONTHLY` (Tuition), or `PER_SEMESTER` (Exam fees).
- **`Student` Updates:** Add `currentSemesterNumber` (Int) and `programId`.

### 1.2 Updated Relationships

- **`Student` ↔ `Program`**: A student belongs to one program.
- **`AcademicTerm` ↔ `Sequence`**: Add a `termSequence` (Int) to `AcademicTerm` to help the UI order semesters (e.g., Fall 2025 is Sequence 1, Spring 2026 is Sequence 2).

---

## Phase 2: The "Term Rollover" Logic (The Backend)

The rollover is a **System Job** that processes students in bulk. It must be wrapped in a **Database Transaction** ($$prisma.\$transaction$$) so that if one step fails, the whole process rolls back to prevent data corruption.

### The "Promotion" Algorithm:

1.  **Filter:** Select all `ACTIVE` students for the specific `instituteId`.
2.  **Graduation Check:**
    - If `student.currentSemesterNumber >= program.totalSemesters`, change status to `GRADUATED`.
    - **Logic Gate:** If the student still has a balance (`amountDue > amountPaid`), flag them as `GRADUATED_WITH_DEBT` to restrict transcript access.
3.  **Calculate Arrears:**
    - For students staying `ACTIVE`, sum all unpaid `StudentFee` records from the _previous_ term.
    - Create a new `StudentFee` in the **New Term** called "Arrears" with the calculated balance.
4.  **Fee Promotion:**
    - Query the `Fee` table for `PER_SEMESTER` and `MONTHLY` fees.
    - Automatically generate these new `StudentFee` records for the student in the **New Term**.
5.  **Increment Progress:** Update `student.currentSemesterNumber += 1`.

---

## Phase 3: The Multi-Step UI (The User Experience)

Since your app is Multi-Institution, the Admin for "School A" needs a safe, guided way to close their semester.

### The "New Semester Wizard"

- **Step 1: Selection:** Admin selects "Close Term: Fall 2025" and "Open Term: Spring 2026."
- **Step 2: Graduation Review:** A list of students who have completed their `totalSemesters`. The Admin can manually override or confirm their graduation.
- **Step 3: Fee Setup:** The Admin reviews which fees will "Auto-Apply" to the next semester (e.g., Tuition: $500, Arrears: Variable).
- **Step 4: Preview/Dry Run:** The system generates a summary: _"You are about to promote 120 students and carry forward $3,500 in unpaid debt. Proceed?"_
- **Step 5: Execution:** A progress bar shows the database updating in real-time.

---

## Phase 4: Financial & Reporting Integrity

By linking every fee to a `termId`, you solve the "Starting Over" problem without losing history.

1.  **The "Live" Ledger:** The main dashboard only shows fees where `termId == CurrentActiveTerm`.
2.  **The "Student Statement":** A full historical view that fetches **all** `StudentFee` and `PaymentTransaction` records across every term the student was enrolled in.
3.  **Income Reports:** You can now generate a "Revenue per Semester" chart, allowing the Institute to compare Spring income vs. Fall income.

---

## Phase 5: Implementation Priority

1.  **Refactor Schema:** Add `Program`, `FeeFrequency`, and `currentSemesterNumber`.
2.  **Seed Data:** Assign existing students to a `Program` and a `currentSemesterNumber`.
3.  **Build the Service:** Write the backend function that handles the "Arrears + Promotion" logic.
4.  **Build the UI Wizard:** Create the multi-step form for the Institute Admins.

---

**Would you like me to generate the actual Prisma code for the `Program` and `Fee` model updates so you can run the migration?**
