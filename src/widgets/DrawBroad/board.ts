
export interface DrawPoint {
    x: number,
    y: number,
    lineWidth: number,
    color: string,
}

export class DrawPen {
    stroke: DrawPoint[];
    doDraw: ((stroke: DrawPoint[]) => void);
    onUpdated?: ((stroke: DrawPoint[]) => void);

    constructor(doDraw: ((stroke: DrawPoint[]) => void)) {
        this.stroke = [];
        this.doDraw = doDraw;
    }

    clear() {
        this.stroke = [];
        if (this.onUpdated) {
            this.onUpdated(this.stroke);
        }
    }

    addPoint(point: DrawPoint) {
        this.stroke.push(point);
        this.doDraw(this.stroke);
        if (this.onUpdated) {
            this.onUpdated(this.stroke);
        }
    }
}

export interface UpdatedArea {
    x: number,
    y: number,
    w: number,
    h: number,
}

export class DrawBoard {
    offscreen: HTMLCanvasElement;
    ctx2d: CanvasRenderingContext2D;
    onUpdated?: (board: DrawBoard, area?: UpdatedArea) => void;

    constructor(offscreen: HTMLCanvasElement) {
        this.offscreen = offscreen;
        const ctx2d = this.offscreen.getContext("2d");
        if (!ctx2d) {
            throw new Error("unable get 2d context");
        }
        this.ctx2d = ctx2d;
    }

    reset() {
        const width = this.offscreen.width;
        const height = this.offscreen.height;
        this.ctx2d.clearRect(0, 0, width, height);
        this.setUpdated({x: 0, y: 0, w: width, h: height});
    }

    setUpdated(updatedArea?: UpdatedArea) {
        if (this.onUpdated) {
            this.onUpdated(this, updatedArea);
        }
    }

    draw(stroke: DrawPoint[]) {
        const context = this.ctx2d;
        context.lineCap = "round";
        context.lineJoin = "round";
        if (stroke.length <= 0) {
            return;
        }
      
        const l = stroke.length - 1;
        if (stroke.length >= 3) {
            const lastX = (stroke[l-1].x + stroke[l-2].x) / 2;
            const lastY = (stroke[l-1].y + stroke[l-2].y) / 2;
            context.beginPath();
            context.moveTo(lastX, lastY);
            const xc = (stroke[l].x + stroke[l - 1].x) / 2;
            const yc = (stroke[l].y + stroke[l - 1].y) / 2;
            context.lineWidth = stroke[l - 1].lineWidth;
            context.quadraticCurveTo(stroke[l - 1].x, stroke[l - 1].y, xc, yc);
            context.strokeStyle = stroke[l].color;
            context.stroke();
        } else {
            const point = stroke[l];
            context.lineWidth = point.lineWidth;
            context.strokeStyle = point.color;
            context.beginPath();
            context.moveTo(point.x, point.y);
            context.stroke();
        }

        this.setUpdated(); // TODO: partial update
    }

    getPen(): DrawPen {
        return new DrawPen((stroke) => this.draw(stroke));
    }
}
