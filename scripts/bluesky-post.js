const { BskyAgent } = require('@atproto/api');
const fs = require('fs');
const path = require('path');

// Configuration
const SITE_URL = 'https://ronnie.fyi';
const MAX_POST_LENGTH = 300; // Bluesky's character limit

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

    // Check for new posts by looking at the latest build
    const newPosts = await detectNewPosts();
    
    if (newPosts.length === 0) {
      console.log('ℹ️ No new posts detected');
      return;
    }

    const successfullyPosted = [];

    // Post each new blog post to Bluesky
    for (const post of newPosts) {
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

async function detectNewPosts() {
  const postsDir = path.join(__dirname, '../posts');
  const postedFile = path.join(__dirname, '../.bluesky-posted.json');
  
  let alreadyPosted = [];
  
  // Read list of already posted files
  if (fs.existsSync(postedFile)) {
    try {
      alreadyPosted = JSON.parse(fs.readFileSync(postedFile, 'utf8'));
    } catch (e) {
      console.log('⚠️ Could not read posted files list, checking all posts');
      alreadyPosted = [];
    }
  }

  // Get all markdown files in posts directory
  if (!fs.existsSync(postsDir)) {
    console.log('❌ Posts directory not found');
    return [];
  }

  const postFiles = fs.readdirSync(postsDir)
    .filter(file => file.endsWith('.md'))
    .filter(file => !alreadyPosted.includes(file)) // Only process files not already posted
    .map(file => {
      const filePath = path.join(postsDir, file);
      return {
        file,
        path: filePath
      };
    });

  console.log(`📋 Found ${postFiles.length} new post(s) to process`);

  // Parse posts to extract metadata
  const newPosts = [];
  for (const postFile of postFiles) {
    try {
      const content = fs.readFileSync(postFile.path, 'utf8');
      const post = parsePostMetadata(content, postFile.file);
      if (post) {
        newPosts.push(post);
      }
    } catch (error) {
      console.error(`⚠️ Could not parse post ${postFile.file}:`, error.message);
    }
  }

  return newPosts;
}

async function markAsPosted(filenames) {
  const postedFile = path.join(__dirname, '../.bluesky-posted.json');
  
  let alreadyPosted = [];
  
  // Read existing posted files list
  if (fs.existsSync(postedFile)) {
    try {
      alreadyPosted = JSON.parse(fs.readFileSync(postedFile, 'utf8'));
    } catch (e) {
      console.log('⚠️ Could not read existing posted files, starting fresh');
      alreadyPosted = [];
    }
  }

  // Add new filenames to the list (avoid duplicates)
  for (const filename of filenames) {
    if (!alreadyPosted.includes(filename)) {
      alreadyPosted.push(filename);
    }
  }

  // Write updated list back to file
  fs.writeFileSync(postedFile, JSON.stringify(alreadyPosted, null, 2));
}

function parsePostMetadata(content, filename) {
  // Extract frontmatter
  const frontmatterMatch = content.match(/^---\n(.*?)\n---/s);
  if (!frontmatterMatch) {
    console.log(`⚠️ No frontmatter found in ${filename}`);
    return null;
  }

  const frontmatter = frontmatterMatch[1];
  
  // Extract title
  const titleMatch = frontmatter.match(/title:\s*(.+)/);
  const title = titleMatch ? titleMatch[1].replace(/['"]/g, '').trim() : filename.replace('.md', '');
  
  // Extract description if available
  const descMatch = frontmatter.match(/description:\s*(.+)/);
  const description = descMatch ? descMatch[1].replace(/['"]/g, '').trim() : '';
  
  // Create URL slug from filename
  const slug = filename.replace('.md', '');
  const url = `${SITE_URL}/posts/${slug}/`;

  return {
    title,
    description,
    url,
    filename
  };
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