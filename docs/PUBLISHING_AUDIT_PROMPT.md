# Publishing audit prompt

A reusable prompt for checking a repository before it goes public. Paste it into a fresh coding session along with the repository path, and treat the output as a checklist rather than a summary.

---

## The prompt

You are auditing a repository before it is published to GitHub. Work only inside the given repository path. Do not modify, commit, or push anything. Report findings only.

Repository path: `<PATH>`

### 1. Code and tests

- Run the test suite exactly as the README documents it. Record the actual command, the actual pass and fail counts, and any failures verbatim. Do not paraphrase a result you did not run.
- Check that every command in the README, in any run or test section, and in the demo script actually works from a clean checkout. Run them.
- Check that the features described in prose exist in the code. For each claim in the README and the submission document, name the file and the function that implements it, or report it as unsupported.
- Look for dead code, commented-out blocks, TODO markers, and functions that are exported but never called.

### 2. Secrets, credentials and personal information

- Scan all tracked files for API keys, tokens, passwords, private keys, connection strings, and `.env` files.
- Check that `.gitignore` covers the runtime artefacts a project like this produces: local stores, dependency directories, logs, environment files.
- Confirm no ignored file is actually tracked. An ignore rule is not a guarantee, so check `git ls-files` against the ignore list.
- Look for personal information: email addresses, phone numbers, postal addresses, real names of clients or staff, and absolute paths that reveal a machine layout.
- If anything sensitive is found, stop and report it before anything else.

### 3. Privacy

- Confirm that all names, cities, employers, quotes and notes in seed data and screenshots are invented.
- Confirm the application labels synthetic data in the interface, not only in the README.
- Confirm no real customer or client data appears in any file, including screenshots and fixtures.

### 4. Screenshots

- Open each screenshot and check that it shows what the surrounding documentation claims.
- Check that no screenshot contains a real email address, a notification with personal content, or a browser chrome element with a personal account name.
- Check that the screenshots still match the current interface. A stale screenshot is a broken claim.
- Report which screenshots you actually inspected and which you could not.

### 5. Git state

- Report the current branch, the full commit history, and `git status`.
- Report whether a remote exists and whether it points at the intended destination.
- Confirm no large binaries, build artefacts, or dependency directories are tracked.
- Confirm the history contains no secret that was later removed. Removing a secret from the working tree does not remove it from history.

### 6. Documentation

- Extract every relative link and every file path referenced in the documentation. Confirm each one exists.
- Confirm the setup instructions work on a machine that has only Node installed.
- Confirm the word counts and section structure of the submission document match the limits that were specified.
- Flag any two documents that both claim to be the final submission.

### 7. Readiness

Report separately:
- Anything that would break for a reader who clones the repository and follows the instructions.
- Any claim in the documentation that the repository does not support.
- Any leftover placeholder, internal note, or TODO that should not be public.

End with a verdict: publish ready, publish after fixes, or not ready, and the exact list of fixes required.

---

## Why this prompt exists

The failure mode it targets is a repository that looks finished and is not: a demo that does not run, a metric described in prose that the code does not compute, a screenshot showing an interface that has since changed, or a file that was forgotten when the ignore rules were written. Each of those is found by running the thing and looking at the thing, not by reading about it.

The instruction not to modify anything matters too. An audit that fixes as it goes stops being an audit, and the person publishing needs to see the full list before deciding what to change.
