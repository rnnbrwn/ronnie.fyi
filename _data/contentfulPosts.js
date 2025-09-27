// ./_data/contentfulPosts.js
const client = require('../lib/contentfulClient');
const renderRichText = require('../lib/renderRichText');

function asDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Accepts strings OR Contentful refs (fields.slug/title or sys.id)
function normalizeFieldTags(raw) {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];

  const pick = (t) => {
    if (typeof t === 'string') return t;
    if (t?.fields?.slug)  return String(t.fields.slug);
    if (t?.fields?.title) return String(t.fields.title);
    if (t?.sys?.id)       return String(t.sys.id);
    return null;
  };

  return arr
    .map(pick)
    .filter(Boolean)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

// Contentful “Tags” (UI feature): item.metadata.tags = [{ sys: { id } }, ...]
function getMetadataTags(item) {
  if (!item?.metadata?.tags) return [];
  return item.metadata.tags
    .map((t) => t?.sys?.id)
    .filter(Boolean)
    .map((s) => String(s).trim().toLowerCase());
}

module.exports = async () => {
  const res = await client.getEntries({
    content_type: 'blogPost',
    order: '-fields.publishDate',
    include: 2,
    limit: 1000,
  });

  return (res.items || [])
    .filter((item) => item?.fields?.slug)
    .map((item) => {
      const f = item.fields;

      // Merge & dedupe field-level tags and metadata tags
      const tags = Array.from(new Set([
        ...normalizeFieldTags(f.tags),
        ...getMetadataTags(item),
      ]));

      // Prefer explicit publishDate, then sys.updatedAt, then now
      const date =
        asDate(f.publishDate) ||
        asDate(item.sys?.updatedAt) ||
        new Date();

      return {
        title: f.title || '',
        slug: f.slug,
        description: f.description || '',
        tags,                       // lower-cased, trimmed
        featured: !!f.featured,
        content: f.content ? renderRichText(f.content) : '',
        date,                       // Date object
        // no `url`, `inputPath`, or nested `data` — avoid cascade conflicts
      };
    });
};
