const { DateTime } = require("luxon");
const fs = require("fs");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const pluginSyntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginNavigation = require("@11ty/eleventy-navigation");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");

module.exports = function (eleventyConfig) {
    // Add plugins
    eleventyConfig.addPlugin(pluginRss);
    eleventyConfig.addPlugin(pluginSyntaxHighlight);
    eleventyConfig.addPlugin(pluginNavigation);

    // https://www.11ty.dev/docs/data-deep-merge/
    eleventyConfig.setDataDeepMerge(true);

    // Alias `layout: post` to `layout: layouts/post.njk`
    eleventyConfig.addLayoutAlias("post", "layouts/post.njk");

    eleventyConfig.addFilter("readableDate", dateObj => {
        return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat("dd LLL yyyy");
    });

    // Format timestamp for "last updated" displays
    eleventyConfig.addFilter("relativeTime", dateStr => {
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

    // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
    eleventyConfig.addFilter('htmlDateString', (dateObj) => {
        return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat('yyyy-LL-dd');
    });

    // Get the first `n` elements of a collection.
    eleventyConfig.addFilter("head", (array, n) => {
        if (!Array.isArray(array) || array.length === 0) {
            return [];
        }
        if (n < 0) {
            return array.slice(n);
        }

        return array.slice(0, n);
    });

    // Return the smallest number argument
    eleventyConfig.addFilter("min", (...numbers) => {
        return Math.min.apply(null, numbers);
    });

    function filterTagList(tags) {
        return (tags || []).filter(tag => ["all", "nav", "post", "posts"].indexOf(tag) === -1);
    }

    eleventyConfig.addFilter("filterTagList", filterTagList)

    // Create an array of all tags
    eleventyConfig.addCollection("tagList", function (collection) {
        let tagSet = new Set();
        collection.getAll().forEach(item => {
            (item.data.tags || []).forEach(tag => tagSet.add(tag));
        });

        return filterTagList([...tagSet]);
    });

    // Create posts collection sorted by file creation time
    eleventyConfig.addCollection("posts", function (collection) {
        const fs = require("fs");
        return collection.getFilteredByTag("posts").sort(function (a, b) {
            // Get file creation times (birthtime) or fall back to modification time
            const aTime = fs.statSync(a.inputPath).birthtime || fs.statSync(a.inputPath).mtime;
            const bTime = fs.statSync(b.inputPath).birthtime || fs.statSync(b.inputPath).mtime;
            
            // Sort by creation time (oldest first, so newest end up at the end)
            // This works with head(-6) and | reverse to show newest first
            return aTime - bTime;
        });
    });

    // Add properly sorted posts collection 
    eleventyConfig.addCollection("sortedPosts", function(collectionApi) {
        const posts = collectionApi.getFilteredByTag("post").sort((a, b) => {
            return new Date(b.data.date) - new Date(a.data.date); // Newest first
        });
        console.log(`📝 sortedPosts collection has ${posts.length} posts:`);
        posts.forEach(post => {
            console.log(`  - ${post.data.title} (${post.data.date})`);
        });
        return posts;
    });

    // TEMPORARILY DISABLED - Add Contentful posts collection
    /*
    eleventyConfig.addCollection("contentfulPosts", function(collectionApi) {
        // Access global data through collections
        const allTemplates = collectionApi.getAll();
        if (allTemplates.length > 0 && allTemplates[0].data) {
            const posts = allTemplates[0].data.contentfulPosts || [];
            return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        return [];
    });
    */

    // TEMPORARILY DISABLED - Add combined posts collection (markdown + contentful)
    /*
    eleventyConfig.addCollection("allPosts", function(collectionApi) {
        const markdownPosts = collectionApi.getFilteredByTag("post");
        
        // For now, just return markdown posts while we debug Contentful integration
        console.log(`📝 allPosts collection has ${markdownPosts.length} markdown posts`);
        return markdownPosts.sort((a, b) => {
            const dateA = new Date(a.data?.date || 0);
            const dateB = new Date(b.data?.date || 0);
            return dateB - dateA; // Newest first
        });
    });
    */

    // Copy the `img` and `js` folders to the output (CSS is handled by Sass compilation)
    eleventyConfig.addPassthroughCopy("img");
    eleventyConfig.addPassthroughCopy("js");
    eleventyConfig.addPassthroughCopy(".well-known");

    // Customize Markdown library and settings:
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

    // Override Browsersync defaults (used only with --serve)
    eleventyConfig.setBrowserSyncConfig({
        files: './_site/css/**/*.css',
        host: "127.0.0.1",
        port: 8080,
        callbacks: {
            ready: function (err, browserSync) {
                const content_404 = fs.readFileSync('_site/404.html');

                browserSync.addMiddleware("*", (req, res) => {
                    // Provides the 404 content without redirect.
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
        // Control which files Eleventy will process
        // e.g.: *.md, *.njk, *.html, *.liquid
        templateFormats: [
            "md",
            "njk",
            "html",
            "liquid"
        ],

        // -----------------------------------------------------------------
        // If your site deploys to a subdirectory, change `pathPrefix`.
        // Don’t worry about leading and trailing slashes, we normalize these.

        // If you don’t have a subdirectory, use "" or "/" (they do the same thing)
        // This is only used for link URLs (it does not affect your file structure)
        // Best paired with the `url` filter: https://www.11ty.dev/docs/filters/url/

        // You can also pass this in on the command line using `--pathprefix`

        // Optional (default is shown)
        pathPrefix: "/",
        // -----------------------------------------------------------------

        // Pre-process *.md files with: (default: `liquid`)
        markdownTemplateEngine: "njk",

        // Pre-process *.html files with: (default: `liquid`)
        htmlTemplateEngine: "njk",

        // Opt-out of pre-processing global data JSON files: (default: `liquid`)
        dataTemplateEngine: false,

        // These are all optional (defaults are shown):
        dir: {
            input: ".",
            includes: "_includes",
            data: "_data",
            output: "_site"
        }
    };
};
