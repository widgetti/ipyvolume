var _scale_point = function (xy, width, height) {
    // gl's normalized device coordinates, [-1, 1]
    return [xy[0] / width * 2 - 1, 1 - xy[1] / height * 2];
};

function points_in_lasso (vertx, verty, x, y) {
    let meanx = 0;
    let meany = 0;
    let N = x.length;
    let Nvert = vertx.length;
    for (let i = 0; i < Nvert; i++) {
        meanx += vertx[i];
        meany += verty[i];
    }
    meanx /= Nvert;
    meany /= Nvert;
    let radius_squared = 0;
    for (let i = 0; i < Nvert; i++) {
        let rx = vertx[i] - meanx;
        let ry = verty[i] - meany;
        radius_squared = Math.max(radius_squared, rx*rx + ry*ry);
    }
    let mask = new Uint8Array(N);
    let indices = new Uint32Array(N);
    let count = 0;
    for (let k = 0; k < N; k++) {
        let testx = x[k];
        let testy = y[k];
        let i, j;
        let is_inside = false;
        mask[k] = 0;
        let distancesq = Math.pow(testx - meanx, 2) + Math.pow(testy - meany, 2);
        if (distancesq < radius_squared) {
            for (i = 0, j = Nvert-1; i < Nvert; j = i++) {
                if (((verty[i]>testy) !== (verty[j]>testy)) &&
                    (testx < (vertx[j]-vertx[i]) * (testy-verty[i]) / (verty[j]-verty[i]) + vertx[i])) {
                    is_inside = !is_inside;
                }
            }
            mask[k] = is_inside ? 1 : 0;
            if (is_inside) {
                indices[count++] = k;
            }
        }
    }
    indices = indices.slice(0, count);
    return { mask: mask, indices: indices };
}

export
class Selector {
    points_inside (x, y) {
        const N = x.length;
        let mask = new Uint8Array(N);
        for (let k = 0; k < N; k++) {
            mask[k] = this.point_inside(x[k], y[k]) ? 1 : 0;
        }
        return mask;
    }
    indices_inside (x, y) {
        const N = x.length;
        let indices = new Uint32Array(N);
        let count = 0;
        for (let k = 0; k < N; k++) {
            if (this.point_inside(x[k], y[k])) {
                indices[count++] = k;
            }
        }
        indices = indices.slice(0, count);
        return indices;
    }
};

export
class LassoSelector extends Selector {
    constructor (canvas) {
        super();
        this.canvas = canvas;
        this.points = [];
    }
    _get_vertices () {
        return { vx: this.points.map(p => p[0]), vy: this.points.map(p => p[1]) };
    }
    point_inside (x, y) {
        let { vx, vy } = this._get_vertices();
        let { mask } = points_in_lasso(vx, vy, [x], [y]);
        return mask[0] === 1;
    }
    points_inside (x, y) {
        let { vx, vy } = this._get_vertices();
        let { mask } = points_in_lasso(vx, vy, x, y);
        return mask;
    }
    indices_inside (x, y) {
        let { vx, vy } = this._get_vertices();
        let { indices } = points_in_lasso(vx, vy, x, y);
        return indices;
    }
    mouseMove (x, y) {
        this.points.push([x, y]);
    }
    close () {
        const context = this.canvas.getContext('2d');
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    draw () {
        const context = this.canvas.getContext('2d');
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        context.lineWidth = 1.5;
        context.strokeStyle = 'rgba(255, 0, 0, 1)';
        context.fillStyle = 'rgba(255, 0, 0, 0.5)';
        context.beginPath();
        for (var i = 0; i < this.points.length; i++) {
            context.lineTo(this.points[i][0], this.points[i][1]);
        }
        context.closePath();
        context.fill();
        context.stroke();
    }
    getData (width, height) {
        var data = { type: 'lasso' };
        data['pixel'] = this.points;
        data['device'] = this.points.map((xy) => _scale_point(xy, width, height));
        return data;
    }
}

export
class CircleSelector extends Selector {
    constructor (canvas) {
        super();
        this.canvas = canvas;
        this.points = [];
        this.begin = null;
        this.end = null;
    }
    point_inside (x, y) {
        if (this.begin === null || this.end === null) {
            return false;
        }
        let [x1, y1] = this.begin;
        let [x2, y2] = this.end;
        let radius_squared = Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2);
        let distance_squared = Math.pow(x - x1, 2) + Math.pow(y - y1, 2);
        return distance_squared < radius_squared;
    }
    mouseMove (x, y) {
        if (!this.begin) {
            this.begin = [x, y];
        } else {
            this.end = [x, y];
        }
    }
    close () {
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.begin = null;
        this.end = null;
    }
    draw () {
        if (this.begin && this.end) {
            const ctx = this.canvas.getContext('2d');
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = 'rgba(255, 0, 0, 1)';
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.beginPath();
            var dx = this.begin[0] - this.end[0];
            var dy = this.begin[1] - this.end[1];
            var r = Math.sqrt(dx*dx + dy*dy);
            ctx.arc(this.begin[0], this.begin[1], r, 0, 2*Math.PI);
            ctx.fill();
            ctx.stroke();
        }
    }
    getData (width, height) {
        var data = { type: 'circle' };
        data['pixel'] = { begin: this.begin, end: this.end };
        data['device'] = { begin: _scale_point(this.begin, width, height), end: _scale_point(this.end, width, height) };
        return data;
    }
}

export
class RectangleSelector extends Selector {
    constructor (canvas) {
        super()
        this.canvas = canvas;
        this.points = [];
        this.begin = null;
        this.end = null;
    }
    point_inside (x, y) {
        if (this.begin === null || this.end === null) {
            return false;
        }
        let [x1, y1] = this.begin;
        let [x2, y2] = this.end;
        let xmin = Math.min(x1, x2);
        let ymin = Math.min(y1, y2);
        let xmax = Math.max(x1, x2);
        let ymax = Math.max(y1, y2);
        return (x > xmin) && (x < xmax) && (y > ymin) && (y < ymax);
    }
    mouseMove (x, y) {
        if (!this.begin) {
            this.begin = [x, y];
        } else {
            this.end = [x, y];
        }
    }
    close () {
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.begin = null;
        this.end = null;
    }
    draw () {
        if (this.begin && this.end) {
            const ctx = this.canvas.getContext('2d');
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = 'rgba(255, 0, 0, 1)';
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.rect(this.begin[0], this.begin[1], this.end[0] - this.begin[0], this.end[1] - this.begin[1]);
            ctx.fill();
            ctx.stroke();
        }
    }
    getData (width, height) {
        var data = { type: 'rectangle' };
        data['pixel'] = { begin: this.begin, end: this.end };
        data['device'] = { begin: _scale_point(this.begin, width, height), end: _scale_point(this.end, width, height) };
        return data;
    }
}
export
var selectors = { lasso: LassoSelector, circle: CircleSelector, rectangle: RectangleSelector };
