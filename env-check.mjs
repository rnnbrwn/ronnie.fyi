import 'dotenv/config';

console.log({
  USE_PREVIEW: process.env.USE_PREVIEW,
  SPACE: process.env.CONTENTFUL_SPACE_ID,
  ENV: process.env.CONTENTFUL_ENVIRONMENT,
  DELIVERY: Boolean(process.env.CONTENTFUL_DELIVERY_TOKEN || process.env.CONTENTFUL_ACCESS_TOKEN),
  PREVIEW: Boolean(process.env.CONTENTFUL_PREVIEW_TOKEN || process.env.CONTENTFUL_PREVIEW_ACCESS_TOKEN),
  HOST: process.env.CONTENTFUL_HOST
});
