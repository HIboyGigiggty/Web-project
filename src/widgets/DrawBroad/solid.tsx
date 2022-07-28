import createRAF from "@solid-primitives/raf";
import { Component, JSX, onCleanup, onMount } from "solid-js";
import type { DrawBoard, UpdatedArea } from "./board";
import ScrollbarController from "./ScrollbarController";
import { createResizeObserver } from "@solid-primitives/resize-observer";

interface DrawBoardViewProps {
    board: DrawBoard,
    scrollCtl: ScrollbarController,
    style?: string | JSX.CSSProperties,
}

const mergeUpdatedArea = (u0: UpdatedArea, u1: UpdatedArea): UpdatedArea => {
    return {
        x: Math.min(u0.x, u0.x),
        y: Math.min(u0.y, u1.y),
        w: Math.max(u0.w, u1.w),
        h: Math.max(u0.h, u1.h),
    };
};

export const DrawBoardView: Component<DrawBoardViewProps> = (p) => {
    let element!: HTMLCanvasElement;
    let rootElement!: HTMLDivElement;
    let ctx2d: CanvasRenderingContext2D | undefined;

    let isBufferDirty = false;
    let bufferDirtyArea: undefined | UpdatedArea;
    let isRedrawingNeeded = false;

    const onDrawBoardUpdated = (board: DrawBoard, updated?: UpdatedArea) => {
        isBufferDirty = false;
        if (updated) {
            bufferDirtyArea = typeof bufferDirtyArea !== "undefined"? mergeUpdatedArea(updated, bufferDirtyArea) : updated;
        }
        isBufferDirty = true;
        console.log("update area", bufferDirtyArea);
    };

    const synchronise = (dirtyArea?: UpdatedArea) => {
        if (!ctx2d) return;

        if (isRedrawingNeeded) {
            ctx2d.clearRect(0, 0, element.width, element.height);
            isRedrawingNeeded = false;
            dirtyArea = undefined; // ignore partial update
        }

        const srcX = dirtyArea ? dirtyArea.x : p.scrollCtl.getRangeX()[0];
        const srcY = dirtyArea ? dirtyArea.y : p.scrollCtl.getRangeY()[0];
        const srcW = dirtyArea ? Math.min(dirtyArea.w, element.width) : element.width;
        const srcH = dirtyArea ? Math.min(dirtyArea.h, element.height): element.height;
        const destX = dirtyArea ? dirtyArea.x - p.scrollCtl.getRangeX()[0] : 0;
        const destY = dirtyArea ? dirtyArea.y - p.scrollCtl.getRangeY()[0]: 0;
        const destW = dirtyArea ? Math.min(dirtyArea.w, element.width) : element.width;
        const destH = dirtyArea ? Math.min(dirtyArea.h, element.height): element.height;

        ctx2d.drawImage(
            p.board.offscreen,
            srcX,
            srcY,
            srcW,
            srcH,
            destX,
            destY,
            destW,
            destH,
        );
    };

    const [, bufferSyncStart, bufferSyncStop] = createRAF(() => (isBufferDirty ? synchronise(bufferDirtyArea) : undefined));

    const updateScrollbarCtl = () => {
        p.scrollCtl.setAxisX(p.board.offscreen.width, 0, Math.min(element.width, p.board.offscreen.width));
        p.scrollCtl.setAxisY(p.board.offscreen.height, 0, Math.min(element.height, p.board.offscreen.height));
        isBufferDirty = true;
    };

    onMount(() => {
        if (typeof p.board.onUpdated !== "undefined") {
            throw new Error("one DrawBoard only allow to attach to one DrawBoardView");
        }
        p.board.onUpdated = onDrawBoardUpdated;
        const ctx = element.getContext("2d");
        if (!ctx) {
            throw new Error("unable to get 2d context");
        }
        ctx2d = ctx;

        bufferSyncStart();
    });

    onMount(() => {
        createResizeObserver(element, ({ width, height }) => {
            element.width = width;
            element.height = height;
            
            updateScrollbarCtl();
        }, {
            box: "device-pixel-content-box",
        });
    });

    onCleanup(() => {
        bufferSyncStop();
        
        p.board.onUpdated = undefined;
    });

    return <div ref={rootElement} style={p.style}>
        <canvas style={{
            position: "relative",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
        }} ref={element} />
    </div>;
};
