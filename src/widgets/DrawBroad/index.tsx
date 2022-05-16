import { Accessor, batch, Component, createEffect, createSignal, mergeProps, onCleanup, onMount, Setter, Signal } from "solid-js";
import "./draw_broad.styl";
import chroma from "chroma-js";
import { useWindowSize } from "./utils";
import ScrollbarController from "./ScrollbarController";

const requestIdleCallback = window.requestIdleCallback || function (fn: () => void, _: any) { setTimeout(fn, 1) };

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

export class DrawBroadController {
    color: Accessor<string>
    setColor: Setter<string>
    offscreen: HTMLCanvasElement
    ctx2d: CanvasRenderingContext2D
    lineWidthFactor: Accessor<number>
    setLineWidthFactor: Setter<number>
    scrollCtl: ScrollbarController

    constructor(defaultColor: string, lineWidthFactor: number) {
        [this.color, this.setColor] = createSignal<string>(defaultColor);
        [this.lineWidthFactor, this.setLineWidthFactor] = createSignal<number>(lineWidthFactor);
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

    const [windowSize] = useWindowSize();

    const [mouseDown, setMouseDown] = createSignal<boolean>(false);
    const [lineWidth, setLineWidth] = createSignal<number>(0);
    const [points, setPoints] = createSignal<DrawPoint[]>([]);
    const [touchType, setTouchType] = createSignal<TouchType>();
    const viewpointX = () => scrollCtl.getRangeX()[0];
    const viewpointY = () => scrollCtl.getRangeY()[0];
    const [viewpointScale, setViewpointScale] = createSignal<number>(1); // TODO: implement scale

    const drawAxisX = () => {
        if (!ctx2d) return;
        if (scrollCtl.getXOfTotal() < 1) {
            const {width, height} = windowSize();
            let [start, end] = scrollCtl.getDrawPositionX(width);
            ctx2d.fillStyle = chroma('black').alpha(dragStartX ? 1 : 0.5).hex();
            const bar_width = mouseOverX? 16: 12;
            const x_height = (bar_width + 2);
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
            ctx2d.fillStyle = chroma('black').alpha(dragStartY? 1: 0.5).hex();
            const bar_width = mouseOverY? 16: 12;
            const y_width = (bar_width + 2);
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
    };

    const updateViewpointSize = () => {
        let {width, height} = windowSize();
        element.width = width;
        element.height = height;
        scrollCtl.setX([ctl.offscreen.width, 0, width]);
        scrollCtl.setY([ctl.offscreen.height, 0, height]);
    };

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

        syncViewpointWithOffScreen();
      };

    const onDrawStart = (e: any) => {
        if (e.button && e.button != 0) {
            return;
        }
        e.preventDefault();

        if (!scrollCtl.isHitScroll(e.pageX, e.pageY)) {
            let pressure = 0.1;
            let x: number, y: number;
            const hasForce = e.touches && e.touches[0] && typeof e.touches[0]["force"] !== "undefined";
            if (hasForce && e.touches.length == 1) {
                if (e.touches[0]["force"] > 0) {
                    pressure = e.touches[0]["force"];
                }
                x = e.touches[0].pageX * 2;
                y = e.touches[0].pageY * 2;
            } else {
                pressure = 1;
                x = e.pageX * 2;
                y = e.pageY * 2;
            }
    
            setMouseDown(true);
    
            setLineWidth(Math.log(pressure + 1) * ctl.lineWidthFactor());
            setPoints(points => {points.push({ x, y, lineWidth: lineWidth(), color: ctl.color() }); return points;})
            draw(points());
            if (merged.onStart) {
                let ev: DrawEvent = {x, y, pressure, hasForce: hasForce || false};
                const touch = e.touches ? e.touches[0] : null;
                if (touch) {
                    const type = touch.touchType == 'direct' ? TouchType.direct: TouchType.stylus;
                    setTouchType(type)
                    ev.touch = {...touch, type: type}
                }
                merged.onStart(points(), ev);
            }
        } else if (scrollCtl.isHitScrollX(e.pageX, e.pageY)) {
            mouseOverX = true;
            dragStartX = e.pageX;
        } else if (scrollCtl.isHitScrollY(e.pageX, e.pageY)) {
            mouseOverY = true;
            dragStartY = e.pageY;
        }
    };

    const onDrawMoving = (e: any) => {
        if (dragStartX) {
            e.preventDefault();
            const offest = (e.pageX - (dragStartX || 0)) * scrollCtl.getXOfTotal();
            const progress = scrollCtl.getProgressX();
            if (!((progress >= 1 && offest > 0) || (progress <= 0 && offest < 0))) {
                scrollCtl.setX(([total, start, end]) => [total, Math.min(start + offest, total), Math.min(end + offest, total)]);
            }
            dragStartX = e.pageX;
            drawAxisX();
        } else if (dragStartY) {
            e.preventDefault();
            const offest = (e.pageY - (dragStartY || 0)) * scrollCtl.getYOfTotal();
            const progress = scrollCtl.getProgressY();
            if (!((progress >= 1 && offest > 0) || (progress <= 0 && offest < 0))) {
                scrollCtl.setY(([total, start, end]) => [total, Math.min(start + offest, total), Math.min(end + offest, total)]);
            }
            dragStartY = e.pageY;
            drawAxisY();
        } else if (mouseDown()) {
            e.preventDefault();
            let pressure = 0.1;
            let x: number, y: number;
            const hasForce = e.touches && e.touches[0] && typeof e.touches[0]["force"] !== "undefined";
            if (hasForce) {
                if (e.touches[0]["force"] > 0) {
                    pressure = e.touches[0]["force"]
                }
                x = e.touches[0].pageX * 2
                y = e.touches[0].pageY * 2
            } else {
                pressure = 1.0
                x = e.pageX * 2
                y = e.pageY * 2
            }
    
            // smoothen line width
            setLineWidth(lineWidth => Math.log(pressure + 1) * ctl.lineWidthFactor() * 0.2 + lineWidth * 0.8)
            setPoints(points => {points.push({x, y, lineWidth: lineWidth(), color: ctl.color()}); return points;})
            draw(points());
    
            if (merged.onDrawing) {
                let ev: DrawEvent = {x, y, pressure, hasForce: hasForce || false};
                const touch = e.touches ? e.touches[0] : null;
                if (touch) {
                    const type = touch.touchType == 'direct' ? TouchType.direct: TouchType.stylus;
                    setTouchType(type)
                    ev.touch = {...touch, type: type}
                }
                merged.onDrawing(points(), ev);
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
            x = e.touches[0].pageX * 2
            y = e.touches[0].pageY * 2
        } else {
            pressure = 1.0
            x = e.pageX * 2
            y = e.pageY * 2
        }
        dragStartX = undefined;
        dragStartY = undefined;

        batch(() => {
            setMouseDown(false);
            setPoints([]);
            setLineWidth(0);
            draw(points());
            drawAxisX();
            drawAxisY();
            if (merged.onEnd) {
                let ev: DrawEvent = {x, y, pressure, hasForce: hasForce || false};
                const touch = e.touches ? e.touches[0] : null;
                if (touch) {
                    const type = touch.touchType == 'direct' ? TouchType.direct: TouchType.stylus;
                    setTouchType(type)
                    ev.touch = {...touch, type: type}
                }
                merged.onEnd(ev);
            }
        });
    };

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

    createEffect(() => syncViewpointWithOffScreen()); // update viewpoint when size updated

    createEffect(() => {
        updateViewpointSize();
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

    return <>
    <canvas
        // @ts-expect-error: the next line will be a error since we refer the uninitialised variable
        ref={element}
        onTouchStart={onDrawStart}
        onMouseDown={onDrawStart}
        onTouchMove={onDrawMoving}
        onMouseMove={onDrawMoving}
        onTouchEnd={onDrawEnd}
        onTouchCancel={onDrawEnd}
        onMouseUp={onDrawEnd}
        onContextMenu={(ev) => ev.preventDefault()}
        class="draw-broad-canvas"
    /></>
};

export default DrawBroad;
