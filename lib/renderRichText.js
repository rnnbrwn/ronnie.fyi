// lib/renderRichText.js
const { documentToHtmlString } = require('@contentful/rich-text-html-renderer');
const { BLOCKS } = require('@contentful/rich-text-types');

function escAttr(s='') { return String(s).replace(/"/g, '&quot;'); }

module.exports = function renderRichText(doc) {
  if (!doc) return '';
  return documentToHtmlString(doc, {
    renderNode: {
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

        return `<figure>
  <img src="${src}" ${srcset ? `srcset="${srcset}" sizes="(min-width: 768px) 768px, 100vw"` : ''} alt="${escAttr(alt)}"
       ${w ? `width="${w}"` : ''} ${h ? `height="${h}"` : ''} loading="lazy" decoding="async">
  ${alt ? `<figcaption>${alt}</figcaption>` : ''}
</figure>`;
      },
    },
  });
};
