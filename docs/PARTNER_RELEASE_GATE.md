# Partner release safety gate

Issue: #138. This is **an evidence-completeness gate, not authentication**. It does not protect a URL or asset. A valid file does not replace independent testing, approved review, or deployed authorization. Do not ship based solely on this script.

## Why
The Vercel CLI-deployed Creative Lab and Living Atlas deployments were not traceable to a GitHub commit in deployment metadata on 2026-10-18. Both had Vercel SSO enabled. Never remove SSO to make public signup available until an actual server-side authorization system has passed its own security review.

## Use
Keep the evidence JSON in an authorized private location **outside public repositories**. It must include an exact SHA, an HTTPS preview URL, and a `checks` mapping with each required key mapping to `{"status":"pass","evidence":"private evidence run or URL"}`. Check names live in `tools/partner-release-gate.mjs`.

```sh
node --test web/test/partner-release-gate.test.mjs
node tools/partner-release-gate.mjs /private/path/release-evidence.json
```

The gate fails closed when any result is missing, unsuccessful or undocumented. Passing confirms the supplied evidence file's completeness only; it does not independently substantiate the results.

## Manual deployment checklist
1. Identify canonical deployed code and repository; pin exact source SHA and retain reversible deployment.
2. Server-side signup creates pending membership; email verification alone does not grant permission.
3. Test anonymous/pending/rejected/disabled direct browser, API and media access. Treat publicly hosted GLBs as public irrespective of UI.
4. Test administrator-only approval with audit logs and transactional email delivery.
5. Use preview isolated from production with synthetic test identities and materials.
6. Run desktop/mobile visual, keyboard and loading checks; inspect correct selected rendered frame.
7. Attach actual test logs/captures, peer security review, rollback proof and final owner sign-off.
8. Only promote after successful gates; never copy secrets or customer data into evidence committed to Git.
