## Summary

<!-- Briefly describe the change. -->

## Scope

- [ ] Tutorial
- [ ] Process
- [ ] Repair
- [ ] Archived
- [ ] Navigation
- [ ] Assets or templates
- [ ] CI or tooling
- [ ] Governance docs

## Checklist

- [ ] I updated the relevant sidebar or confirmed no navigation change is needed.
- [ ] I checked internal links and asset paths affected by this PR.
- [ ] I kept historical archived content unchanged unless this PR is explicitly about archive maintenance.
- [ ] I documented follow-up work that is intentionally outside this PR.

## Verification

- [ ] `pnpm run ci:lint`
- [ ] `pnpm test -- --run`
- [ ] `pnpm docs:build`

## Notes

<!-- Add review notes, screenshots, or follow-up context if needed. -->
