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

**GitHub Actions (Recommended):**
The workflow file has been created at `.github/workflows/update-spotify-track.yml`. Here's how to set it up:

1. **Push your code to GitHub** (including the workflow file)
2. **Go to your repository settings** → Secrets and variables → Actions
3. **Add these secrets:**
   - `SPOTIFY_CLIENT_ID`: Your Spotify Client ID
   - `SPOTIFY_CLIENT_SECRET`: Your Spotify Client Secret  
   - `SPOTIFY_REFRESH_TOKEN`: Your Spotify Refresh Token
4. **Enable GitHub Actions** in your repository settings
5. **The workflow will run every 10 minutes** automatically

**Manual trigger:** You can also run it manually from the Actions tab in your GitHub repository.

## Troubleshooting

- **"Invalid client" error**: Check your Client ID and Client Secret
- **"Invalid refresh token" error**: You may need to re-authorize your app
- **No recent tracks**: Make sure you've played music recently on Spotify
- **API rate limits**: Spotify has rate limits, so don't update too frequently

## Privacy Note

This integration only accesses your recently played tracks and doesn't require any special permissions beyond basic Spotify API access. The data is stored locally in your site's `_data` folder.
