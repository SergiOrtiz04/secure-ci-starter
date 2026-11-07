## What does this PR do?

<!-- One or two sentences. Link the issue if there is one. -->

## How was it tested?

<!-- `npm test`, manual steps, screenshots... -->

## Security checklist

Tick what applies. If a box is not relevant, say why in a short note.

- [ ] **No secrets** in the diff (API keys, tokens, passwords, private keys). The `Secret scan` job is green.
- [ ] **Input is validated** at the boundary (zod schema or equivalent) for any new or changed endpoint.
- [ ] **No new `eval`, `new Function`, `child_process` with user input**, or string-built SQL/shell commands.
- [ ] **Dependencies**: new packages are justified, actively maintained, and the `Dependency review` job is green.
- [ ] **Auth/permissions**: new routes declare who can call them; nothing is exposed "temporarily".
- [ ] **Error handling** does not leak stack traces, file paths or internal messages to clients.
- [ ] **Logging** does not record passwords, tokens or full request bodies.
- [ ] **Rate limiting / size limits** considered for any endpoint that does expensive work or accepts uploads.
- [ ] **Tests** added or updated for the security-relevant behaviour above.

## Notes for the reviewer

<!-- Anything risky, anything you were unsure about, follow-ups. -->
