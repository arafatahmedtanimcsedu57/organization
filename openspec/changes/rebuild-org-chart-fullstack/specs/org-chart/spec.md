## ADDED Requirements

### Requirement: Build the department hierarchy

The system SHALL build the department tree from the department master using parent-by-name links, and MUST NOT derive hierarchy from `sys_user.Manager`.

#### Scenario: Tree is built from parent names

- **WHEN** the chart is generated
- **THEN** each department is linked to the department whose name equals its `Parent`
- **AND** the four departments with an empty `Parent` (営業本部, システム事業部, ITサポート事業部, 管理部) are the roots

#### Scenario: A department with an unresolved parent is not lost

- **WHEN** a department's `Parent` matches no department name
- **THEN** the department is placed at the top level and a warning is recorded

### Requirement: Order each department roster by position rank

The system SHALL order the people in each department from highest to lowest position, and SHALL separate managerial titles from staff (`課員`).

#### Scenario: People are ordered by rank

- **WHEN** a department contains people of different titles
- **THEN** they are listed in the order 代表取締役 → 本部長 → 事業部長 → 部長 → 課長 → 担当課長 → 主任 → 主任2 → 課員

#### Scenario: Unknown title is placed last

- **WHEN** a person has a title not in the known rank list
- **THEN** the person is sorted after all known ranks and a warning is recorded

### Requirement: Disambiguate shared last names

The system SHALL display people by last name only, appending a distinguishing suffix when a last name is shared, and SHALL honor manual display overrides.

#### Scenario: Unique last name shows plainly

- **WHEN** a last name is unique across employees
- **THEN** only the last name is shown (e.g. `濱井`)

#### Scenario: Shared last name is disambiguated

- **WHEN** two or more people share a last name (e.g. 佐藤)
- **THEN** the first character of each person's given name is appended in parentheses (`佐藤(悠)` / `佐藤(晃)`)

#### Scenario: Manual override wins

- **WHEN** a person has a configured display override (e.g. a location tag `大西【大阪】`)
- **THEN** the override text is shown instead of the computed name

### Requirement: Show concurrent duties with the 兼務 marker

The system SHALL render a person's concurrent postings in the referenced department prefixed with `(兼)`.

#### Scenario: Concurrent posting is marked

- **WHEN** a person holds a concurrent posting in a department
- **THEN** that department's roster shows the person prefixed with `(兼)` and distinct styling

### Requirement: Provide an interactive chart view

The system SHALL expose the generated chart as structured JSON that the React SPA renders as an interactive, hierarchical view.

#### Scenario: Chart data is served

- **WHEN** the SPA requests the chart
- **THEN** the API returns the department tree with ordered rosters and display names as JSON

### Requirement: Export a printable PDF

The system SHALL export the chart as a print-ready PDF in A3 landscape using a Japanese-capable (UTF-8) rendering.

#### Scenario: PDF export succeeds

- **WHEN** a client requests the chart PDF
- **THEN** the API returns an A3 landscape PDF in which Japanese text renders correctly (no tofu) and `(兼)` entries are visually distinct
