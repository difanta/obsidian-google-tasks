import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import builtins from "builtin-modules";
import { defineConfig } from "vite";
import typescript from "@rollup/plugin-typescript";

export default defineConfig(({ mode }) => {
	const prod = mode === "production";
	return {
		plugins: [svelte({ preprocess: vitePreprocess() })],
		build: {
			sourcemap: prod ? false : "inline",
			minify: prod,
			watch: !prod,
			emptyOutDir: false,
			outDir: "./",
			lib: {
				name: "GoogleTasksPlugin",
				entry: "src/GoogleTasksPlugin.ts",
				target: "node",
				formats: ["cjs"],
				fileName: (format, entryName) => `main.js`,
			},
			rollupOptions: {
				plugins: [typescript({ tsconfig: "./tsconfig.json" })],
				external: [
					"obsidian",
					"electron",
					"@codemirror/autocomplete",
					"@codemirror/closebrackets",
					"@codemirror/collab",
					"@codemirror/commands",
					"@codemirror/comment",
					"@codemirror/fold",
					"@codemirror/gutter",
					"@codemirror/highlight",
					"@codemirror/history",
					"@codemirror/language",
					"@codemirror/lint",
					"@codemirror/matchbrackets",
					"@codemirror/panel",
					"@codemirror/rangeset",
					"@codemirror/rectangular-selection",
					"@codemirror/search",
					"@codemirror/state",
					"@codemirror/stream-parser",
					"@codemirror/text",
					"@codemirror/tooltip",
					"@codemirror/view",
					...builtins,
				],
				logLevel: "info",
				treeshake: true,
			},
		},
	};
});
