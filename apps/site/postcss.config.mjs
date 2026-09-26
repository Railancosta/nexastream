// The site uses plain CSS (see src/app/globals.css), not Tailwind. Without this
// file Next walks up and picks up the repository-root postcss.config.mjs, which
// loads Tailwind and breaks the site build when the root node_modules is absent.
export default { plugins: {} };
