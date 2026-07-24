/**
 * Safe SVG optimisation for the character illustrations.
 *
 * These are exported artwork with thousands of paths, so the wins come from
 * stripping editor metadata and cutting coordinate precision — not from
 * restructuring shapes. Anything that could visibly alter the artwork
 * (mergePaths, shape conversion, colour quantisation) stays off.
 */
module.exports = {
  multipass: true,
  // 2dp is well below one device pixel at any size these render at.
  floatPrecision: 2,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // Merging paths can change stacking/fill-rule on complex artwork.
          mergePaths: false,
          // Leave shapes as authored; conversion can shift sub-pixel geometry.
          convertShapeToPath: false,
          convertPathData: { floatPrecision: 2, transformPrecision: 2 },
        },
      },
    },
    // viewBox must survive — without it the artwork cannot scale responsively.
    // In SVGO v4 this plugin sits outside preset-default.
    { name: 'removeViewBox', active: false },
    'removeDimensions',
    'sortAttrs',
  ],
};
