---
description: Merge the current feature branch into master (or a given branch), no-ff, then clean up
argument-hint: "[target-branch] (defaults to master)"
allowed-tools: Read, Bash(git status:*), Bash(git branch:*), Bash(git switch:*), Bash(git checkout:*), Bash(git push:*), Bash(git merge:*)
---

You are closing out a finished feature branch, following the "Workflow — branch, merge, clean up" section of CLAUDE.md.

User input (optional target branch): $ARGUMENTS

## Step 1. Determine the target branch

If `$ARGUMENTS` is non-empty, use it as `target_branch`. Otherwise default `target_branch` to `master`.

## Step 2. Safety checks

- Run `git status`. Abort and tell the user if there are uncommitted, unstaged, or untracked files — they must commit or stash first.
- Determine the current branch (`feature_branch`). Abort if `feature_branch` is already equal to `target_branch` — there is nothing to merge.
- Abort if `feature_branch` is not ahead of `target_branch` (nothing to merge).

## Step 3. Push the feature branch

Push `feature_branch` to `origin`, setting upstream if it isn't already tracked.

## Step 4. Merge into target branch

- Switch to `target_branch` and make sure it's up to date with `origin/<target_branch>` (pull if needed).
- Merge `feature_branch` into `target_branch` with `--no-ff`, using the commit message format from CLAUDE.md: `merge: <feature_branch> into <target_branch>`.
- Push `target_branch` to `origin`.

## Step 5. Clean up the feature branch

- Delete the local `feature_branch` (`git branch -d`).
- Delete the remote `feature_branch` (`git push origin --delete <feature_branch>`).

## Step 6. Report

Print a short summary in this exact format:

Merged: <feature_branch> -> <target_branch>
Deleted: <feature_branch> (local + remote)

Do not perform any other git operations (no rebasing, no force-push, no amending). If any step fails (e.g. merge conflict, branch not fully merged), stop immediately and report the failure to the user instead of forcing it through.
