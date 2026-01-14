module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        modules: 'commonjs',
        targets: {
          ie: '11',
        },
      },
    ],
  ],
  plugins: [],
  sourceType: 'unambiguous',
};
