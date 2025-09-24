// posts/posts.11ty.js
function normalizeTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map(t => {
        if (typeof t === "string") return t.trim();
        if (t?.fields?.slug) return String(t.fields.slug).trim();
        if (t?.fields?.title) return String(t.fields.title).trim();
        if (t?.sys?.id) return String(t.sys.id).trim(); // metadata tag id fallback
        return null;
      })
      .filter(Boolean);
  }
  if (typeof raw === "string") return [raw.trim()];
  if (raw?.fields?.slug) return [String(raw.fields.slug).trim()];
  if (raw?.fields?.title) return [String(raw.fields.title).trim()];
  if (raw?.sys?.id) return [String(raw.sys.id).trim()];
  return [];
}

module.exports = class {
  data() {
    return {
      pagination: {
        data: "contentfulPosts", // array from _data/contentfulPosts.js
        size: 1,
        alias: "post",
      },
      permalink: ({ post }) => `/posts/${post.slug}/`,
      layout: "layouts/post.njk",

      // CRUCIAL: static tag so Eleventy includes each page in tag collections
      tags: ["post"],

      eleventyComputed: {
        title: ({ post }) => post.title,
        date: ({ post }) => post.date,
        // user-visible tags + the hidden "post" tag
        tags: ({ post }) => ["post", ...normalizeTags(post.tags)],
        description: ({ post }) => post.description || "",
      },
    };
  }

  render({ post }) {
    return post.content || "";
  }
};
