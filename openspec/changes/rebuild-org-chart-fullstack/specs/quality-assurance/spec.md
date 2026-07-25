## ADDED Requirements

### Requirement: End-to-end tests cover the primary user journeys

The deliverable SHALL include automated end-to-end tests that drive the real UI through the three primary user journeys and assert their observable outcomes: (A) view and export the chart, (B) edit a master record and see it flow through to the chart and change history, and (C) add a concurrent duty and see it appear on the chart.

#### Scenario: Journey A - view and export the chart

- **WHEN** the E2E suite opens the chart screen, toggles Tree ⇄ Network, and triggers "Download PDF"
- **THEN** both views render and the PDF endpoint returns a valid A3-landscape PDF

#### Scenario: Journey B - edit flows to chart and history

- **WHEN** the E2E suite edits an employee's title or department and saves
- **THEN** the chart reflects the change and a new change-history entry appears showing the actor, timestamp, and before/after

#### Scenario: Journey C - add a concurrent duty

- **WHEN** the E2E suite adds a concurrent (兼務) posting for a person in a second department
- **THEN** that department's roster shows the sourced 兼 chip for that person on the chart

### Requirement: Feature tests cover each capability's key behaviors

The deliverable SHALL include feature (API/integration) tests for each capability, exercising both success paths and the defined failure paths.

#### Scenario: Org-chart correctness

- **WHEN** the chart feature test requests the chart data
- **THEN** it asserts the department hierarchy, rank ordering, last-name disambiguation, and `(兼)` placement

#### Scenario: Master maintenance validation

- **WHEN** the maintenance feature test submits an employee referencing a missing department, or a department parent that would form a cycle
- **THEN** the request is rejected with a validation error and nothing is persisted

#### Scenario: Concurrent-duty rule enforcement

- **WHEN** the assignments feature test attempts to give a person a second primary posting
- **THEN** the request is rejected and exactly one primary posting remains

#### Scenario: History is immutable

- **WHEN** the history feature test attempts to edit or delete a change-history entry
- **THEN** no such operation is available and existing entries are unchanged

### Requirement: Domain logic is unit-tested in isolation

The pure `packages/domain` logic SHALL be covered by framework-free unit tests that run without a database or HTTP server.

#### Scenario: Domain rules are verified without infrastructure

- **WHEN** the domain unit tests run
- **THEN** tree build, rank ordering, name disambiguation, title normalization, and concurrent placement are asserted with no DB or framework dependency

### Requirement: The test suite runs deterministically in one command

The full test suite SHALL be runnable via a single command and headless in CI, against deterministic seeded fixtures so results are reproducible.

#### Scenario: One-command, deterministic run

- **WHEN** a maintainer runs the test command (locally or in CI)
- **THEN** unit, feature, and E2E tests execute headless against seeded fixtures and produce the same pass/fail result on every run
