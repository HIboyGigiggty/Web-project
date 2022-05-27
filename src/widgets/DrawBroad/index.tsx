import { Accessor, Component, Setter, createEffect, createSignal, mergeProps, onCleanup, onMount } from "solid-js";
import "./draw_broad.styl";
import chroma from "chroma-js";
import { useDevicePixelRatio, useWindowSize } from "./utils";
import ScrollbarController from "./ScrollbarController";
import createRAF from "@solid-primitives/raf";

export interface DrawPoint {
    x: number,
    y: number,
    lineWidth: number,
    color: string,
}

export enum TouchType {
    "direct",
    "stylus",
}

export interface TouchEvent {
    type: TouchType,
    radiusX: number,
    radiusY: number,
    rotationAngle: number,
    altitudeAngle: number,
    azimuthAngle: number,
}

export interface DrawEvent {
    hasForce: boolean,
    pressure: number,
    x: number,
    y: number,
    touch?: TouchEvent,
}

export enum DrawTool {
    "hand",
    "pen",
}

export class DrawBroadController {
    color: Accessor<string>;
    setColor: Setter<string>;
    offscreen: HTMLCanvasElement;
    ctx2d: CanvasRenderingContext2D;
    lineWidthFactor: Accessor<number>;
    setLineWidthFactor: Setter<number>;
    scrollCtl: ScrollbarController;
    tool: Accessor<DrawTool>;
    setTool: Setter<DrawTool>;
    isBufferDirty: boolean;
    viewpointBufferRefreshNeeded: boolean;

    constructor(defaultColor: string, defaultLinedWidthFactor: number) {
        const [color, setColor] = createSignal<string>(defaultColor);
        [this.color, this.setColor] = [color, setColor];
        const [lineWidthFactor, setLineWidthFactor] = createSignal<number>(defaultLinedWidthFactor);
        [this.lineWidthFactor, this.setLineWidthFactor] = [lineWidthFactor, setLineWidthFactor];
        const [tool, setTool] = createSignal<DrawTool>(DrawTool.pen);
        [this.tool, this.setTool] = [tool, setTool];
        this.offscreen = document.createElement("canvas");
        const ctx2d = this.offscreen.getContext("2d");
        if (!ctx2d) {
            throw new Error("unable get 2d context");
        }
        this.ctx2d = ctx2d;
        this.scrollCtl = new ScrollbarController();
        this.isBufferDirty = true;
        this.viewpointBufferRefreshNeeded = false;
    }

    setOffscreenSize([width, height]: [number, number]) {
        this.offscreen.width = width;
        this.offscreen.height = height;
    }

    resetCanvas() {
        this.ctx2d.clearRect(0, 0, this.offscreen.width, this.offscreen.height);
        this.viewpointBufferRefreshNeeded = true;
        this.isBufferDirty = true;
    }
}

interface DrawBroadProps {
    onStart?: (stroke: DrawPoint[], ev: DrawEvent) => void,
    onDrawing?: (stroke: DrawPoint[], ev: DrawEvent) => void,
    onEnd?: (ev: DrawEvent) => void,
    onTouchTypeChanged?: (newTouchType: TouchType) => void,
    ctl?: DrawBroadController, // The controller can control the state of the broad. WARNING: No Reactivity For This Prop.
}

/// Drawing broad of two-canvas. This element including two canvas: viewpoint and offscreen.
/// The drawing will be first paint to the offscreen canvas, and be synced to viewpoint canvas in the next frame.
const DrawBroad: Component<DrawBroadProps> = (props) => {
    const merged = mergeProps({
        width: 1280,
        height: 720,
    }, props);
    // eslint-disable-next-line solid/reactivity
    const ctl = merged.ctl || new DrawBroadController("red", 40);
    const scrollCtl = ctl.scrollCtl;
    let element: HTMLCanvasElement;
    let ctx2d: CanvasRenderingContext2D | undefined;
    // Scrollbar:
    let dragStartX: number | undefined;
    let dragStartY: number | undefined;
    let mouseOverX = false;
    let mouseOverY = false;
    let mouseDown = false;
    let lineWidth = 0;
    let points: DrawPoint[] = [];

    const [windowSize] = useWindowSize();

    const [touchType, setTouchType] = createSignal<TouchType>();
    const viewpointX = () => scrollCtl.getRangeX()[0];
    const viewpointY = () => scrollCtl.getRangeY()[0];
    const devicePixelRatio = useDevicePixelRatio();

    const getScrollbarColor = (dragStart: number | undefined) => {
        return chroma("black").alpha(dragStart ? 1 : 0.5).hex();
    };

    const getScrollbarWidth = (mouseOver: boolean, dragStart: number | undefined) => {
        const widthFactor = touchType() === undefined? 1 : devicePixelRatio();
        const bar_width = Math.round((mouseOver? 20: 12) * widthFactor);
        const another_axis = (bar_width + ((mouseOver || dragStart)? 0: 2));
        return [bar_width, another_axis];
    };

    const drawAxisX = () => {
        if (!ctx2d) return;
        if (scrollCtl.getXOfTotal() < 1) {
            const {width, height} = windowSize();
            const [start, end] = scrollCtl.getDrawPositionX(width);
            ctx2d.fillStyle = getScrollbarColor(dragStartX);
            const [bar_width, x_height] = getScrollbarWidth(mouseOverX, dragStartX);
            const x: [number, number, number, number] = [start, height - x_height, end - start, bar_width];
            if (scrollCtl.prevX && scrollCtl.prevX !== x) {
                ctx2d.clearRect(...scrollCtl.prevX);
            }
            ctx2d.fillRect(...x);
            scrollCtl.prevX = x;
        } else {
            scrollCtl.prevX = undefined;
        }
    };

    const drawAxisY = () => {
        if (!ctx2d) return;
        if (scrollCtl.getYOfTotal() < 1) {
            const {width, height} = windowSize();
            const [start, end] = scrollCtl.getDrawPositionY(height);
            ctx2d.fillStyle = getScrollbarColor(dragStartY);
            const [bar_width, y_width] = getScrollbarWidth(mouseOverY, dragStartY);
            const y: [number, number, number, number] = [width - y_width, start, bar_width, end - start];
            if (scrollCtl.prevY && scrollCtl.prevY !== y) {
                ctx2d.clearRect(...scrollCtl.prevY);
            }
            ctx2d.fillRect(...y);
            scrollCtl.prevY = y;
        } else {
            scrollCtl.prevY = undefined;
        }
    };

    const syncViewpointWithOffScreen = () => {
        if (!ctx2d) return;
        const viewpointCtx = ctx2d;
        const offscreen = ctl.offscreen;
        if (ctl.viewpointBufferRefreshNeeded) {
            viewpointCtx.clearRect(
                0, 0, element.width, element.height
            );
            ctl.viewpointBufferRefreshNeeded = false;
        }
        viewpointCtx.drawImage(
            offscreen,
            viewpointX(),
            viewpointY(),
            element.width,
            element.height,
            0,
            0,
            element.width,
            element.height
        );

        drawAxisX();
        drawAxisY();

        ctl.isBufferDirty = false;
    };

    const [, bufferSyncStart, ] = createRAF(() => (ctl.isBufferDirty? syncViewpointWithOffScreen(): undefined));

    const updateViewpointSize = () => {
        const {width, height} = windowSize();
        element.width = width;
        element.height = height;
        scrollCtl.setX([ctl.offscreen.width, 0, width]);
        scrollCtl.setY([ctl.offscreen.height, 0, height]);
        ctl.viewpointBufferRefreshNeeded = true;
        ctl.isBufferDirty = true;
    };

    /// Draw `stroke` on the broad. This function will mark buffer is dirty after drawing.
    const draw = function (stroke: DrawPoint[]) {
        const context = ctl.ctx2d;
        if (!context) {
            return;
        }
        context.lineCap = "round";
        context.lineJoin = "round";
        if (stroke.length <= 0) {
            return;
        }
      
        const l = stroke.length - 1;
        if (stroke.length >= 3) {
            const xc = (stroke[l].x + stroke[l - 1].x) / 2;
            const yc = (stroke[l].y + stroke[l - 1].y) / 2;
            context.lineWidth = stroke[l - 1].lineWidth;
            context.quadraticCurveTo(stroke[l - 1].x, stroke[l - 1].y, xc, yc);
            context.strokeStyle = chroma.mix(stroke[l-1].color, stroke[l].color).hex();
            context.stroke();
            context.beginPath();
            context.moveTo(xc, yc);
        } else {
            const point = stroke[l];
            console.log("stroke", stroke);
            console.log("point", point);
            context.lineWidth = point.lineWidth;
            context.strokeStyle = point.color;
            context.beginPath();
            context.moveTo(point.x, point.y);
            context.stroke();
        }

        ctl.isBufferDirty = true;
    };

    // FIXME: use more specific type and make optimizer happy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onDrawStart = (e: any) => {
        if (e.button && e.button !== 0) {
            return;
        }
        e.preventDefault();

        const pageX = e.pageX * devicePixelRatio();
        const pageY = e.pageY * devicePixelRatio();

        if (scrollCtl.isHitScrollX(pageX, pageY)) {
            mouseOverX = true;
            dragStartX = pageX;
        } else if (scrollCtl.isHitScrollY(pageX, pageY)) {
            mouseOverY = true;
            dragStartY = pageY;
        } else {
            let pressure = 0.1;
            let x: number, y: number;
            const hasForce = e.touches && e.touches[0] && typeof e.touches[0]["force"] !== "undefined";
            if (hasForce && e.touches.length === 1) {
                if (e.touches[0]["force"] > 0) {
                    pressure = e.touches[0]["force"];
                }
                x = e.touches[0].pageX * devicePixelRatio();
                y = e.touches[0].pageY * devicePixelRatio();
            } else {
                pressure = 1;
                x = e.pageX * devicePixelRatio();
                y = e.pageY * devicePixelRatio();
            }
    
            mouseDown = true;
    
            lineWidth = Math.log(pressure+1) * ctl.lineWidthFactor();
            points.push({ x: x + viewpointX(), y: y + viewpointY(), lineWidth: lineWidth, color: ctl.color() });
            draw(points);
            if (merged.onStart) {
                const ev: DrawEvent = {x, y, pressure, hasForce: hasForce || false};
                const touch = e.touches ? e.touches[0] : {};
                ev.touch = {...touch, type: touchType()};
                merged.onStart(points, ev);
            }
        }
    };

    // FIXME: use more specific type and make optimizer happy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onDrawMoving = (e: any) => {
        const pageX = e.pageX * devicePixelRatio();
        const pageY = e.pageY * devicePixelRatio();
        const oldMouseOverX = mouseOverX;
        const oldMouseOverY = mouseOverY;
        mouseOverX = (typeof dragStartX === "number" ? true : false) || scrollCtl.isHitScrollX(pageX, pageY);
        mouseOverY = (typeof dragStartY === "number" ? true : false) || scrollCtl.isHitScrollY(pageX, pageY);
        if (oldMouseOverX !== mouseOverX || oldMouseOverY !== mouseOverY) {
            ctl.isBufferDirty = true;
        }
        if (dragStartX) {
            e.preventDefault();
            const offest = Math.round((pageX - (dragStartX || 0)) * scrollCtl.getXOfTotal() * devicePixelRatio());
            if (scrollCtl.canScrollX(offest)) {
                scrollCtl.setX(([total, start, end]) => [total, start + offest, end + offest]);
                ctl.isBufferDirty = true;
                ctl.viewpointBufferRefreshNeeded = true;
            }
            dragStartX = pageX;
        } else if (dragStartY) {
            e.preventDefault();
            const offest = Math.round((pageY - (dragStartY || 0)) * scrollCtl.getYOfTotal() * devicePixelRatio());
            if (scrollCtl.canScrollY(offest)) {
                scrollCtl.setY(([total, start, end]) => [total, start + offest, end + offest]);
                ctl.isBufferDirty = true;
                ctl.viewpointBufferRefreshNeeded = true;
            }
            dragStartY = pageY;
        } else if (mouseDown) {
            e.preventDefault();
            let pressure = 0.1;
            let x: number, y: number;
            const hasForce = e.touches && e.touches[0] && typeof e.touches[0]["force"] !== "undefined";
            if (hasForce) {
                if (e.touches[0]["force"] > 0) {
                    pressure = e.touches[0]["force"];
                }
                x = e.touches[0].pageX * devicePixelRatio();
                y = e.touches[0].pageY * devicePixelRatio();
            } else {
                pressure = 1.0;
                x = e.pageX * devicePixelRatio();
                y = e.pageY * devicePixelRatio();
            }
    
            // smoothen line width
            lineWidth = Math.log(pressure + 1) * ctl.lineWidthFactor() * 0.2 + lineWidth * 0.8;
            points.push({x: x + viewpointX(), y: y + viewpointY(), lineWidth: lineWidth, color: ctl.color()});
            draw(points);
    
            if (merged.onDrawing) {
                const ev: DrawEvent = {x, y, pressure, hasForce: hasForce || false};
                const touch = e.touches ? e.touches[0] : null;
                if (touch) {
                    const type = touch.touchType === "direct" ? TouchType.direct: TouchType.stylus;
                    ev.touch = {...touch, type: type};
                }
                merged.onDrawing(points, ev);
            }
        }
    };

    // FIXME: use more specific type and make optimizer happy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onDrawEnd = (e: any) => {
        let pressure = 0.1;
        let x: number, y: number;
        const hasForce = e.touches && e.touches[0] && typeof e.touches[0]["force"] !== "undefined";
        if (hasForce) {
            if (e.touches[0]["force"] > 0) {
                pressure = e.touches[0]["force"];
            }
            x = e.touches[0].pageX * devicePixelRatio();
            y = e.touches[0].pageY * devicePixelRatio();
        } else {
            pressure = 1.0;
            x = e.pageX * devicePixelRatio();
            y = e.pageY * devicePixelRatio();
        }
        dragStartX = undefined;
        dragStartY = undefined;

        mouseDown = false;
        points = [];
        lineWidth = 0;
        draw(points);
        if (merged.onEnd) {
            const ev: DrawEvent = {x: x + viewpointX(), y: y + viewpointY(), pressure, hasForce: hasForce || false};
            const touch = e.touches ? e.touches[0] : null;
            if (touch) {
                const type = touch.touchType === "direct" ? TouchType.direct: TouchType.stylus;
                setTouchType(type);
                ev.touch = {...touch, type: type};
            } else {
                setTouchType(undefined);
            }
            merged.onEnd(ev);
        }
    };

    const onWheel = (e: WheelEvent) => {
        if (mouseOverX) {
            e.preventDefault();
            const offest = e.deltaY;
            if (scrollCtl.canScrollX(offest)) {
                scrollCtl.setX(([total, start, end]) => [total, start + offest, end + offest]);
                ctl.viewpointBufferRefreshNeeded = true;
                ctl.isBufferDirty = true;
            }
        } else if (mouseOverY) {
            e.preventDefault();
            const offest = e.deltaY;
            if (scrollCtl.canScrollY(offest)) {
                scrollCtl.setY(([total, start, end]) => [total, start + offest, end + offest]);
                ctl.viewpointBufferRefreshNeeded = true;
                ctl.isBufferDirty = true;
            }
        } else if (e.shiftKey) {
            e.preventDefault();
            if (e.deltaX !== 0) {
                const offest = e.deltaX;
                if (scrollCtl.canScrollX(offest)) {
                    scrollCtl.setX(([total, start, end]) => [total, start + offest, end + offest]);
                    ctl.viewpointBufferRefreshNeeded = true;
                    ctl.isBufferDirty = true;
                }
            }

            if (e.deltaY !== 0) {
                const offest = e.deltaY;
                if (scrollCtl.canScrollY(offest)) {
                    scrollCtl.setY(([total, start, end]) => [total, start + offest, end + offest]);
                    ctl.viewpointBufferRefreshNeeded = true;
                    ctl.isBufferDirty = true;
                }
            }
        }
    };

    // FIXME: use more specific type and make optimizer happy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onHandDragStart = (e: any) => {
        e.preventDefault();
        let pageX: number;
        let pageY: number;
        if (typeof e.touches !== "undefined") {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                pageX = touch.pageX * devicePixelRatio();
                pageY = touch.pageY * devicePixelRatio();
            } else {
                return; // We could not accept multi-finger for dragging
            }
        } else {
            pageX = e.pageX * devicePixelRatio();
            pageY = e.pageY * devicePixelRatio();
        }
        dragStartX = pageX;
        dragStartY = pageY;
    };

    // FIXME: use more specific type and make optimizer happy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onHandDraging = (e: any) => {
        e.preventDefault();
        let pageX: number;
        let pageY: number;
        if (typeof e.touches !== "undefined") {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                pageX = touch.pageX * devicePixelRatio();
                pageY = touch.pageY * devicePixelRatio();
            } else {
                return; // We could not accept multi-finger for dragging
            }
        } else {
            pageX = e.pageX * devicePixelRatio();
            pageY = e.pageY * devicePixelRatio();
        }
        if (dragStartX) {
            const offestX = - Math.round((pageX - (dragStartX || 0)) * scrollCtl.getXOfTotal() * devicePixelRatio());
            if (scrollCtl.canScrollX(offestX)) {
                scrollCtl.setX(([total, start, end]) => [total, start + offestX, end + offestX]);
                ctl.isBufferDirty = true;
                ctl.viewpointBufferRefreshNeeded = true;
            }
            dragStartX = pageX;
        }
        if (dragStartY) {
            const offestY = - Math.round((pageY - (dragStartY || 0)) * scrollCtl.getYOfTotal() * devicePixelRatio());
            if (scrollCtl.canScrollY(offestY)) {
                scrollCtl.setY(([total, start, end]) => [total, start + offestY, end + offestY]);
                ctl.isBufferDirty = true;
                ctl.viewpointBufferRefreshNeeded = true;
            }
            dragStartY = pageY;
        }
        ctl.viewpointBufferRefreshNeeded = true;
    };

    // FIXME: use more specific type and make optimizer happy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onHandDragEnd = (e: any) => {
        e.preventDefault();
        dragStartX = undefined;
        dragStartY = undefined;
        ctl.isBufferDirty = true;
    };

    // FIXME: use more specific type and make optimizer happy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onHandStart = (e: any) => {
        const touch = e.touches ? e.touches[0] : null;
        if (touch) {
            const type = touch.touchType === "direct" ? TouchType.direct: TouchType.stylus;
            setTouchType(type);
        } else {
            setTouchType(undefined);
        }
        if (ctl.tool() === DrawTool.pen) {
            onDrawStart(e);
        } else if (ctl.tool() === DrawTool.hand) {
            onHandDragStart(e);
        }
    };

    // FIXME: use more specific type and make optimizer happy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onHandMoving = (e: any) => {
        if (ctl.tool() === DrawTool.pen) {
            onDrawMoving(e);
        } else if (ctl.tool() === DrawTool.hand) {
            onHandDraging(e);
        }
    };

    // FIXME: use more specific type and make optimizer happy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onHandEnd = (e: any) => {
        if (ctl.tool() === DrawTool.pen) {
            onDrawEnd(e);
        } else if (ctl.tool() === DrawTool.hand) {
            onHandDragEnd(e);
        }
    };

    createEffect(() => {
        if (merged.onTouchTypeChanged) {
            const newTouchType = touchType();
            if (newTouchType){
                merged.onTouchTypeChanged(newTouchType);
            }
        }
    });

    createEffect(() => {
        updateViewpointSize();
    });

    createEffect(() => {
        if (ctl.tool() === DrawTool.hand) {
            element.style.cursor = "grab";
        } else {
            element.style.cursor = "default";
        }
    });

    onMount(() => {
        const ctx = element.getContext("2d");
        if (ctx) {
            ctx2d = ctx;
            ctx.strokeStyle = "black";
        } else {
            console.error("browser does not support 2d context");
            // TODO: throw an error
        }
    });

    onMount(() => {
        const body = document.querySelector("body");
        if (body) {
            body.classList.add("draw-broad-body");
        }
    });

    onCleanup(() => {
        const body = document.querySelector("body");
        if (body) {
            body.classList.remove("draw-broad-body");
        }
    });

    onMount(() => bufferSyncStart());

    const onOffscreenCanvasResized = () => {
        updateViewpointSize();
    };

    onMount(() => {
        ctl.offscreen.addEventListener("resize", onOffscreenCanvasResized);
    });

    onCleanup(() => {
        ctl.offscreen.removeEventListener("resize", onOffscreenCanvasResized);
    });

    return <>
        <canvas
        // @ts-expect-error: the next line will be a error since we refer the uninitialised variable
            ref={element}
            onTouchStart={onHandStart}
            onMouseDown={onHandStart}
            onTouchMove={onHandMoving}
            onMouseMove={onHandMoving}
            onTouchEnd={onHandEnd}
            onTouchCancel={onHandEnd}
            onMouseUp={onHandEnd}
            onContextMenu={(ev) => ev.preventDefault()}
            onWheel={onWheel}
            class="draw-broad-canvas"
        /></>;
};

export default DrawBroad;
