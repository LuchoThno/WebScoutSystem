/** @type {import('next').NextConfig} */
/** @type {import('next').NextConfig} */
// @ts-check

const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

module.exports = (phase, { defaultConfig }) => {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return {
      reactStrictMode: true,
      /* development only config options here */
    }
  }

  return {
    reactStrictMode: true,
    /* config options for all phases except development here */
  }
}
