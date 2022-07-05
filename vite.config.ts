import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import {undestructurePlugin} from "babel-plugin-solid-undestructure";
import solidStyledJSXPlugin from "solid-styled-jsx/babel";
import {visualizer} from "rollup-plugin-visualizer";
import eslint from "vite-plugin-eslint";

const getHMR = (): boolean | undefined => {
    const hmr = process.env.HOT_MODULE_REPLACEMENT;
    if (typeof hmr !== "undefined") {
        if (hmr === "true") {
            return true;
        } else if (hmr === "false") {
            return false;
        } else {
            throw new Error("env variable HOT_MODULE_REPLACEMENT should be true, false or undefined");
        }
    } else {
        return undefined;
    }
};

export default defineConfig(({mode}) => ({
    server: {
        port: 8080,
        hmr: getHMR(),
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
