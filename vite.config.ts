import { defineConfig, splitVendorChunkPlugin } from "vite";
import solidPlugin from "vite-plugin-solid";
import {undestructurePlugin} from "babel-plugin-solid-undestructure";
import solidStyledJSXPlugin from "solid-styled-jsx/babel";
import {visualizer} from "rollup-plugin-visualizer";
import eslint from "vite-plugin-eslint";
import path from "path";

const getEnvBool = (name: string): boolean | undefined => {
    const value = process.env[name];
    if (typeof value !== "undefined") {
        if (value === "true") {
            return true;
        } else if (value === "false") {
            return false;
        } else {
            throw new Error(`env variable ${name} should be true, false or undefined`);
        }
    } else {
        return undefined;
    }
};

const getHMR = (): boolean | undefined => {
    return getEnvBool("HOT_MODULE_REPLACEMENT");
};

const extractModChunkNameFromRelativePath = (relPath: string[]) => {
    if (relPath[0].startsWith("@")) {
        return relPath.slice(0, 2).join("_");
    } else {
        return relPath[0];
    }
};

const manualChunksStable = (id: string): string | undefined => {
    const name = id.split(path.sep);
    if (name.includes("node_modules")) {
        const nodeModulesI = name.findIndex((value) => value === "node_modules");
        const nodeModulesPath = path.join(...name.slice(0, nodeModulesI+1));
        const chunkPathRel = path.relative(nodeModulesPath, id).split(path.sep);
        const chunkName = extractModChunkNameFromRelativePath(chunkPathRel.filter(value => value !== ".." && value !== "node_modules"));
        return `${chunkName}.vendor`;
    } else {
        return path.relative(process.cwd(), id).replace(".", "__");
    }
};

const getManualChunks = () => {
    const stableChunkNames = getEnvBool("STABLE_CHUNK_NAMES");
    if (typeof stableChunkNames === "boolean" && stableChunkNames) {
        return manualChunksStable;
    } else {
        return undefined;
    }
};

const getChunkFileNames = () => {
    const stableChunkNames = getEnvBool("STABLE_CHUNK_NAMES");
    if (typeof stableChunkNames === "boolean" && stableChunkNames) {
        return "assets/[name].js";
    } else {
        return "assets/[name].[hash].js";
    }
};

const getAssertFileNames = () => {
    const stableChunkNames = getEnvBool("STABLE_CHUNK_NAMES");
    if (typeof stableChunkNames === "boolean" && stableChunkNames) {
        return "assets/[name][extname]";
    } else {
        return "assets/[name].[hash][extname]";
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
        rollupOptions: {
            output: {
                manualChunks: getManualChunks(),
                chunkFileNames: getChunkFileNames(),
                assetFileNames: getAssertFileNames(),
            }
        },
    },
    clearScreen: false,
}));
