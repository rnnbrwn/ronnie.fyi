// lib/renderRichText.js
const { documentToHtmlString } = require('@contentful/rich-text-html-renderer');
const { BLOCKS, INLINES, TEXT } = require('@contentful/rich-text-types');

function escAttr(s='') { return String(s).replace(/"/g, '&quot;'); }

function toYouTubeId(url='') {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    return null;
  } catch { return null; }
}

function renderYouTube(url) {
  const id = toYouTubeId(url);
  if (!id) return null;
  const embed = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
  return `<div class="video-embed" style="aspect-ratio:16/9;">
    <iframe src="${embed}" title="YouTube video" loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen style="width:100%;height:100%;border:0"></iframe>
  </div>`;
}

module.exports = function renderRichText(doc) {
  if (!doc) return '';
  return documentToHtmlString(doc, {
    renderNode: {

// Turn hyperlinks to YouTube into embeds
      [INLINES.HYPERLINK]: (node, next) => {
        const url = node?.data?.uri || '';
        const yt = renderYouTube(url);
        if (yt) return yt;
        // fallback to normal link
        return `<a href="${escAttr(url)}">${next(node.content)}</a>`;
      },

      // If a paragraph is just a bare YouTube URL, embed it
      [BLOCKS.PARAGRAPH]: (node, next) => {
        const only = node.content?.length === 1 ? node.content[0] : null;
        const text = (only && only.nodeType === TEXT) ? only.value.trim() : '';
        const yt = text ? renderYouTube(text) : null;
        if (yt) return yt;
        return `<p>${next(node.content)}</p>`;
      },

      [BLOCKS.EMBEDDED_ASSET]: (node) => {
        const asset = node?.data?.target;
        const file = asset?.fields?.file;
        if (!file?.url) return '';

        const base = file.url.startsWith('http') ? file.url : `https:${file.url}`;
        const alt = asset?.fields?.description || asset?.fields?.title || '';
        const w = file?.details?.image?.width;
        const h = file?.details?.image?.height;

        const src = `${base}?fm=jpg&q=80`;
        const srcsetCandidates = [480, 768, 1024, 1600].filter(sz => !w || sz <= w);
        const srcset = srcsetCandidates.map(sz => `${base}?fm=jpg&q=80&w=${sz} ${sz}w`).join(', ');

        return `<figure class="cf-figure">
  <img class="cf-asset-img" src="${src}" ${srcset ? `srcset="${srcset}" sizes="(min-width: 768px) 65ch, 100vw"` : ''} alt="${escAttr(alt)}"
       ${w ? `width="${w}"` : ''} ${h ? `height="${h}"` : ''} loading="lazy" decoding="async">
   ${alt ? `<figcaption>${alt}</figcaption>` : ''}
 </figure>`;
      },
    },
  });
};
