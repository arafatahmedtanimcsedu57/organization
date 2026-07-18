## ADDED Requirements

### Requirement: Record every master change

The system SHALL append a change-history entry for every create, update, and deactivate performed on employees, departments, and concurrent-duty assignments, capturing the actor, timestamp, action, and the before/after state.

#### Scenario: An update is logged

- **WHEN** a maintainer updates an employee's title
- **THEN** a change-history entry is created recording the entity, the actor, the timestamp, the previous value, and the new value

#### Scenario: A create is logged

- **WHEN** a maintainer creates a department
- **THEN** a change-history entry with action `create` and the new state is recorded

#### Scenario: A deactivate is logged

- **WHEN** a maintainer deactivates an employee
- **THEN** a change-history entry with action `deactivate` is recorded

### Requirement: History is append-only

The change-history log MUST be immutable; the system SHALL NOT expose any operation to edit or delete existing history entries.

#### Scenario: No edit path exists

- **WHEN** any client attempts to modify or delete a change-history entry
- **THEN** the operation is not available and existing entries remain unchanged

### Requirement: Browse change history

The system SHALL let a maintainer view the change history in the UI, filtered by entity and time.

#### Scenario: View history for one employee

- **WHEN** a maintainer opens the history for a specific employee
- **THEN** the UI lists that employee's changes in reverse-chronological order with actor, timestamp, and what changed
