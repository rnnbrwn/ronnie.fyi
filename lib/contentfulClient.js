// lib/contentfulClient.js
const contentful = require('contentful');

const USE_PREVIEW = process.env.USE_PREVIEW === 'true';

// Space ID (accept either name, but prefer the standard)
const SPACE_ID = process.env.CONTENTFUL_SPACE_ID || process.env.SPACE_ID;

// Delivery token (prod)
const DELIVERY_TOKEN =
  process.env.CONTENTFUL_ACCESS_TOKEN || process.env.DELIVERY_TOKEN;

// Preview token (drafts)
const PREVIEW_TOKEN =
  process.env.CONTENTFUL_PREVIEW_ACCESS_TOKEN || process.env.PREVIEW_TOKEN;

if (!SPACE_ID) {
  throw new Error('Contentful config missing: CONTENTFUL_SPACE_ID');
}

const TOKEN = USE_PREVIEW ? PREVIEW_TOKEN : DELIVERY_TOKEN;

if (!TOKEN) {
  throw new Error(
    USE_PREVIEW
      ? 'Contentful PREVIEW config missing: CONTENTFUL_PREVIEW_ACCESS_TOKEN'
      : 'Contentful DELIVERY config missing: CONTENTFUL_ACCESS_TOKEN'
  );
}

module.exports = contentful.createClient({
  space: SPACE_ID,
  environment: process.env.CONTENTFUL_ENVIRONMENT || 'master',
  accessToken: TOKEN,
  host: USE_PREVIEW ? 'preview.contentful.com' : 'cdn.contentful.com',
});
