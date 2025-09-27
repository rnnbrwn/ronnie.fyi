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
  return arr.map(toVal).filter(Boolean).map((s) => s.trim().toLowerCase());
}

module.exports = class {
  data() {
    return {
      // Some Eleventy versions look here
      addAllPagesToCollections: true,

      pagination: {
        data: "contentfulPosts",
        size: 1,
        alias: "post",
        // …and some only respect it here (set both)
        addAllPagesToCollections: true,
      },

      permalink: ({ post }) =>
        `/posts/${encodeURIComponent(post?.slug || "untitled")}/`,
      layout: "layouts/post.njk",

      eleventyComputed: {
        title: ({ post }) => post?.title || "",
        date:  ({ post }) => (post?.date ? new Date(post.date) : undefined),
        tags:  ({ post }) => ["post", ...normalizeTags(post?.tags)],
        description: ({ post }) => post?.description || "",
      },
    };
  }

  render({ post }) {
    return post?.content || "";
  }
};
