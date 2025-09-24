require('dotenv').config();
const contentful = require('contentful');

const USE_PREVIEW = process.env.USE_PREVIEW === 'true';

const DELIVERY_TOKEN =
  process.env.CONTENTFUL_DELIVERY_TOKEN || process.env.CONTENTFUL_ACCESS_TOKEN;

const PREVIEW_TOKEN =
  process.env.CONTENTFUL_PREVIEW_TOKEN || process.env.CONTENTFUL_PREVIEW_ACCESS_TOKEN;

const required = ['CONTENTFUL_SPACE_ID', ...(USE_PREVIEW ? ['PREVIEW_TOKEN'] : ['DELIVERY_TOKEN'])];
const missing = required.filter(k => (k === 'PREVIEW_TOKEN' ? !PREVIEW_TOKEN : k === 'DELIVERY_TOKEN' ? !DELIVERY_TOKEN : !process.env[k]));
if (missing.length) throw new Error(`Contentful ${USE_PREVIEW ? 'PREVIEW' : 'DELIVERY'} config missing: ${missing.join(', ')}`);

module.exports = contentful.createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  environment: process.env.CONTENTFUL_ENVIRONMENT || 'master',
  accessToken: USE_PREVIEW ? PREVIEW_TOKEN : DELIVERY_TOKEN,
  host: USE_PREVIEW ? 'preview.contentful.com' : 'cdn.contentful.com',
});
