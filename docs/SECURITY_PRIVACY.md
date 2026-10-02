# Security and Privacy

## Defaults

- useful without an account
- local-first
- no secret keys in the client
- cloud sync optional
- analytics optional
- explicit user confirmation before public race-history records become profile truth
- vendor insight aggregate-only and explicit-opt-in

## Required controls

- release secret scan
- dependency audit
- CSP/security headers
- RLS for exposed user tables
- least-privilege grants
- no service-role secrets in browser code
- input validation
- safe DOM rendering contract
- idempotency for valuable mutations
- export/delete support before broad production
- connected-account revoke/disconnect

## Public repository rule

Never commit:
- personal user data
- private CRM/contact data
- passwords
- private tokens
- health data
- private correspondence

## DOM safety

Prefer:
- `textContent`
- explicit DOM creation
- validated typed templates

Any metadata rendered as HTML must pass a centralized escaping/sanitization contract and adversarial fixture tests.
