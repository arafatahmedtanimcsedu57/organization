## ADDED Requirements

### Requirement: Import masters into the database

The system SHALL import the provided `sys_user` and `cmn_department` xlsx masters into PostgreSQL as the initial dataset, and the import SHALL be idempotent (re-running it MUST NOT create duplicates).

#### Scenario: First import populates the database

- **WHEN** the import runs against an empty database
- **THEN** every active `sys_user` row is stored as an employee (keyed by `Sys ID`) and every `cmn_department` row is stored as a department (keyed by `ID`)
- **AND** the run reports the counts (20 departments, 4 roots, 95 employees)

#### Scenario: Re-running the import is idempotent

- **WHEN** the import runs a second time
- **THEN** existing rows are updated in place by their stable identifier
- **AND** no duplicate employees or departments are created

### Requirement: Normalize encoding and title formatting on import

The system SHALL normalize data as it is imported so that downstream logic sees consistent values, without modifying the original files in `TryOutProgram/`.

#### Scenario: Full-width title digits are normalized

- **WHEN** an employee has the title `主任２` (full-width ２)
- **THEN** it is stored so it is treated as equal to `主任2` for ranking

#### Scenario: Known mojibake is repaired

- **WHEN** an imported value contains mojibake such as `å¥³` or `ç"·`
- **THEN** it is stored as the correct UTF-8 characters (`女` / `男`)

### Requirement: Seed initial concurrent-duty postings

The system SHALL seed the verifiable concurrent-duty (兼務) rows from the legacy chart whose target department exists in the master.

#### Scenario: Seeded 兼務 rows exist after import

- **WHEN** the import completes
- **THEN** the assignments relation contains the seeded concurrent postings (照沼→購買調達部, 濱井→ソリューション営業部1課1G, 山田→購買調達部) each marked as concurrent

### Requirement: Report data-drift as warnings

The system SHALL surface mismatches between the masters and expected data as non-fatal warnings rather than aborting the import.

#### Scenario: Employee references an unknown department

- **WHEN** an employee's `Department` does not match any department name
- **THEN** the employee is still imported and a warning identifying the unmatched department is recorded

#### Scenario: Import completes despite warnings

- **WHEN** one or more warnings are produced during import
- **THEN** the import still finishes successfully and exposes the list of warnings
