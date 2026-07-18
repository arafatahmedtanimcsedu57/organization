## ADDED Requirements

### Requirement: Model postings in a separate assignments relation

The system SHALL represent each person's departmental postings as rows in a dedicated `user_department_assignments` relation, and MUST NOT add secondary-department columns to the employee master.

#### Scenario: A person can hold multiple postings

- **WHEN** a person is assigned to two departments
- **THEN** the assignments relation holds one row per (person, department) posting, each with its own title

#### Scenario: Employee master is not altered for a second post

- **WHEN** a concurrent posting is added
- **THEN** it is stored only in the assignments relation, leaving the employee's single home department unchanged

### Requirement: Distinguish primary from concurrent postings

The system SHALL mark exactly one posting per person as primary (their home), and mark additional postings as concurrent (兼務).

#### Scenario: Exactly one primary posting

- **WHEN** a person's postings are stored
- **THEN** exactly one is flagged `is_primary` and the rest are `assignment_type = concurrent`

#### Scenario: Rejecting a second primary

- **WHEN** a maintainer marks a second posting as primary for the same person
- **THEN** the request is rejected with a validation error

### Requirement: Per-department title on each posting

Each posting SHALL carry the title held in that specific department, which MAY differ from the person's home title.

#### Scenario: Different title per department

- **WHEN** a person is 本部長 in their home department and holds a 部長 concurrent posting elsewhere
- **THEN** each department's roster shows the person with the title held in that department

### Requirement: Manage concurrent postings

The system SHALL let a maintainer create, update, and remove concurrent postings through the API and admin UI, and each change SHALL be recorded in change history.

#### Scenario: Add a concurrent posting

- **WHEN** a maintainer adds a concurrent posting for a person into another department
- **THEN** the person appears in that department on the chart prefixed with `(兼)`
- **AND** the change is recorded in change history

### Requirement: Effective-dating of postings

Each posting SHALL support optional `valid_from` / `valid_to` dates so postings can be opened and closed over time.

#### Scenario: Closing a posting ends its placement

- **WHEN** a posting is given a `valid_to` date in the past
- **THEN** it is treated as inactive and no longer appears on the current chart
