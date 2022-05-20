import { Accessor, Setter, createSignal } from "solid-js"

export class ScrollbarController {
    x: Accessor<[number, number, number]> // total, start, end
    y: Accessor<[number, number, number]> // total, start, end
    setX: Setter<[number, number, number]>
    setY: Setter<[number, number, number]>
    prevX: [number, number, number, number] | undefined
    prevY: [number, number, number, number] | undefined

    constructor() {
        [this.x, this.setX] = createSignal([1, 0, 1]);
        [this.y, this.setY] = createSignal([1, 0, 1]);
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
        let [total, start, end] = this.x();
        if (start > end || start > total || end > total) {
            return [0, 0];
        }
        return [Math.round(width * (start / total)), Math.round(width * (end / total))];
    }

    getDrawPositionY(height: number): [number, number] {
        // | <-start
        // |
        // | <-end
        let [total, start, end] = this.y();
        if (start > end || start > total || end > total) {
            return [0, 0];
        }
        return [Math.round(height * (start / total)), Math.round(height * (end / total))];
    }

    getXOfTotal(): number {
        let [total, start, end] = this.x();
        return (end - start) / total;
    }

    getYOfTotal(): number {
        let [total, start, end] = this.y();
        return (end - start) / total;
    }

    getProgressX(): number {
        let [total, , end] = this.x();
        return end / total;
    }

    getProgressY(): number {
        let [total, , end] = this.y();
        return end / total;
    }

    getRangeX(): [number, number] {
        let [, start, end] = this.x();
        return [start, end];
    }

    getRangeY(): [number, number] {
        let [, start, end] = this.y();
        return [start, end];
    }

    /// Check if the mouse hit the x-axis scroll bar.
    /// `hitX` and `hitY` use screen basis, you need to multiply factor to the position from events.
    isHitScrollX(hitX: number, hitY: number) : boolean {
        if (this.prevX) {
            let [x, y, w, h] = this.prevX;
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
            let [x, y, w, h] = this.prevY;
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
}

export default ScrollbarController;
