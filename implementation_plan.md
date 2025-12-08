# Implementation Plan - Refine Project Brief

## Goal Description
Refine the `adjustments-and-cover-sheet.md` document to include a soft-toned "Ownership Requirements" section and adjust the "Collaboration Model" to reflect a more ambiguous/flexible workflow, acknowledging the learning curve for KNX.

## User Review Required
> [!IMPORTANT]
> The "Ownership Requirements" section has been rephrased to focus on "Expectations" rather than "Payment Contingency".

> [!NOTE]
> The Collaboration Model now reflects a loose "Joint Effort" approach, specifically for Panel Build and Commissioning, acknowledging that the Owner's involvement is flexible and the Integrator might be learning KNX.

## Proposed Changes

### Documentation

#### [MODIFY] [adjustments-and-cover-sheet.md](file:///home/quagoo/IntegratorPro/adjustments-and-cover-sheet.md)
- **Add Section:** "Ownership & Handoff Expectations" (placed logically, possibly as Section 5 or appended).
    - Content: Define Hardware License, Master Data File, Admin Passwords, and Transferability as standard fixtures/expectations, removing "payment contingent" language.
- **Update Section 4:** "Collaboration Model & Scope of Work".
    - Change "The Owner will contribute" to "The Owner is willing to contribute...".
    - Update the Scope Table:
        - **HV & Panel Build (Physical):** Pro Integrator/Electrician. (Owner prefers to aid with LV/Config, less with physical box build).
        - **LV Wire Pulling & Termination:** Joint Effort (Owner willing to assist).
        - **Device Registration (Bench):** Owner (Willing to handle pre-install registration/labeling).
        - **Commissioning/Programming:** Joint Effort (Owner prefers leading configuration).

- **Global Tone Softening (New Requirement):**
    - **Ownership Section:** Rewrite to remove "Final payment contingent" and "Must be". Use "Owner's goal is..." or "Project expectation is...".
    - **General Scan:** Replace "Requirement:", "Strictly", "Must" with collaborative phrasing like "Key Objective:", "Important for...", "Ideally...".


### Manual Verification
1.  **Read** the updated file content to ensure tone matches user request (non-adversarial, flexible).
2.  **Verify** that all 4 ownership items (Dongle, .knxproj, Passwords, Transferability) are present.
3.  **Verify** that the Collaboration Model accurately reflects the user's hesitation about "Panel Build" and LV wiring.
