module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh'],
  overrides: [
    {
      // Vercel serverless functions and build scripts run in Node
      files: ['api/**/*.js', 'scripts/**/*.{js,mjs}', 'vite.config.js'],
      env: { node: true, browser: false },
    },
  ],
  rules: {
    'react/jsx-no-target-blank': 'off',
    // Plain JS project with no PropTypes; props are documented at each component
    'react/prop-types': 'off',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}
