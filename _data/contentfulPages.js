require('dotenv').config();
const contentful = require('contentful');
const { documentToHtmlString } = require('@contentful/rich-text-html-renderer');

// Check for required environment variables
if (!process.env.CONTENTFUL_SPACE_ID || !process.env.CONTENTFUL_ACCESS_TOKEN) {
  console.log('⚠️ Contentful credentials not found - returning empty pages array');
  module.exports = async function() {
    return [];
  };
  return;
}

const client = contentful.createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN
});

module.exports = async function() {
  try {
    console.log('📡 Fetching pages from Contentful...');
    
    const response = await client.getEntries({
      content_type: 'page',
      order: 'fields.navigationOrder' // Order by navigation order
    });
    
    const pages = response.items.map(page => {
      const fields = page.fields;
      
      // Convert rich text to HTML
      const content = documentToHtmlString(fields.content);
      
      return {
        title: fields.title,
        slug: fields.slug,
        description: fields.description || '',
        content: content,
        showInNavigation: fields.showInNavigation || false,
        navigationOrder: fields.navigationOrder || 999,
        // Eleventy expects these for compatibility
        url: `/${fields.slug}/`,
        inputPath: `./${fields.slug}.md`, // Virtual path for compatibility
        data: {
          title: fields.title,
          description: fields.description || '',
          eleventyNavigation: fields.showInNavigation ? {
            key: fields.title,
            order: fields.navigationOrder || 999
          } : null
        }
      };
    });
    
    console.log(`✅ Fetched ${pages.length} pages from Contentful`);
    return pages;
    
  } catch (error) {
    console.error('❌ Error fetching pages from Contentful:', error.message);
    return [];
  }
};