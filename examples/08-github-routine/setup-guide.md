# 08 - GitHub Routine Setup Guide

GitHub routines are configured through the Anthropic web UI, not via API. They let Claude respond to GitHub events (PRs opened, pushes, issue comments) by running a routine automatically. This guide walks through setting up a bespoke code review routine that runs your team's checklist on every PR.

## Prerequisites

- A Claude Teams or Enterprise plan (routines are not available on free/pro)
- A GitHub account with admin access to the target repository
- The Anthropic GitHub App installed on your org

## Step 1: Open the Routines Dashboard

Navigate to [claude.ai/code/routines](https://claude.ai/code/routines) and click "Create Routine."

Select "GitHub" as the trigger type.

## Step 2: Connect Your Repository

1. Click "Connect GitHub Repository"
2. If the Anthropic GitHub App is not installed, you will be prompted to install it. Grant access to the specific repos you want (avoid granting access to all repos)
3. Select the repository you want the routine to monitor

## Step 3: Configure Event Types

Choose which GitHub events trigger the routine. Common options:

| Event | When It Fires | Good For |
|-------|---------------|----------|
| Pull request opened | New PR is created | Code review, style checks |
| Pull request synchronized | New commits pushed to a PR | Re-review after changes |
| Push to branch | Direct push to a branch | Main branch monitoring |
| Issue opened | New issue is created | Triage, labeling |
| Issue comment | Someone comments on an issue | Response automation |

For a code review routine, select:
- **Pull request opened**
- **Pull request synchronized** (so the review re-runs when the author pushes fixes)

## Step 4: Set Up PR Filters

Filters let you narrow which PRs trigger the routine. This prevents the routine from running on every single PR.

**Author filter:** Only run for specific authors or exclude bots.
- Include: `*` (all authors)
- Exclude: `dependabot[bot]`, `renovate[bot]`

**Base branch filter:** Only review PRs targeting specific branches.
- Include: `main`, `develop`
- Exclude: `release/*` (skip release branch PRs)

**Label filter:** Only run when specific labels are present.
- Include: `needs-review`
- Or leave empty to run on all PRs

**Path filter:** Only trigger when certain files change.
- Include: `src/**`, `lib/**`
- Exclude: `docs/**`, `*.md`

For a general code review routine, a good starting config:
- Base branch: `main`
- Exclude authors: `dependabot[bot]`
- No label filter (review everything)

## Step 5: Write the Routine Instructions

This is the prompt that tells Claude what to do when a PR triggers the routine. Here is an example for a bespoke code review that runs your team's specific checklist:

```
You are reviewing a pull request. Follow our team's code review checklist exactly.

## Review Checklist

### Security
- [ ] No hardcoded secrets, API keys, or credentials
- [ ] User input is validated and sanitized
- [ ] SQL queries use parameterized statements
- [ ] Authentication/authorization checks are present where needed

### Error Handling
- [ ] All async operations have error handling
- [ ] Error messages do not leak internal details
- [ ] Failed operations clean up resources (connections, file handles)

### Performance
- [ ] No N+1 query patterns
- [ ] Large lists use pagination
- [ ] Expensive computations are cached where appropriate

### Testing
- [ ] New code has corresponding tests
- [ ] Edge cases are covered (empty input, null, boundary values)
- [ ] Tests are deterministic (no flaky timing dependencies)

### Style
- [ ] Function and variable names are descriptive
- [ ] No commented-out code left behind
- [ ] Complex logic has explanatory comments

## Output Format

Post a single PR review comment with:
1. A summary of what the PR does (2-3 sentences)
2. The checklist above with each item marked pass/fail/not-applicable
3. Specific findings with file names and line numbers
4. An overall recommendation: APPROVE, REQUEST_CHANGES, or COMMENT
```

## Step 6: Configure Branch Safety

Routines that write code (not just review) create changes on a branch with a `claude/` prefix. This keeps routine-generated changes separate from human work.

Settings:
- **Branch prefix:** `claude/` (default, recommended)
- **Auto-create PR:** Enable if you want the routine to open PRs for its changes
- **Base branch for new PRs:** `main`

For a review-only routine, you can disable branch creation since the routine just posts comments.

## Step 7: Test the Routine

1. Click "Save" to create the routine
2. Open a test PR in your repository
3. Watch the routine trigger in the Routines dashboard
4. Check the PR for the review comment

If the routine does not trigger:
- Verify the GitHub App has access to the repository
- Check that the PR matches your filters (base branch, author, paths)
- Look at the routine's run history for error messages

## Example: Full Configuration Summary

```
Name:           team-code-review
Trigger:        GitHub - Pull Request
Repository:     your-org/your-repo
Events:         PR opened, PR synchronized
Base branch:    main
Exclude authors: dependabot[bot], renovate[bot]
Path include:   src/**, lib/**, api/**
Path exclude:   *.md, docs/**
Branch prefix:  claude/
Auto-create PR: Disabled (review only)
```

## Differences from API-Triggered Routines

GitHub routines and API-triggered routines both use the same underlying system, but they are configured differently:

| Aspect | GitHub Routine | API-Triggered Routine |
|--------|---------------|----------------------|
| Setup | Web UI at claude.ai/code/routines | API call to /fire endpoint |
| Trigger | GitHub events (automatic) | Your code calls the API |
| Input | PR diff, issue body (automatic) | You provide the text field |
| Auth | GitHub App (OAuth) | API key |
| Best for | CI/CD workflows | Custom integrations, webhooks |

## Tips

- Start with a small, focused routine (just security checks) and expand the checklist over time
- Use path filters aggressively to avoid wasting routine runs on non-code changes
- The routine sees the full PR diff, so it can reference specific lines and files
- Routine runs show up in the dashboard with full logs, so debugging is straightforward
- You can have multiple routines per repo (one for security, one for style, one for tests)
