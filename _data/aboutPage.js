require('dotenv').config();
const contentful = require('contentful');
const { documentToHtmlString } = require('@contentful/rich-text-html-renderer');
const { BLOCKS } = require('@contentful/rich-text-types');

// Check for required environment variables
if (!process.env.CONTENTFUL_SPACE_ID || !process.env.CONTENTFUL_ACCESS_TOKEN) {
  console.log('⚠️ Contentful credentials not found - returning empty about page data');
  module.exports = async function() {
    return { title: "About Me", content: "<p>About page not available.</p>" };
  };
  return;
}

const client = contentful.createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN
});

module.exports = async function() {
  try {
    console.log('📡 Fetching about page from Contentful...');
    
    const response = await client.getEntries({
      content_type: 'page',
      'fields.slug': 'about'
    });
    
    if (response.items.length > 0) {
      const page = response.items[0];
      const fields = page.fields;
      
      // Convert rich text to HTML
      //const content = documentToHtmlString(fields.content);

    //   const content = documentToHtmlString(fields.content, {
    //     renderNode: {
    //         [BLOCKS.EMBEDDED_ASSET]: (node) => {
    //             const url = node.data.target.fields.file.url;
    //             const alt = node.data.target.fields.title || '';
    //             // Add protocol if missing
    //             const fullUrl = url.startsWith('//') ? 'https:' + url : url;
    //             return `<img src="${fullUrl}" alt="${alt}" />`;
    //         }
    //     }
    // });
      
      console.log(`✅ Fetched about page from Contentful`);
      return {
        title: fields.title,
        slug: fields.slug,
        description: fields.description || '',
        content: content
      };
    } else {
      console.log('⚠️ About page not found in Contentful');
      return {
        title: "About Me",
        content: "<p>About page not found in Contentful.</p>"
      };
    }
    
  } catch (error) {
    console.error('❌ Error fetching about page from Contentful:', error.message);
    return {
      title: "About Me",
      content: "<p>Error loading about page.</p>"
    };
  }
};