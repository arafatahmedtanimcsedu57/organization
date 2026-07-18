## ADDED Requirements

### Requirement: Maintain employees

The system SHALL let a maintainer create, read, update, and deactivate employees through the API and the React admin UI, validating inputs before persisting.

#### Scenario: Create an employee

- **WHEN** a maintainer submits a new employee with the required fields (last name, first name, title, home department)
- **THEN** the employee is stored and appears in the relevant department on the next chart generation

#### Scenario: Update an employee

- **WHEN** a maintainer changes an employee's title or department
- **THEN** the change is persisted and reflected in the chart

#### Scenario: Invalid input is rejected

- **WHEN** a maintainer submits an employee referencing a non-existent department
- **THEN** the request is rejected with a validation error and nothing is persisted

### Requirement: Maintain departments

The system SHALL let a maintainer create, read, update, and deactivate departments, including setting the parent department.

#### Scenario: Create a department under a parent

- **WHEN** a maintainer creates a department and selects an existing parent
- **THEN** the department is stored and rendered under that parent in the tree

#### Scenario: Prevent a cyclic parent

- **WHEN** a maintainer sets a department's parent such that it would create a cycle
- **THEN** the request is rejected with a validation error

### Requirement: Non-destructive deactivation

The system SHALL deactivate rather than hard-delete master records, preserving history and honoring the additive-change constraint.

#### Scenario: Deactivating an employee removes them from the chart but keeps the record

- **WHEN** a maintainer deactivates an employee
- **THEN** the employee no longer appears on the chart
- **AND** the employee record and its history remain queryable
