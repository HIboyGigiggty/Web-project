import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import {undestructurePlugin} from "babel-plugin-solid-undestructure";
import solidStyledJSXPlugin from "solid-styled-jsx/babel";
import {visualizer} from "rollup-plugin-visualizer";
import eslint from "vite-plugin-eslint";

export default defineConfig(({mode}) => ({
    server: {
        port: 8080,
    },
    plugins: [
        ...undestructurePlugin("ts"),
        solidPlugin({
            babel: {
                browserslistConfigFile: true,
                plugins: [solidStyledJSXPlugin]
            }
        }),
        eslint({
            cache: mode !== "production",
        }),
        ...(mode === "production" ? [
            visualizer({
                filename: "stat.json",
                json: true,
                sourcemap: false,
                gzipSize: true,
                brotliSize: true,
            }),
        ] : [])
    ],
    build: {
        target: "modules",
        polyfillModulePreload: true,
        sourcemap: true,
    },
    clearScreen: false,
}));
