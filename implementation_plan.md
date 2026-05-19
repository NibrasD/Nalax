# Data Accuracy Correction Plan

The user has identified specific discrepancies in the "Insights" section. To resolve this, we need to move from "raw data display" to a "cleaned data pipeline."

## User Review Required

> [!IMPORTANT]
> The current `projects.json` contains several duplicates (e.g., encoding errors like "Cryptoconexión" vs "CryptoconexiÃ³n") and test entries. I propose implementing a normalization layer that merges these entries before calculation.

## Proposed Changes

### [Frontend Pipeline]

#### [MODIFY] [App.tsx](file:///c:/Users/User/Downloads/zip%20(2)/src/App.tsx)
- **High-Precision Parsing**: Replace `parseInt` logic with `parseFloat` and strict currency cleaning to capture decimals (addressing the $0.24 discrepancy).
- **Data Normalization Layer**:
    - Implement a `useMemo` that filters the raw `projectsData`.
    - **De-duplication**: Merge projects with identical or near-identical titles (e.g., scf_620 and scf_626).
    - **Validation**: Exclude "Draft" or "Test" projects (like "gemma test 2") and projects with 0 awards.
- **Verification of Targets**:
    - **End-User Application**: Target 37 projects / $3,948,908.00.
    - **Education & Community**: Target 29 projects / $1,712,479.76.

## Verification Plan

### Automated Tests
- I will run a final diagnostic script (Node.js) on the *cleaned* logic to ensure the output matches the user's provided numbers exactly.

### Manual Verification
- The user can verify that the "Insights" numbers now reflect the official Airtable/Gap-Analysis data they possess.
