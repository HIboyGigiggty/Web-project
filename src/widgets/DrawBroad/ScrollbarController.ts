import { Accessor, Setter, createSignal } from "solid-js";

export type ScrollRangePair = [number, number, number];

export type BoxDescription = [number, number, number, number];

export class ScrollbarController {
    x: Accessor<ScrollRangePair>; // total, start, end
    y: Accessor<ScrollRangePair>; // total, start, end
    setX: Setter<ScrollRangePair>;
    setY: Setter<ScrollRangePair>;
    prevX: BoxDescription | undefined;
    prevY: BoxDescription | undefined;

    constructor() {
        const [x, setX] = createSignal<ScrollRangePair>([1, 0, 1]);
        const [y, setY] = createSignal<ScrollRangePair>([1, 0, 1]);
        [this.x, this.setX] = [x, setX];
        [this.y, this.setY] = [y, setY];
    }

    setAxisX(total: number, start: number, end: number) {
        this.setX([total, start, end]);
    }

    setAxisY(total: number, start: number, end: number) {
        this.setY([total, start, end]);
    }

    getDrawPositionX(width: number): [number, number] {
        // -------
        // ^ start
        //       ^ end
        const [total, start, end] = this.x();
        if (start > end || start > total || end > total) {
            return [0, 0];
        }
        return [Math.round(width * (start / total)), Math.round(width * (end / total))];
    }

    getDrawPositionY(height: number): [number, number] {
        // | <-start
        // |
        // | <-end
        const [total, start, end] = this.y();
        if (start > end || start > total || end > total) {
            return [0, 0];
        }
        return [Math.round(height * (start / total)), Math.round(height * (end / total))];
    }

    getXOfTotal(): number {
        const [total, start, end] = this.x();
        return (end - start) / total;
    }

    getYOfTotal(): number {
        const [total, start, end] = this.y();
        return (end - start) / total;
    }

    getProgressX(): number {
        const [total, , end] = this.x();
        return end / total;
    }

    getProgressY(): number {
        const [total, , end] = this.y();
        return end / total;
    }

    getRangeX(): [number, number] {
        const [, start, end] = this.x();
        return [start, end];
    }

    getRangeY(): [number, number] {
        const [, start, end] = this.y();
        return [start, end];
    }

    /// Check if the mouse hit the x-axis scroll bar.
    /// `hitX` and `hitY` use screen basis, you need to multiply factor to the position from events.
    isHitScrollX(hitX: number, hitY: number) : boolean {
        if (this.prevX) {
            const [x, y, w, h] = this.prevX;
            return (
                hitX >= x &&
                hitX <= x + w &&
                hitY >= y &&
                hitY <= y + h
            );
        } else {
            return false;
        }
    }

    /// Check if the mouse hit the y-axis scroll bar.
    /// `hitX` and `hitY` use screen basis, you need to multiply factor to the position from events.
    isHitScrollY(hitX: number, hitY: number) : boolean {
        if (this.prevY) {
            const [x, y, w, h] = this.prevY;
            return (
                hitX >= x &&
                hitX <= x + w &&
                hitY >= y &&
                hitY <= y + h
            );
        } else {
            return false;
        }
    }

    isHitScroll(hitX: number, hitY: number): boolean {
        return this.isHitScrollX(hitX, hitY) || this.isHitScrollY(hitX, hitY);
    }

    canScrollX(offest: number): boolean {
        const [total, start, end] = this.x();
        if ((start + offest) < 0) {
            return false;
        } else if ((end + offest) > total) {
            return false;
        } else {
            return true;
        }
    }

    canScrollY(offest: number): boolean {
        const [total, start, end] = this.y();
        if ((start + offest) < 0) {
            return false;
        } else if ((end + offest) > total) {
            return false;
        } else {
            return true;
        }
    }
}

export default ScrollbarController;
