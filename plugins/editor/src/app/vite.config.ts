import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import { viteSingleFile } from 'vite-plugin-singlefile';
import postcssPrefixSelector from 'postcss-prefix-selector';

export default defineConfig({
    plugins: [
        solidPlugin(),
        // Uncomment the line below if you want a single file for the Sphinx extension
        viteSingleFile()
    ],
    css: {
        postcss: {
            plugins: [
                postcssPrefixSelector({
                    prefix: '.extension_name_css',
                }),
            ]
        }
    },
    base: "./",
    server: {
        port: 3000,
    },
    build: {
        target: "esnext",
    },
});
