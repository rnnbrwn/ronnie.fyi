// Load .env locally; Netlify provides env vars in CI so skip there
if (!process.env.NETLIFY) {
  try { require('dotenv').config(); } catch {}
}


const { DateTime } = require("luxon");
const fs = require("fs");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const pluginSyntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginNavigation = require("@11ty/eleventy-navigation");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const renderRichText = require('./lib/renderRichText');

module.exports = function (eleventyConfig) {
  // Plugins
  eleventyConfig.addFilter('richtext', renderRichText);
  eleventyConfig.addNunjucksFilter('richtext', renderRichText);
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(pluginSyntaxHighlight);
  eleventyConfig.addPlugin(pluginNavigation);

  eleventyConfig.setDataDeepMerge(true);
  eleventyConfig.addLayoutAlias("post", "layouts/post.njk");

  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat("dd LLL yyyy");
  });

  // Relative time
  eleventyConfig.addFilter("relativeTime", (dateStr) => {
    const date = DateTime.fromISO(dateStr);
    const now = DateTime.now();
    const diff = now.diff(date, ['hours', 'minutes']).toObject();

    if (diff.hours >= 24) {
      return date.toFormat("dd LLL");
    } else if (diff.hours >= 1) {
      return `${Math.floor(diff.hours)}h ago`;
    } else if (diff.minutes >= 1) {
      return `${Math.floor(diff.minutes)}m ago`;
    } else {
      return 'just now';
    }
  });

  eleventyConfig.addFilter('htmlDateString', (dateObj) => {
    return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat('yyyy-LL-dd');
  });

  eleventyConfig.addFilter("head", (array, n) => {
    if (!Array.isArray(array) || array.length === 0) return [];
    if (n < 0) return array.slice(n);
    return array.slice(0, n);
  });

  eleventyConfig.addFilter("min", (...numbers) => Math.min.apply(null, numbers));

  // normalize once
function normTag(t) { return String(t || "").trim().toLowerCase(); }

eleventyConfig.addFilter("byTag", (items, tag) => {
  const key = normTag(tag);
  return (items || []).filter(i =>
    (i.data.tags || []).some(t => normTag(t) === key)
  );
});

// Map: tag (lowercase) -> array of post items
eleventyConfig.addCollection("postsByTag", (c) => {
  const RESERVED = new Set(["all","nav","post","posts"]);
  const norm = (t) => String(t || "").trim().toLowerCase();

  const map = Object.create(null);
  const items = c.getFilteredByTag("post"); // guaranteed only real post pages

  for (const item of items) {
    const tags = Array.isArray(item.data.tags) ? item.data.tags : [];
    for (const t of tags.map(norm)) {
      if (!t || RESERVED.has(t)) continue;
      (map[t] ||= []).push(item);
    }
  }
  // optional: sort each tag’s posts newest-first
  for (const k of Object.keys(map)) {
    map[k].sort((a, b) => new Date(b.data.date) - new Date(a.data.date));
  }
  return map;
});



  // --------------------------
  // TAG NORMALIZATION & LISTS
  // --------------------------
  const RESERVED = new Set(["all", "nav", "post", "posts"]);

  function normTag(t) {
    return String(t || "").trim().toLowerCase();
  }

  function isRealTag(tag) {
    const k = normTag(tag);
    return k && !RESERVED.has(k);
  }

  function filterTagList(tags) {
    return (Array.isArray(tags) ? tags : [])
      .map(normTag)
      .filter(isRealTag);
  }

  eleventyConfig.addFilter("filterTagList", filterTagList);

  // Unique, filtered, lowercase tag list for pagination/templates
  eleventyConfig.addCollection("tagList", (collectionApi) => {
    const tagSet = new Set();
    collectionApi.getAll().forEach((item) => {
      const tags = Array.isArray(item.data.tags) ? item.data.tags : [];
      tags.forEach((t) => {
        const k = normTag(t);
        if (isRealTag(k)) tagSet.add(k);
      });
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  });

  // Posts collections (sorted)
  eleventyConfig.addCollection("posts", (c) =>
    c.getFilteredByTag("post").sort((a, b) => new Date(a.data.date) - new Date(b.data.date))
  );

  eleventyConfig.addCollection("sortedPosts", (c) =>
    c.getFilteredByTag("post").sort((a, b) => new Date(b.data.date) - new Date(a.data.date))
  );

  // Static assets passthrough
  eleventyConfig.addPassthroughCopy("img");
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy(".well-known");
  // copy fonts and watch for changes
eleventyConfig.addPassthroughCopy({ "fonts": "fonts" });
eleventyConfig.addWatchTarget("fonts");


  // Markdown config
  let markdownLibrary = markdownIt({
    html: true,
    breaks: true,
    linkify: true
  }).use(markdownItAnchor, {
    permalink: markdownItAnchor.permalink.ariaHidden({
      placement: "after",
      class: "direct-link",
      symbol: "#",
      level: [1, 2, 3, 4],
    }),
    slugify: eleventyConfig.getFilter("slug")
  });
  eleventyConfig.setLibrary("md", markdownLibrary);

  // Browsersync
  eleventyConfig.setBrowserSyncConfig({
    files: './_site/css/**/*.css',
    host: "127.0.0.1",
    port: 8080,
    callbacks: {
      ready: function (err, browserSync) {
        const content_404 = fs.readFileSync('_site/404.html');
        browserSync.addMiddleware("*", (req, res) => {
          res.writeHead(404, { "Content-Type": "text/html; charset=UTF-8" });
          res.write(content_404);
          res.end();
        });
      },
    },
    ui: false,
    ghostMode: false
  });

  return {
    templateFormats: ["md", "njk", "html", "liquid", "11ty.js"],
    pathPrefix: "/",
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: false,
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
  };
};
