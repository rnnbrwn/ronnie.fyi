Run the Bluesky digest generator locally for ronnie.fyi.

This fetches Ronnie's recent Bluesky posts (last 7 days) via the public AT Proto API and writes a digest note to `src/data/notes/`.

## Steps

1. Run the script:
```bash
node scripts/generate-bsky-digest.mjs
```

2. Report the output:
   - If a digest was written, show the filename and note that it won't be live until committed and deployed
   - If no posts were found in the last 7 days, say so
   - If there was an error, show it

3. If a digest was written, ask: "Commit and push this now?" If yes, run:
```bash
git add src/data/notes/
git commit -m "chore: add Bluesky digest $(date -u +%Y-%m-%d)"
git push
```

Note: The automated digest runs every Friday at 08:00 UTC via `.github/workflows/bsky-digest.yml`. Use this command to run it manually outside that schedule.
