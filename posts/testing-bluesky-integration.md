---
title: Testing Bluesky Integration
description: A test post to verify that new blog posts automatically appear on Bluesky
date: 2025-09-17
tags:
  - test
  - bluesky
  - automation
layout: layouts/post.njk
---

This is a test post to verify that the Bluesky integration is working correctly! 🦋

When this post is published, it should automatically create a post on Bluesky that looks something like:

```
📝 New blog post: Testing Bluesky Integration

A test post to verify that new blog posts automatically appear on Bluesky

🔗 https://ronnie.fyi/posts/testing-bluesky-integration/
```

If you're seeing this on Bluesky, then the automation is working perfectly! 🎉

## How it works

The integration:
1. Detects when new markdown files are added to the `/posts` directory
2. Extracts the title and description from the frontmatter
3. Creates a formatted Bluesky post with the title, description, and link
4. Posts it automatically via GitHub Actions

Pretty neat, right?

---

*This is a test post and can be deleted once the integration is confirmed to be working.*