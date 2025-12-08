# Implementation Plan - Refactor Navigation & Brief

## Goal Description
Move the "Field & Rough-in Requirements" section from the Project Brief (Cover Sheet) to a dedicated application tab called "Rough-in Guide". This improves readability and separates physical installation details from the high-level project overview.

## Proposed Changes

### Components

#### [NEW] [components/RoughInGuide.tsx](file:///home/quagoo/IntegratorPro/components/RoughInGuide.tsx)
- Create a new React component to display the "Field & Rough-in Requirements" table.
- Logic will be extracted from the existing `CoverSheet.tsx`.

#### [MODIFY] [components/CoverSheet.tsx](file:///home/quagoo/IntegratorPro/components/CoverSheet.tsx)
- **Remove:** Section 7 ("Field & Rough-in Requirements").

#### [MODIFY] [App.tsx](file:///home/quagoo/IntegratorPro/App.tsx)
- **Import:** `RoughInGuide` component.
- **Navigation:** Add new sidebar item "Rough-in Guide" (Icon: `Construction` or `Hammer` if available, otherwise `List`).
- **Render:** conditional rendering for `view === 'ROUGH_IN'`.

#### [MODIFY] [types.ts](file:///home/quagoo/IntegratorPro/types.ts)
- **Update:** `ViewMode` type to include `'ROUGH_IN'`.

### Documentation

#### [MODIFY] [adjustments-and-cover-sheet.md](file:///home/quagoo/IntegratorPro/adjustments-and-cover-sheet.md)
- **Remove:** Section 7 to keep the markdown brief in sync with the web app.

## Verification Plan

### Manual Verification
1.  **Check Navigation:** Verify "Rough-in Guide" appears in the sidebar.
2.  **Check Routing:** Click the new tab and verify the table renders correctly.
3.  **Check Brief:** Verify the "Project Brief" tab no longer shows the Rough-in section.
