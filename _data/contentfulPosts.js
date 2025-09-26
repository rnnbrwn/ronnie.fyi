// ./_data/contentfulPosts.js
const client = require('../lib/contentfulClient');
const { documentToHtmlString } = require('@contentful/rich-text-html-renderer');


function asDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

function normalizeFieldTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(t => typeof t === 'string' && t.trim());
  if (typeof raw === 'string') return [raw];
  return [];
}

function getMetadataTags(item) {
  // Contentful "Tags" feature → item.metadata.tags = [{ sys: { id: 'tag-id' } }, ...]
  if (!item?.metadata?.tags) return [];
  return item.metadata.tags
    .map(t => t?.sys?.id)
    .filter(Boolean);
}

module.exports = async () => {
  const res = await client.getEntries({
    content_type: 'blogPost',
    order: '-fields.publishDate',
    include: 2,
    limit: 1000
  });

  const posts = res.items
    .filter(item => item?.fields?.slug)
    .map(item => {
      const f = item.fields;

      const fieldTags = normalizeFieldTags(f.tags);
      const metaTags = getMetadataTags(item);
      const tags = Array.from(new Set([...fieldTags, ...metaTags]));

      const date =
        asDate(f.publishDate) ||
        asDate(item.sys?.updatedAt) ||
        new Date();

      return {
        title: f.title,
        slug: f.slug,
        description: f.description || '',
        tags,
        featured: Boolean(f.featured),
        content: f.content || null,
        date,
        url: `/posts/${f.slug}/`,
        inputPath: `./posts/${f.slug}.md`,
        data: {
          title: f.title,
          description: f.description || '',
          date,
          tags
        }
      };
    });

  return posts;
};
