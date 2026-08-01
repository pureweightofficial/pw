import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // `out/` is the static export's build output — minified bundles that would
    // otherwise be linted as if they were source.
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'node_modules/**',
      'next-env.d.ts',
      // The keeper panel's vendored CMS bundle: 2.4MB of minified third-party
      // code. Linting it would hang the lint gate — which is the deploy gate.
      'public/**',
    ],
  },
  {
    rules: {
      // R3F JSX uses many lowercase intrinsic elements and prop spreads.
      '@typescript-eslint/no-explicit-any': 'warn',

      /**
       * Enforce the basePath helper rather than trusting authors to remember.
       *
       * `next/image` applies basePath to its optimiser URL but NOT to a raw
       * `src` when `unoptimized: true` — which every static host requires. That
       * gap already shipped the logo pointing at the wrong origin once. A
       * comment asking people to use `assetPath()` is not enforcement; this is.
       */
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'JSXOpeningElement[name.name=/^(Image|img)$/] > JSXAttribute[name.name="src"] > Literal[value=/^\\//]',
          message:
            'Root-relative asset paths must go through assetPath() from @/lib/asset — a raw src is not prefixed with basePath on static exports and will 404 on GitHub Pages.',
        },
      ],
    },
  },
];

export default eslintConfig;
