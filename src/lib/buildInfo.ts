// Build info is injected via next.config.ts env vars at build time

export const buildInfo = {
  commitHash: process.env.NEXT_PUBLIC_BUILD_ID || 'dev',
  buildDate: process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString(),
};
