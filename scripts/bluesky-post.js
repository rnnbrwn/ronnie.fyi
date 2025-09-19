const { BskyAgent } = require('@atproto/api');
const fs = require('fs');
const path = require('path');
const contentful = require('contentful');
const https = require('https');
const http = require('http');

// Configuration
const SITE_URL = 'https://ronnie.fyi';
const MAX_POST_LENGTH = 300; // Bluesky's character limit

// Helper function to validate that a URL is accessible
async function validatePostURL(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.get(url, (res) => {
      // Consider 2xx status codes as success
      const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
      console.log(`🔍 Checking ${url}: ${res.statusCode} (${isSuccess ? '✅' : '❌'})`);
      resolve(isSuccess);
    });
    
    req.on('error', (error) => {
      console.log(`❌ Failed to check ${url}: ${error.message}`);
      resolve(false);
    });
    
    // Set timeout to prevent hanging
    req.setTimeout(10000, () => {
      console.log(`⏰ Timeout checking ${url}`);
      req.destroy();
      resolve(false);
    });
  });
}

async function postToBluesky() {
  try {
    // Initialize Bluesky agent
    const agent = new BskyAgent({
      service: 'https://bsky.social'
    });

    // Login with credentials from environment variables
    if (!process.env.BLUESKY_USERNAME || !process.env.BLUESKY_PASSWORD) {
      console.log('❌ Missing Bluesky credentials in environment variables');
      return;
    }

    await agent.login({
      identifier: process.env.BLUESKY_USERNAME,
      password: process.env.BLUESKY_PASSWORD,
    });

    console.log('✅ Successfully logged into Bluesky');

    // Check for new posts from Contentful
    const contentfulPosts = await detectNewContentfulPosts();
    
    if (contentfulPosts.length === 0) {
      console.log('ℹ️ No new posts detected from Contentful');
      return;
    }

    console.log(`🚀 Processing ${contentfulPosts.length} new Contentful post(s)`);

    const successfullyPosted = [];

    // Post each new blog post to Bluesky
    for (const post of contentfulPosts) {
      // Validate that the post URL is accessible before posting
      console.log(`🔍 Validating URL for "${post.title}": ${post.url}`);
      const isUrlValid = await validatePostURL(post.url);
      
      if (!isUrlValid) {
        console.log(`⚠️ Skipping post "${post.title}" - URL not accessible yet: ${post.url}`);
        continue;
      }
      
      const postData = createBlueskyPost(post);
      
      try {
        await agent.post(postData);
        
        console.log(`✅ Posted to Bluesky: "${post.title}"`);
        successfullyPosted.push(post.filename);
      } catch (error) {
        console.error(`❌ Failed to post "${post.title}" to Bluesky:`, error.message);
      }
    }

    // Update the list of posted files
    if (successfullyPosted.length > 0) {
      await markAsPosted(successfullyPosted);
      console.log(`📝 Marked ${successfullyPosted.length} post(s) as posted to prevent duplicates`);
    }

  } catch (error) {
    console.error('❌ Error with Bluesky integration:', error.message);
    process.exit(1);
  }
}

async function detectNewContentfulPosts() {
  try {
    // Initialize Contentful client
    if (!process.env.CONTENTFUL_SPACE_ID || !process.env.CONTENTFUL_ACCESS_TOKEN) {
      console.log('⚠️ Contentful credentials not found, skipping Contentful posts');
      return [];
    }

    const client = contentful.createClient({
      space: process.env.CONTENTFUL_SPACE_ID,
      accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
    });

    // Fetch blog posts from Contentful
    const entries = await client.getEntries({
      content_type: 'blogPost',
      order: '-sys.createdAt',
    });

    console.log(`📋 Found ${entries.items.length} Contentful post(s) to check`);

    const postedFile = path.join(__dirname, '../.bluesky-posted.json');
    let alreadyPosted = [];
    
    // Read list of already posted items
    if (fs.existsSync(postedFile)) {
      try {
        const postedData = JSON.parse(fs.readFileSync(postedFile, 'utf8'));
        // Handle migration from old tracking format
        if (Array.isArray(postedData)) {
          console.log('🔄 Migrating from old tracking format - starting fresh for Contentful posts');
          alreadyPosted = [];
        } else {
          alreadyPosted = postedData.contentful || [];
        }
      } catch (e) {
        console.log('⚠️ Could not read posted files list, checking all posts');
        alreadyPosted = [];
      }
    }

    // Filter out already posted Contentful posts
    const newContentfulPosts = [];
    for (const item of entries.items) {
      const postId = `contentful-${item.sys.id}`;
      const slug = item.fields.slug;
      
      // Check if already posted
      if (alreadyPosted.includes(postId)) {
        continue;
      }
      
      const post = {
        id: item.sys.id,
        title: item.fields.title,
        slug: item.fields.slug,
        description: item.fields.description || '',
        url: `${SITE_URL}/posts/${item.fields.slug}/`,
        filename: postId,
        source: 'contentful'
      };
      newContentfulPosts.push(post);
    }

    console.log(`📝 Found ${newContentfulPosts.length} new Contentful post(s) to post`);
    
    return newContentfulPosts;

  } catch (error) {
    console.error('❌ Error fetching Contentful posts:', error.message);
    return [];
  }
}

async function markAsPosted(filenames) {
  const postedFile = path.join(__dirname, '../.bluesky-posted.json');
  
  let postedData = { contentful: [] };
  
  // Read existing posted files list
  if (fs.existsSync(postedFile)) {
    try {
      const existingData = JSON.parse(fs.readFileSync(postedFile, 'utf8'));
      
      // Handle migration from old format (array) or old object format to simplified format
      if (Array.isArray(existingData)) {
        console.log('🔄 Migrating tracking file to new simplified format...');
        postedData.contentful = [];
      } else {
        postedData = {
          contentful: existingData.contentful || []
        };
      }
    } catch (e) {
      console.log('⚠️ Could not read existing posted files, starting fresh');
    }
  }

  // Add new filenames to the contentful list (avoid duplicates)
  for (const filename of filenames) {
    if (!postedData.contentful.includes(filename)) {
      postedData.contentful.push(filename);
    }
  }

  // Write updated list back to file
  fs.writeFileSync(postedFile, JSON.stringify(postedData, null, 2));
}

function createBlueskyPost(post) {
  // Create the post text with title and link
  let postText = `📝 New blog post: ${post.title}`;
  
  // Add description if available and space permits
  if (post.description && postText.length + post.description.length + 5 < MAX_POST_LENGTH - post.url.length - 5) {
    postText += `\n\n${post.description}`;
  }
  
  // Add the link indicator  
  postText += `\n\n🔗 `;
  
  // Calculate where the URL starts in the text
  const urlStart = postText.length;
  postText += post.url;
  const urlEnd = postText.length;
  
  // Truncate if too long
  if (postText.length > MAX_POST_LENGTH) {
    const availableLength = MAX_POST_LENGTH - post.url.length - 10; // Space for "\n\n🔗 " and "..."
    postText = postText.substring(0, availableLength) + '...\n\n🔗 ' + post.url;
    // Recalculate URL position after truncation
    const newUrlStart = postText.lastIndexOf(post.url);
    const newUrlEnd = newUrlStart + post.url.length;
    
    return {
      text: postText,
      createdAt: new Date().toISOString(),
      facets: [{
        index: {
          byteStart: Buffer.from(postText.substring(0, newUrlStart)).length,
          byteEnd: Buffer.from(postText.substring(0, newUrlEnd)).length
        },
        features: [{
          $type: 'app.bsky.richtext.facet#link',
          uri: post.url
        }]
      }]
    };
  }

  return {
    text: postText,
    createdAt: new Date().toISOString(),
    facets: [{
      index: {
        byteStart: Buffer.from(postText.substring(0, urlStart)).length,
        byteEnd: Buffer.from(postText.substring(0, urlEnd)).length
      },
      features: [{
        $type: 'app.bsky.richtext.facet#link',
        uri: post.url
      }]
    }]
  };
}

// Run the script
if (require.main === module) {
  postToBluesky().catch(console.error);
}

module.exports = { postToBluesky };