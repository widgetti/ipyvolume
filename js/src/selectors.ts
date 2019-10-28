function _scale_point(xy, width, height) {
    // gl's normalized device coordinates, [-1, 1]
    return [xy[0] / width * 2 - 1, 1 - xy[1] / height * 2];
}

export
class LassoSelector {
    canvas: any;
    points: any[];
    constructor(canvas) {
        this.canvas = canvas;
        this.points = [];
    }

    mouseMove(x, y) {
        this.points.push([x, y]);
    }

    close() {
        const context = this.canvas.getContext("2d");
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    draw() {
        const context = this.canvas.getContext("2d");
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        context.lineWidth = 1.5;
        context.strokeStyle = "rgba(255, 0, 0, 1)";
        context.fillStyle = "rgba(255, 0, 0, 0.5)";
        context.beginPath();
        for (const point of this.points) {
            context.lineTo(point[0], point[1]);
        }
        context.closePath();
        context.fill();
        context.stroke();
    }
    getData(width, height) {
        const data = {
            type: "lasso",
            pixel: this.points,
            device: this.points.map((xy) => _scale_point(xy, width, height)),
        };
        return data;
    }
}

export
class CircleSelector {
    canvas: any;
    points: any[];
    begin: any;
    end: any;
    constructor(canvas) {
        this.canvas = canvas;
        this.points = [];
        this.begin = null;
        this.end = null;
    }
    mouseMove(x, y) {
        if (!this.begin) {
            this.begin = [x, y];
        } else {
            this.end = [x, y];
        }
    }
    close() {
        const ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.begin = null;
        this.end = null;
    }
    draw() {
        if (this.begin && this.end) {
            const ctx = this.canvas.getContext("2d");
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "rgba(255, 0, 0, 1)";
            ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
            ctx.beginPath();
            const dx = this.begin[0] - this.end[0];
            const dy = this.begin[1] - this.end[1];
            const r = Math.sqrt(dx * dx + dy * dy);
            ctx.arc(this.begin[0], this.begin[1], r, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
    }
    getData(width, height) {
        const data = {
            type: "circle",
            pixel: { begin: this.begin, end: this.end },
            device:  { begin: _scale_point(this.begin, width, height), end: _scale_point(this.end, width, height) },
        };
        return data;
    }
}

export
class RectangleSelector {
    canvas: any;
    points: any[];
    begin: any;
    end: any;
    constructor(canvas) {
        this.canvas = canvas;
        this.points = [];
        this.begin = null;
        this.end = null;
    }
    mouseMove(x, y) {
        if (!this.begin) {
            this.begin = [x, y];
        } else {
            this.end = [x, y];
        }
    }
    close() {
        const ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.begin = null;
        this.end = null;
    }
    draw() {
        if (this.begin && this.end) {
            const ctx = this.canvas.getContext("2d");
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "rgba(255, 0, 0, 1)";
            ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
            ctx.beginPath();
            ctx.rect(this.begin[0], this.begin[1], this.end[0] - this.begin[0], this.end[1] - this.begin[1]);
            ctx.fill();
            ctx.stroke();
        }
    }
    getData(width, height) {
        return {
            type: "rectangle",
            pixel: { begin: this.begin, end: this.end },
            device: { begin: _scale_point(this.begin, width, height), end: _scale_point(this.end, width, height) },
        };
    }
}
export
let selectors = { lasso: LassoSelector, circle: CircleSelector, rectangle: RectangleSelector };
