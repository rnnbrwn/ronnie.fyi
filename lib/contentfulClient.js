// lib/contentfulClient.js
require('dotenv').config();
const { createClient } = require('contentful');

const truthy = v => /^(1|true|yes|on)$/i.test(String(v || '').trim());
const space = process.env.CONTENTFUL_SPACE_ID;

if (!space) {
  throw new Error('Contentful config missing: CONTENTFUL_SPACE_ID');
}

const tokens = {
  preview: process.env.CONTENTFUL_PREVIEW_ACCESS_TOKEN,
  delivery: process.env.CONTENTFUL_ACCESS_TOKEN,
};

function decideMode() {
  // Explicit override if you *really* want it (optional; not required).
  if (process.env.USE_PREVIEW !== undefined) {
    return truthy(process.env.USE_PREVIEW) ? 'preview' : 'delivery';
  }

  // Netlify: production/main → Delivery; everything else → Preview
  if (process.env.NETLIFY === 'true') {
    const context = (process.env.CONTEXT || '').toLowerCase(); // production | branch-deploy | deploy-preview
    const branch  = (process.env.BRANCH || process.env.HEAD || '').toLowerCase();
    if (context === 'production' || branch === 'main') return 'delivery';
    return 'preview';
  }

  // Local default: prefer Preview if we have that token; else Delivery.
  if (tokens.preview) return 'preview';
  if (tokens.delivery) return 'delivery';

  // Nothing usable
  return null;
}

let mode = decideMode();
if (!mode) {
  throw new Error('Contentful config missing: set CONTENTFUL_ACCESS_TOKEN or CONTENTFUL_PREVIEW_ACCESS_TOKEN');
}

const host = mode === 'preview' ? 'preview.contentful.com' : 'cdn.contentful.com';
const accessToken = mode === 'preview' ? tokens.preview : tokens.delivery;

if (!accessToken) {
  throw new Error(`Contentful ${mode} token missing. Provide ${mode === 'preview' ? 'CONTENTFUL_PREVIEW_ACCESS_TOKEN' : 'CONTENTFUL_ACCESS_TOKEN'}.`);
}

if (truthy(process.env.DEBUG_BUILD)) {
  console.log(`[contentful] mode=${mode} host=${host} space=${space}`);
}

module.exports = createClient({ space, accessToken, host });
