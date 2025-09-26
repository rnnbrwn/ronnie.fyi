// _data/aboutPage.js
const client = require('../lib/contentfulClient');
const renderRichText = require('../lib/renderRichText');

module.exports = async function () {
  try {
    const res = await client.getEntries({
      content_type: 'page',          // change if your type is named differently
      'fields.slug': 'about',        // change if your slug differs
      include: 2,
      limit: 1,
    });

    if (!res.items || res.items.length === 0) {
      return { title: 'About', content: '' };
    }

    const f = res.items[0].fields || {};
    const doc = f.content || f.body || f.bodyRichText || null;

    return {
      title: f.title || 'About',
      slug: f.slug,
      description: f.description || '',
      content: doc ? renderRichText(doc) : '',
    };
  } catch (err) {
    console.warn('aboutPage: failed to fetch:', err.message);
    return { title: 'About', content: '' };
  }
};
