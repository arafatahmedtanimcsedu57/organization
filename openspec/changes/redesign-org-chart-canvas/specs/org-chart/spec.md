## MODIFIED Requirements

### Requirement: Export a printable PDF

The system SHALL export the chart as a print-ready PDF in **A4 portrait, scaled fit-to-width**
using a Japanese-capable (UTF-8) rendering, rendering the Top-down layout with every roster
expanded in full.

#### Scenario: PDF export succeeds

- **WHEN** a client requests the chart PDF
- **THEN** the API returns an A4 portrait PDF in which the chart is scaled to fit the page width, Japanese text renders correctly (no tofu), every roster member is included, and `(兼)` / 兼務 entries are visually distinct
