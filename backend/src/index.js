/**
 * DEPRECATED — do not run this entrypoint.
 *
 * This file previously started an in-memory demo backend that:
 *   - fabricated data (random live-viewer counts, placeholder thumbnails),
 *   - returned wallet private keys to clients in /api/auth/register, and
 *   - shadowed the real route handlers defined in ./routes and ./routes/api/*.
 *
 * It has been removed to eliminate those security defects and the duplicate
 * route mounting. The single, real backend entrypoint is ./server.js, which
 * mounts the Sequelize-backed routes through ./routes/index.js.
 *
 * If you require this module, it throws immediately so no fake/leaky server
 * can ever be started by accident.
 */
throw new Error(
  'src/index.js is deprecated and unsafe. Run the real backend with `node src/server.js` instead.'
);
