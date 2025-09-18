require('dotenv').config();
const contentful = require('contentful');
const { documentToHtmlString } = require('@contentful/rich-text-html-renderer');

const client = contentful.createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN
});

module.exports = async function() {
  try {
    console.log('📡 Fetching blog posts from Contentful...');
    
    const response = await client.getEntries({
      content_type: 'blogPost',
      order: '-fields.publishDate' // Most recent first
    });
    
    const posts = response.items.map(post => {
      const fields = post.fields;
      
      // Convert rich text to HTML
      const content = documentToHtmlString(fields.content);
      
      return {
        title: fields.title,
        slug: fields.slug,
        description: fields.description,
        date: new Date(fields.publishDate),
        tags: fields.tags || [],
        content: content,
        featured: fields.featured || false,
        // Eleventy expects these for compatibility - using different URL pattern to avoid conflicts
        url: `/contentful-posts/${fields.slug}/`,
        inputPath: `./contentful-posts/${fields.slug}.md`, // Virtual path for compatibility
        data: {
          title: fields.title,
          description: fields.description,
          date: new Date(fields.publishDate),
          tags: fields.tags || []
        }
      };
    });
    
    console.log(`✅ Fetched ${posts.length} blog posts from Contentful`);
    return posts;
    
  } catch (error) {
    console.error('❌ Error fetching blog posts from Contentful:', error.message);
    return [];
  }
};