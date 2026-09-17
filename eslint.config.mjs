import convexPlugin from "@convex-dev/eslint-plugin";
import tseslint from "typescript-eslint";

export default [
  ...convexPlugin.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["convex/_generated/**", "node_modules/**"],
  },
];
