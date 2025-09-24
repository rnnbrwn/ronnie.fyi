const client = require('../lib/contentfulClient');
const { documentToHtmlString } = require('@contentful/rich-text-html-renderer');

function asDate(v) {
  // try publishDate, then sys.updatedAt; never return undefined
  if (v) return new Date(v);
  return null;
}

module.exports = async () => {
  const res = await client.getEntries({
    content_type: 'blogPost',
    order: '-fields.publishDate', // most recent first (uses your field)
    include: 2,                   // resolve linked assets/entries if needed
    limit: 1000
  });

  const posts = res.items
    .filter(item => item.fields?.slug) // must have a slug
    .map(item => {
      const f = item.fields;
      const date =
        asDate(f.publishDate) ||
        asDate(item.sys.updatedAt) ||
        new Date(); // absolute fallback to avoid undefined

      return {
        // Core fields you use in templates
        title: f.title,
        slug: f.slug,
        description: f.description || '',
        tags: f.tags || [],
        featured: Boolean(f.featured),

        // Rich text → HTML (optional, remove if you render in template)
        content: f.content ? documentToHtmlString(f.content) : '',

        // Eleventy expectations
        date,
        url: `/posts/${f.slug}/`,
        inputPath: `./posts/${f.slug}.md`, // virtual path for compatibility
        data: {
          title: f.title,
          description: f.description || '',
          date,
          tags: f.tags || []
        }
      };
    });

  return posts; // IMPORTANT: return an ARRAY (not { posts: ... })
};
