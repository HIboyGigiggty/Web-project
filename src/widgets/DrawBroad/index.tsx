import { Accessor, batch, Component, createEffect, createSignal, mergeProps, onCleanup, onMount, Setter, Signal } from "solid-js";
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
    'direct',
    'stylus',
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
    'hand',
    'pen',
}

export class DrawBroadController {
    color: Accessor<string>
    setColor: Setter<string>
    offscreen: HTMLCanvasElement
    ctx2d: CanvasRenderingContext2D
    lineWidthFactor: Accessor<number>
    setLineWidthFactor: Setter<number>
    scrollCtl: ScrollbarController
    tool: Accessor<DrawTool>
    setTool: Setter<DrawTool>

    constructor(defaultColor: string, lineWidthFactor: number) {
        [this.color, this.setColor] = createSignal<string>(defaultColor);
        [this.lineWidthFactor, this.setLineWidthFactor] = createSignal<number>(lineWidthFactor);
        [this.tool, this.setTool] = createSignal<DrawTool>(DrawTool.pen);
        this.offscreen = document.createElement("canvas");
        const ctx2d = this.offscreen.getContext('2d');
        if (!ctx2d) {
            throw new Error("unable get 2d context");
        }
        this.ctx2d = ctx2d;
        this.scrollCtl = new ScrollbarController();
    }
}

interface DrawBroadProps {
    width?: number, // TODO: support update size on-the-fly
    height?: number,
    onStart?: (stroke: DrawPoint[], ev: DrawEvent) => void,
    onDrawing?: (stroke: DrawPoint[], ev: DrawEvent) => void,
    onEnd?: (ev: DrawEvent) => void,
    onTouchTypeChanged?: (newTouchType: TouchType) => void,
    ctl?: DrawBroadController,
}

const DrawBroad: Component<DrawBroadProps> = (props) => {
    const merged = mergeProps({
        width: 1280,
        height: 720,
    }, props);
    const ctl = merged.ctl ? merged.ctl : new DrawBroadController('red', 40);
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
    let isBufferDirty = true;
    let viewpointBufferRefreshNeeded = false;

    const [windowSize] = useWindowSize();

    const [touchType, setTouchType] = createSignal<TouchType>();
    const viewpointX = () => scrollCtl.getRangeX()[0];
    const viewpointY = () => scrollCtl.getRangeY()[0];
    const [viewpointScale, setViewpointScale] = createSignal<number>(1); // TODO: implement scale
    const devicePixelRatio = useDevicePixelRatio();

    const getScrollbarColor = (dragStart: number | undefined) => {
        return chroma('black').alpha(dragStart ? 1 : 0.5).hex();
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
            let [start, end] = scrollCtl.getDrawPositionX(width);
            ctx2d.fillStyle = getScrollbarColor(dragStartX);
            const [bar_width, x_height] = getScrollbarWidth(mouseOverX, dragStartX);
            const x: [number, number, number, number] = [start, height - x_height, end - start, bar_width];
            if (scrollCtl.prevX && scrollCtl.prevX != x) {
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
            let [start, end] = scrollCtl.getDrawPositionY(height);
            ctx2d.fillStyle = getScrollbarColor(dragStartY);
            const [bar_width, y_width] = getScrollbarWidth(mouseOverY, dragStartY);
            const y: [number, number, number, number] = [width - y_width, start, bar_width, end - start];
            if (scrollCtl.prevY && scrollCtl.prevY != y) {
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
        if (viewpointBufferRefreshNeeded) {
            viewpointCtx.clearRect(
                0, 0, element.width, element.height
            );
            viewpointBufferRefreshNeeded = false;
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

        isBufferDirty = false;
    };

    const [bufferSyncRunning, bufferSyncStart, bufferSyncEnd] = createRAF(() => isBufferDirty? syncViewpointWithOffScreen(): undefined);

    const updateViewpointSize = () => {
        let {width, height} = windowSize();
        element.width = width;
        element.height = height;
        scrollCtl.setX([ctl.offscreen.width, 0, width]);
        scrollCtl.setY([ctl.offscreen.height, 0, height]);
        viewpointBufferRefreshNeeded = true;
        isBufferDirty = true;
    };

    /// Draw `stroke` on the broad. This function will mark buffer is dirty after drawing.
    const draw = function (stroke: DrawPoint[]) {
        const context = ctl.ctx2d;
        if (!context) {
            return;
        }
        context.lineCap = 'round'
        context.lineJoin = 'round'
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

        isBufferDirty = true;
      };

    const onDrawStart = (e: any) => {
        if (e.button && e.button != 0) {
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
            if (hasForce && e.touches.length == 1) {
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
                let ev: DrawEvent = {x, y, pressure, hasForce: hasForce || false};
                const touch = e.touches ? e.touches[0] : null;
                if (touch) {
                    const type = touch.touchType == 'direct' ? TouchType.direct: TouchType.stylus;
                    setTouchType(type)
                    ev.touch = {...touch, type: type}
                } else {
                    setTouchType(undefined);
                }
                merged.onStart(points, ev);
            }
        }
    };

    const onDrawMoving = (e: any) => {
        const pageX = e.pageX * devicePixelRatio();
        const pageY = e.pageY * devicePixelRatio();
        const oldMouseOverX = mouseOverX;
        const oldMouseOverY = mouseOverY;
        mouseOverX = (typeof dragStartX === "number" ? true : false) || scrollCtl.isHitScrollX(pageX, pageY);
        mouseOverY = (typeof dragStartY === "number" ? true : false) || scrollCtl.isHitScrollY(pageX, pageY);
        if (oldMouseOverX != mouseOverX || oldMouseOverY != mouseOverY) {
            isBufferDirty = true;
        }
        if (dragStartX) {
            e.preventDefault();
            const offest = Math.round((pageX - (dragStartX || 0)) * scrollCtl.getXOfTotal() * devicePixelRatio());
            if (scrollCtl.canScrollX(offest)) {
                scrollCtl.setX(([total, start, end]) => [total, start + offest, end + offest]);
                isBufferDirty = true;
                viewpointBufferRefreshNeeded = true;
            }
            dragStartX = pageX;
        } else if (dragStartY) {
            e.preventDefault();
            const offest = Math.round((pageY - (dragStartY || 0)) * scrollCtl.getYOfTotal() * devicePixelRatio());
            if (scrollCtl.canScrollY(offest)) {
                scrollCtl.setY(([total, start, end]) => [total, start + offest, end + offest]);
                isBufferDirty = true;
                viewpointBufferRefreshNeeded = true;
            }
            dragStartY = pageY;
        } else if (mouseDown) {
            e.preventDefault();
            let pressure = 0.1;
            let x: number, y: number;
            const hasForce = e.touches && e.touches[0] && typeof e.touches[0]["force"] !== "undefined";
            if (hasForce) {
                if (e.touches[0]["force"] > 0) {
                    pressure = e.touches[0]["force"]
                }
                x = e.touches[0].pageX * devicePixelRatio();
                y = e.touches[0].pageY * devicePixelRatio();
            } else {
                pressure = 1.0
                x = e.pageX * devicePixelRatio();
                y = e.pageY * devicePixelRatio();
            }
    
            // smoothen line width
            lineWidth = Math.log(pressure + 1) * ctl.lineWidthFactor() * 0.2 + lineWidth * 0.8;
            points.push({x: x + viewpointX(), y: y + viewpointY(), lineWidth: lineWidth, color: ctl.color()});
            draw(points);
    
            if (merged.onDrawing) {
                let ev: DrawEvent = {x, y, pressure, hasForce: hasForce || false};
                const touch = e.touches ? e.touches[0] : null;
                if (touch) {
                    const type = touch.touchType == 'direct' ? TouchType.direct: TouchType.stylus;
                    ev.touch = {...touch, type: type}
                }
                merged.onDrawing(points, ev);
            }
        }
    };

    const onDrawEnd = (e: any) => {
        let pressure = 0.1;
        let x: number, y: number;
        const hasForce = e.touches && e.touches[0] && typeof e.touches[0]["force"] !== "undefined";
        if (hasForce) {
            if (e.touches[0]["force"] > 0) {
                pressure = e.touches[0]["force"]
            }
            x = e.touches[0].pageX * devicePixelRatio();
            y = e.touches[0].pageY * devicePixelRatio();
        } else {
            pressure = 1.0
            x = e.pageX * devicePixelRatio();
            y = e.pageY * devicePixelRatio();
        }
        dragStartX = undefined;
        dragStartY = undefined;

        batch(() => {
            mouseDown = false;
            points = [];
            lineWidth = 0;
            draw(points);
            if (merged.onEnd) {
                let ev: DrawEvent = {x: x + viewpointX(), y: y + viewpointY(), pressure, hasForce: hasForce || false};
                const touch = e.touches ? e.touches[0] : null;
                if (touch) {
                    const type = touch.touchType == 'direct' ? TouchType.direct: TouchType.stylus;
                    setTouchType(type)
                    ev.touch = {...touch, type: type}
                } else {
                    setTouchType(undefined);
                }
                merged.onEnd(ev);
            }
        });
    };

    const onWheel = (e: WheelEvent) => {
        if (mouseOverX) {
            e.preventDefault();
            const offest = e.deltaY;
            if (scrollCtl.canScrollX(offest)) {
                scrollCtl.setX(([total, start, end]) => [total, start + offest, end + offest]);
                viewpointBufferRefreshNeeded = true;
                isBufferDirty = true;
            }
        } else if (mouseOverY) {
            e.preventDefault();
            const offest = e.deltaY;
            if (scrollCtl.canScrollY(offest)) {
                scrollCtl.setY(([total, start, end]) => [total, start + offest, end + offest]);
                viewpointBufferRefreshNeeded = true;
                isBufferDirty = true;
            }
        } else if (e.shiftKey) {
            e.preventDefault();
            if (e.deltaX != 0) {
                const offest = e.deltaX;
                if (scrollCtl.canScrollX(offest)) {
                    scrollCtl.setX(([total, start, end]) => [total, start + offest, end + offest]);
                    viewpointBufferRefreshNeeded = true;
                    isBufferDirty = true;
                }
            }

            if (e.deltaY != 0) {
                const offest = e.deltaY;
                if (scrollCtl.canScrollY(offest)) {
                    scrollCtl.setY(([total, start, end]) => [total, start + offest, end + offest]);
                    viewpointBufferRefreshNeeded = true;
                    isBufferDirty = true;
                }
            }
        }
    };

    const onHandDragStart = (e: any) => {
        const pageX = e.pageX * devicePixelRatio();
        const pageY = e.pageY * devicePixelRatio();
        dragStartX = pageX;
        dragStartY = pageY;
    };

    const onHandDraging = (e: any) => {
        const pageX = e.pageX * devicePixelRatio();
        const pageY = e.pageY * devicePixelRatio();
        e.preventDefault();
        if (dragStartX) {
            const offestX = - Math.round((pageX - (dragStartX || 0)) * scrollCtl.getXOfTotal() * devicePixelRatio());
            if (scrollCtl.canScrollX(offestX)) {
                scrollCtl.setX(([total, start, end]) => [total, start + offestX, end + offestX]);
                isBufferDirty = true;
                viewpointBufferRefreshNeeded = true;
            }
            dragStartX = pageX;
        }
        if (dragStartY) {
            const offestY = - Math.round((pageY - (dragStartY || 0)) * scrollCtl.getYOfTotal() * devicePixelRatio());
            if (scrollCtl.canScrollY(offestY)) {
                scrollCtl.setY(([total, start, end]) => [total, start + offestY, end + offestY]);
                isBufferDirty = true;
                viewpointBufferRefreshNeeded = true;
            }
            dragStartY = pageY;
        }
        viewpointBufferRefreshNeeded = true;
    };

    const onHandDragEnd = (e: any) => {
        dragStartX = undefined;
        dragStartY = undefined;
        isBufferDirty = true;
    };

    const onHandStart = (e: any) => {
        if (ctl.tool() === DrawTool.pen) {
            onDrawStart(e);
        } else if (ctl.tool() === DrawTool.hand) {
            onHandDragStart(e);
        }
    }

    const onHandMoving = (e: any) => {
        if (ctl.tool() === DrawTool.pen) {
            onDrawMoving(e);
        } else if (ctl.tool() === DrawTool.hand) {
            onHandDraging(e);
        }
    }

    const onHandEnd = (e: any) => {
        if (ctl.tool() === DrawTool.pen) {
            onDrawEnd(e);
        } else if (ctl.tool() === DrawTool.hand) {
            onHandDragEnd(e);
        }
    }

    {
        const onTouchTypeChanged = merged.onTouchTypeChanged;
        if (onTouchTypeChanged) {
            createEffect(() => {
                const newTouchType = touchType();
                if (newTouchType) {
                    onTouchTypeChanged(newTouchType);
                }
            });
        }
    }

    onMount(() => {
        // setting up offscreen canvas
        ctl.offscreen.width = merged.width;
        ctl.offscreen.height = merged.height;
    });

    createEffect(() => {
        let type = touchType();
        if (merged.onTouchTypeChanged && type) {
            merged.onTouchTypeChanged(type);
        }
    });

    createEffect(() => {
        updateViewpointSize();
    });

    createEffect(() => {
        if (ctl.tool() === DrawTool.hand) {
            element.style.cursor = 'grab';
        } else {
            element.style.cursor = 'default';
        }
    });

    onMount(() => {
        let ctx = element.getContext("2d");
        if (ctx) {
            ctx2d = ctx;
            ctx.strokeStyle = 'black'
        } else {
            console.error("browser does not support 2d context");
            // TODO: throw an error
        }
    });

    onMount(() => {
        let body = document.querySelector("body");
        if (body) {
            body.classList.add("draw-broad-body")
        }
    });

    onCleanup(() => {
        let body = document.querySelector("body");
        if (body) {
            body.classList.remove("draw-broad-body");
        }
    });

    onMount(() => bufferSyncStart());

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
    /></>
};

export default DrawBroad;
