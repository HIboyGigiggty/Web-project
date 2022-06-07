import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import {undestructurePlugin} from "babel-plugin-solid-undestructure";
import {visualizer} from "rollup-plugin-visualizer";
import eslint from "vite-plugin-eslint";
import solidStyledPlugin from "babel-plugin-solid-styled";

export default defineConfig(({mode}) => ({
    server: {
        port: 8080,
    },
    plugins: [
        ...undestructurePlugin("ts"),
        solidPlugin({
            babel: {
                browserslistConfigFile: true,
                plugins: [solidStyledPlugin]
            }
        }),
        visualizer({
            filename: "stat.json",
            json: true,
            sourcemap: true,
            gzipSize: true,
            brotliSize: true,
        }),
        eslint({
            cache: mode !== "production",
        }),
    ],
    build: {
        target: "modules",
        polyfillModulePreload: true,
        sourcemap: true,
    },
    clearScreen: false,
}));
