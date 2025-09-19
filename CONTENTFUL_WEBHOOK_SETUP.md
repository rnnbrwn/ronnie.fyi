# Contentful Webhook Integration Setup Guide

This guide will help you set up automatic builds when you publish content in Contentful.

## Overview

When you publish a blog post in Contentful, it will automatically trigger a GitHub Action to:
1. Build your site with the new content
2. Deploy to your web host
3. Post to Bluesky (if it's a new post)

## Setup Steps

### Step 1: Create a GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name like "Contentful Webhook Token"
4. Select these scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
5. Click "Generate token"
6. **IMPORTANT**: Copy the token immediately - you won't be able to see it again!

### Step 2: Configure Contentful Webhook

1. In Contentful, go to **Settings → Webhooks**
2. Click **"Add webhook"**
3. Fill out the webhook configuration:

#### Basic Settings:
- **Name**: `GitHub Auto Build`
- **URL**: `https://api.github.com/repos/rnnbrwn/ronnie-fyi/dispatches`
- **Method**: `POST`

#### Headers:
```
Authorization: Bearer YOUR_GITHUB_TOKEN_HERE
Accept: application/vnd.github.v3+json
Content-Type: application/json
User-Agent: Contentful-Webhook
```
*Replace `YOUR_GITHUB_TOKEN_HERE` with the token you created in Step 1*

#### Request Body (JSON):
```json
{
  "event_type": "contentful_publish",
  "client_payload": {
    "entry_id": "{/payload/sys/id}",
    "content_type": "{/payload/sys/contentType/sys/id}",
    "action": "{/payload/sys/type}",
    "space_id": "{/payload/sys/space/sys/id}",
    "entry_title": "{/payload/fields/title/en-US}"
  }
}
```

#### Triggers:
Select these events:
- ✅ **Entry.publish** - When you publish a blog post
- ✅ **Entry.unpublish** - When you unpublish (optional)

#### Content Type Filters (Recommended):
- Select **"blogPost"** to only trigger builds when blog posts change
- This prevents builds for other content changes like pages, etc.

### Step 3: Test the Integration

1. Save the webhook in Contentful
2. Publish a test blog post in Contentful
3. Go to your [GitHub Actions](https://github.com/rnnbrwn/ronnie-fyi/actions) page
4. You should see a new workflow run triggered by "repository_dispatch"
5. Check the logs to see the webhook data being received

### Step 4: Webhook Security (Optional)

For additional security, you can:
1. Add a secret token to verify webhook authenticity
2. Restrict the GitHub token to only this repository
3. Monitor webhook delivery in Contentful's webhook logs

## Troubleshooting

### Webhook Not Triggering
- Check the webhook URL is exactly: `https://api.github.com/repos/rnnbrwn/ronnie-fyi/dispatches`
- Verify your GitHub token has the correct permissions
- Check Contentful's webhook delivery logs for errors

### Build Fails After Webhook
- Check GitHub Actions logs for specific error messages
- Ensure your Contentful content has all required fields
- Verify environment variables are still set correctly

### Webhook Triggers Too Often
- Use content type filters to only trigger on blog posts
- Consider removing "Entry.auto_save" if builds happen too frequently

## Webhook Data Available

The webhook sends this data to your GitHub Action:

```json
{
  "entry_id": "contentful_entry_id",
  "content_type": "blogPost", 
  "action": "Entry.publish",
  "space_id": "your_space_id",
  "entry_title": "Your Blog Post Title"
}
```

You can access this in your workflow with: `${{ github.event.client_payload.entry_id }}`

## Benefits

✅ **Instant Updates**: Your site updates immediately when you publish content
✅ **No Manual Builds**: No need to remember to trigger builds manually  
✅ **Automated Social Posting**: Bluesky posts happen automatically after content is live
✅ **Reliable**: Uses GitHub's robust webhook system