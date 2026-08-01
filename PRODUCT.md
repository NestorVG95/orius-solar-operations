# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are solar field-operation coordinators and warehouse managers who need to register warranty documents, keep equipment accountable, and review operational history. A secondary audience is a portfolio reviewer evaluating the quality of the implementation.

## Product Purpose

Orius Solar Operations is a portfolio-ready reactivation of a legacy tool used to create warranty certificates and organize operational records for solar-panel maintenance and cleaning teams. Success means a visitor can understand the workflows quickly and run a safe, synthetic demonstration without access to company data.

## Positioning

The product connects a warranty document to the operational trail around the job: project, customer site, responsible crew, equipment, and document status. The portfolio build must prove that relationship without exposing real company information.

## Operating Context

The original workflows were built around Google Sheets/Drive, Google Apps Script web apps, generated DOCX/PDF warranty documents, and a small desktop generator. The revived build must work in a free demo mode first, with a clear seam for a future Google Drive or Hostinger-backed adapter.

## Capabilities and Constraints

- Demonstrate warranty creation, inventory visibility, tool traceability, and an activity timeline.
- Use synthetic data only; do not reconnect legacy endpoints or reuse company credentials.
- Prefer a static web deployment compatible with GitHub Pages and low-cost Hostinger hosting.
- Keep external providers optional and behind a server-side adapter; secrets must never be shipped to the browser.
- Preserve the original English operations vocabulary where it helps a US field team, while project documentation is written in Spanish.
- PDF/DOCX generation and persistent multi-user storage remain production integration work, not claims of the static demo.

## Brand Commitments

Keep the Orius Solar name and the recognizable solar mark from the legacy project. The refreshed interface may modernize the visual system but must not imply that it is connected to the former company data.

## Evidence on Hand

- `Proyecto Warranty/Warranty.py` and the three DOCX templates document the original warranty workflow.
- `Proyecto Project Docs/StockOriuSolar/` and the creation forms document the original inventory and vehicle concepts.
- `Proyecto Project Docs/Cambios.txt`, `Notas.txt`, and `URLS.txt` contain backlog notes and old integration references.
- The repository has no package manifest, test suite, or Git history at the time of reactivation.

## Product Principles

1. Prove the workflow with a safe, runnable demo instead of hiding behind screenshots.
2. Make every record traceable to a project, person, place, or asset.
3. Keep provider-specific integrations replaceable and out of the browser.
4. Treat operational clarity and accessibility as part of security.
5. Label synthetic data and unfinished production integrations honestly.

## Accessibility & Inclusion

The web UI must support keyboard navigation, visible focus, semantic form labels, responsive layouts, reduced motion, and contrast suitable for field-office use.
