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
        data: "contentfulPosts",   // _data/contentfulPosts.js returns an array
        size: 1,
        alias: "post",
      },
      permalink: ({ post }) => `/posts/${post.slug}/`,
      layout: "layouts/post.njk",
      eleventyComputed: {
        title: ({ post }) => post.title,
        date: ({ post }) => post.date,
        // Ensure page joins collections.posts AND exposes visible tags
        tags: ({ post }) => {
          const userTags = normalizeTags(post.tags);
          return ["post", ...userTags];
        },
        description: ({ post }) => post.description || ""
      },
    };
  }
  render({ post }) {
    // Debug to build logs (preview only)
    if (process.env.USE_PREVIEW === "true") {
      const dbg = {
        slug: post.slug,
        rawTags: post.tags,
        normalized: normalizeTags(post.tags)
      };
      console.log("[11ty][preview] generated post page:", JSON.stringify(dbg));
    }
    return post.content || "";
  }
};
