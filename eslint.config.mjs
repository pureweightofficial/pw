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
    ignores: ['.next/**', 'out/**', 'build/**', 'node_modules/**', 'next-env.d.ts'],
  },
  {
    rules: {
      // R3F JSX uses many lowercase intrinsic elements and prop spreads.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];

export default eslintConfig;
