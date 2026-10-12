import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
    // Needed to test JSX/TSX
    plugins: [solidPlugin()],

    // Test configuration
    test: {
        // Simulate a browser-like DOM in tests
        environment: "jsdom",

        // Inline dependencies for all tests
        server: {
            deps: {
                inline: ["solid-js", "@solidjs/testing-library"],
            },
        },

        // Apply JSX/TSX compilation to files matching these patterns
        testTransformMode: {
            web: ["**/*.{js,ts,jsx,tsx}"],
        },
        outputFile: {
            junit: "./test-report.xml",
            json: "./test-report.json",
        },

        coverage: {
            reporter: ["cobertura", "text-summary"],
        },
    },
});
