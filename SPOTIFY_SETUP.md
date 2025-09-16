# Spotify Integration Setup

This site includes a "Currently Listening To" feature that displays your most recently played track from Spotify on the homepage.

## Setup Instructions

### 1. Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create App"
4. Fill in the app details:
   - App name: `ronnie-fyi` (or whatever you prefer)
   - App description: `Personal website integration`
   - Website: `https://ronnie.fyi` (or your domain)
   - Redirect URI: `https://example.com/callback` (dummy URL - we won't use it)
5. Click "Save"

### 2. Get Your Credentials

1. In your app dashboard, click "Settings"
2. Note down your **Client ID** and **Client Secret**
3. **Skip the Redirect URIs** - we'll use a different method

### 3. Get Your Refresh Token (Easy Method)

The easiest way to get your refresh token is using Spotify's Web API Console:

1. **Go to Spotify Web API Console**
   - Visit: [https://developer.spotify.com/console/get-recently-played/](https://developer.spotify.com/console/get-recently-played/)

2. **Get Token**
   - Click "Get Token" button
   - Select the scope: `user-read-recently-played`
   - Click "Request Token"
   - Authorize your app when prompted

3. **Copy the Refresh Token**
   - In the response, look for the `refresh_token` field
   - Copy this value - you'll need it for your `.env` file

**Alternative: Use the helper script**
```bash
node scripts/get-spotify-token.js
```
This will guide you through the process step by step.

### 4. Set Environment Variables

Create a `.env` file in your project root (make sure to add it to `.gitignore`):

```bash
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REFRESH_TOKEN=your_refresh_token_here
```

### 5. Update Your Current Track

Run the script to fetch and update your current track:

```bash
npm run update-track
```

### 6. Automate Updates (Optional)

You can set up a cron job or GitHub Actions to automatically update your current track periodically:

**Cron job example:**
```bash
# Update every 30 minutes
*/30 * * * * cd /path/to/your/site && npm run update-track
```

**GitHub Actions example:**
```yaml
name: Update Spotify Track
on:
  schedule:
    - cron: '*/30 * * * *'  # Every 30 minutes
  workflow_dispatch:

jobs:
  update-track:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm install
      - name: Update track
        env:
          SPOTIFY_CLIENT_ID: ${{ secrets.SPOTIFY_CLIENT_ID }}
          SPOTIFY_CLIENT_SECRET: ${{ secrets.SPOTIFY_CLIENT_SECRET }}
          SPOTIFY_REFRESH_TOKEN: ${{ secrets.SPOTIFY_REFRESH_TOKEN }}
        run: npm run update-track
      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add _data/current-track.json
          git diff --staged --quiet || git commit -m "Update current track"
          git push
```

## Troubleshooting

- **"Invalid client" error**: Check your Client ID and Client Secret
- **"Invalid refresh token" error**: You may need to re-authorize your app
- **No recent tracks**: Make sure you've played music recently on Spotify
- **API rate limits**: Spotify has rate limits, so don't update too frequently

## Privacy Note

This integration only accesses your recently played tracks and doesn't require any special permissions beyond basic Spotify API access. The data is stored locally in your site's `_data` folder.
