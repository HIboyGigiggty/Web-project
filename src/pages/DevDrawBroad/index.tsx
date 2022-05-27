import Button from "@suid/material/Button";
import TextField from "@suid/material/TextField";
import { Component, createSignal } from "solid-js";
import {default as DrawBroad, DrawBroadController, DrawPoint, DrawTool, DrawTouchType} from "../../widgets/DrawBroad";

const DevDrawBroad: Component = () => {
    const [currentPoint, setCurrentPoint] = createSignal<DrawPoint>();
    const [hasForce, setHasForce] = createSignal<boolean>(false);
    const [pressure, setPressure] = createSignal<number>(0);
    const [touchType, setTouchType] = createSignal<DrawTouchType>();
    const broadCtl = new DrawBroadController("blue", 20);
    broadCtl.setOffscreenSize([3000, 3000]);

    return <>
        <p style="position: absolute; z-index: 1;" class="noselect">
            Current Point: (x: {currentPoint()?.x}, y: {currentPoint()?.y}, lineWidth: {currentPoint()?.lineWidth}, color: {currentPoint()?.color.toString()})<br />
            hasForce: {String(hasForce())}<br />
            Pressure: {pressure()}<br />
            Touch Type: {touchType()}<br />
            <TextField
                variant="standard"
                label="Line Width Factor"
                onChange={(e) => {
                    e.preventDefault();
                    broadCtl.setLineWidthFactor(new Number((e.target as HTMLInputElement).value).valueOf());
                }}
                value={broadCtl.lineWidthFactor().toString()}/><br />
            Scroll Range X: {broadCtl.scrollCtl.getRangeX().toString()}<br />
            Scroll Range Y: {broadCtl.scrollCtl.getRangeY().toString()}<br />
            Current Tool: {broadCtl.tool()}
            <Button onClick={() => broadCtl.setTool(DrawTool.hand)}>Hand</Button>
            <Button onClick={() => broadCtl.setTool(DrawTool.pen)}>Pen</Button>
            <Button onClick={() => broadCtl.setTool(DrawTool.erase)}>Erase</Button>
            <br />
            <Button onClick={() => broadCtl.resetCanvas()}>Reset Canvas</Button>
        </p>
        <DrawBroad
            onStart={(stroke, ev) => {
                setCurrentPoint(stroke[stroke.length-1]);
                setHasForce(ev.hasForce);
                setPressure(ev.pressure);
            }}
            onDrawing={(stroke, ev) => {
                setCurrentPoint(stroke[stroke.length-1]);
                setHasForce(ev.hasForce);
                setPressure(ev.pressure);
            }}
            onEnd={(ev) => {
                setCurrentPoint();
                setHasForce(ev.hasForce);
                setPressure(ev.pressure);
            }}
            onTouchTypeChanged={setTouchType}
            ctl={broadCtl}
        />
    </>;
};

export default DevDrawBroad;
