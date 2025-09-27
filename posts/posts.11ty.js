// posts/posts.11ty.js
function normalizeTags(raw) {
  const toVal = (t) => {
    if (typeof t === "string") return t;
    if (t?.fields?.slug) return String(t.fields.slug);
    if (t?.fields?.title) return String(t.fields.title);
    if (t?.sys?.id) return String(t.sys.id);
    return null;
  };

  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .map(toVal)
    .filter(Boolean)
    .map(s => s.trim().toLowerCase());
}

module.exports = class {
  data() {
    return {
      // IMPORTANT: this must be on the root, not inside `pagination`
      addAllPagesToCollections: true,

      pagination: {
        data: "contentfulPosts", // array from _data/contentfulPosts.js
        size: 1,
        alias: "post",
      },

      permalink: ({ post }) => `/posts/${post.slug}/`,
      layout: "layouts/post.njk",

      eleventyComputed: {
        title: ({ post }) => post.title,
        // Ensure Eleventy treats this as a date object if your mapper passed a string
        date: ({ post }) => (post.date ? new Date(post.date) : undefined),

        // Put every page into the 'post' collection, plus its Contentful tags (normalised)
        tags: ({ post }) => ["post", ...normalizeTags(post.tags)],

        description: ({ post }) => post.description || "",
      },
    };
  }

  render({ post }) {
    return post.content || "";
  }
};
