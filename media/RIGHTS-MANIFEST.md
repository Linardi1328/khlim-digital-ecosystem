# KHLIM public media rights register

This register is a production-release control, not legal proof by itself. A public-facing asset must have a documented ownership, licence or other lawful-use basis before KHLIM publishes it. Identifiable minors also require the appropriate guardian/publication consent where applicable.

## Status values

- `VERIFIED`: evidence has been checked and a reference to that evidence is recorded.
- `REVIEW_REQUIRED`: the file exists, but the repository does not contain enough evidence to certify public-use rights.
- `DO_NOT_PUBLISH`: known rights or consent problem.

## Current assets

| Asset | Intended use | Status | Evidence required before production |
| --- | --- | --- | --- |
| `apps/web/public/khlim-logo.jpg` | KHLIM brand logo | REVIEW_REQUIRED | Confirm KHLIM owns the logo or holds a licence/assignment covering website and promotional use. Record source/creator and evidence location. |
| `apps/web/public/media/khero/khero-meaning.webp` | KHero promotional artwork | REVIEW_REQUIRED | Confirm creator/source and ownership/licence. If any identifiable person appears, record model/guardian/publication consent as applicable. |
| `apps/web/public/media/khero/khero-way.webp` | KHero promotional artwork | REVIEW_REQUIRED | Confirm creator/source and ownership/licence. If any identifiable person appears, record model/guardian/publication consent as applicable. |
| `apps/web/public/media/khero/meet-khero.webp` | KHero promotional artwork | REVIEW_REQUIRED | Confirm creator/source and ownership/licence. If any identifiable person appears, record model/guardian/publication consent as applicable. |
| `apps/web/public/media/khero/coming-soon.webp` | KHero promotional artwork | REVIEW_REQUIRED | Confirm creator/source and ownership/licence. If any identifiable person appears, record model/guardian/publication consent as applicable. |

## Evidence record template

For each asset moved to `VERIFIED`, record:

- exact file path and asset version/hash where practical;
- creator/photographer/designer/source;
- copyright owner;
- basis for use: KHLIM-owned, written assignment, licence, stock licence, public-domain/other lawful basis;
- scope and restrictions of the licence;
- evidence location (contract, invoice, licence receipt, email approval, internal asset record);
- whether identifiable people appear;
- if a minor appears, the guardian/publication consent reference and permitted channels/duration;
- reviewer and review date.

Do not put private consent forms, identity documents or other personal data in this public repository. Store evidence in an approved private business location and reference it here using a non-sensitive internal identifier.

## Publication rule

Editorial content in `apps/web/lib/editorial-content.ts` requires both `factsVerified` and `photoRightsVerified` before a real achievement/player story can enter the published set. KHero promotional images are separately gated by `NEXT_PUBLIC_KHERO_MEDIA_RIGHTS_CONFIRMED=1`; leave that variable unset/false until the four KHero files above are verified.
