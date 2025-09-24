// posts/posts.11ty.js
function normalizeTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map(t => {
        if (typeof t === "string") return t;                 // string tag
        if (t?.fields?.slug) return t.fields.slug;           // linked entry with slug
        if (t?.fields?.title) return t.fields.title;         // linked entry with title
        if (t?.sys?.id) return t.sys.id;                     // worst-case fallback
        return null;
      })
      .filter(Boolean);
  }
  // single value fallback
  if (typeof raw === "string") return [raw];
  if (raw?.fields?.slug) return [raw.fields.slug];
  if (raw?.fields?.title) return [raw.fields.title];
  return [];
}

module.exports = class {
  data() {
    return {
      pagination: {
        data: "contentfulPosts",
        size: 1,
        alias: "post",
      },
      permalink: ({ post }) => `/posts/${post.slug}/`,
      layout: "layouts/post.njk",
      eleventyComputed: {
        title: ({ post }) => post.title,
        date: ({ post }) => post.date,
        // IMPORTANT: add the visible user tags + the hidden "post" tag for collections
        tags: ({ post }) => {
          const userTags = normalizeTags(post.tags);
          return ["post", ...userTags];
        },
        description: ({ post }) => post.description || ""
      },
    };
  }
  render({ post }) {
    return post.content || "";
  }
};
