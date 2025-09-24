const client = require('../lib/contentfulClient');
const { documentToHtmlString } = require('@contentful/rich-text-html-renderer');

module.exports = async () => {
  const res = await client.getEntries({
    content_type: 'page',
    order: 'fields.navigationOrder',
    include: 2,
    limit: 1000
  });

  const pages = res.items
    .filter(item => item.fields?.slug && item.fields.slug !== 'about')
    .map(item => {
      const f = item.fields;
      const date = new Date(item.sys.updatedAt); // stable, defined

      const content = f.content ? documentToHtmlString(f.content) : '';

      const nav =
        f.showInNavigation
          ? { key: f.title, order: f.navigationOrder || 999 }
          : false;

      return {
        title: f.title,
        slug: f.slug,
        description: f.description || '',
        content,
        showInNavigation: Boolean(f.showInNavigation),
        navigationOrder: f.navigationOrder || 999,

        // Eleventy expectations
        date,
        url: `/${f.slug}/`,
        inputPath: `./${f.slug}.md`,
        data: {
          title: f.title,
          description: f.description || '',
          date,
          eleventyNavigation: nav
        },
        eleventyNavigation: nav
      };
    });

  return pages; // ARRAY, not { pages: ... }
};
