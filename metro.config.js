/**
 * Metro bundler configuration for ToggleTail.
 *
 * Key customisation — crypto shim:
 *   bcryptjs 3.x UMD build does `require("crypto")` at module level.
 *   bcryptjs's own package.json has `"browser": {"crypto": false}`, which tells
 *   Metro to resolve `require("crypto")` to the literal value `false`.  When that
 *   happens, bcryptjs's internal randomBytes() cannot generate a salt, and every
 *   call to bcrypt.hash() rejects with "Invalid string / salt: Not a string".
 *
 *   `resolver.resolveRequest` runs BEFORE Metro processes any package.json
 *   browser-field overrides, so it is the only reliable way to redirect the
 *   `crypto` module to our Hermes-compatible shim.
 *
 *   `extraNodeModules` is kept as a belt-and-suspenders fallback for any
 *   `require('crypto')` calls that come from outside bcryptjs.
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const CRYPTO_SHIM = path.resolve(__dirname, 'src/shims/crypto.js');

// Primary fix: intercept ALL require('crypto') calls before browser-field
// processing overrides them with `false`.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'crypto') {
    return { filePath: CRYPTO_SHIM, type: 'sourceFile' };
  }
  // Fall through to default resolver for everything else.
  return context.resolveRequest(context, moduleName, platform);
};

// Belt-and-suspenders: also map via extraNodeModules.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: CRYPTO_SHIM,
};

module.exports = config;
