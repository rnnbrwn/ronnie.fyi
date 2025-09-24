// posts/posts.11ty.js
module.exports = class {
  data() {
    return {
      pagination: {
        data: "contentfulPosts",   // matches _data/contentfulPosts.js export (array)
        size: 1,
        alias: "post",
      },
      permalink: ({ post }) => `/posts/${post.slug}/`,
      layout: "layouts/post.njk",
      eleventyComputed: {
        title: ({ post }) => post.title,
        date: ({ post }) => post.date,
        // Add "post" so these pages land in collections.posts (Eleventy Base Blog convention)
        tags: ({ post }) => ["post", ...(post.tags || [])],
        description: ({ post }) => post.description || ""
      },
    };
  }
  render({ post }) {
    // Use the HTML we built from Contentful rich text
    return post.content || "";
  }
};
