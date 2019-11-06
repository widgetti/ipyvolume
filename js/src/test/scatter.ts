// import {Figure} from '../src/Figure.js';
// import { ScatterModel, ScatterView, FigureModel, FigureView } from "../../";
import * as bqplot from "bqplot";
import { expect } from "chai";
import * as ipyvolume from "../";
import {DummyManager} from "./dummy-manager";
import {create_color_scale, create_figure_scatter, create_model, data_float32} from "./widget-utils";

// text pixel coordinate
const test_x = 250;
const test_y = 200;
const pixel_red = [255, 0, 0, 255];

describe("scatter >", () => {
    beforeEach(async function() {
        this.manager = new DummyManager({ipyvolume, bqplot});
    });

    it("create", async function() {
        const x = data_float32([0, 1]);
        const y = data_float32([2, 3]);
        const z = data_float32([0, 3]);
        const { scatter, figure } = await create_figure_scatter(this.manager, [x], [y], [z]);
        expect(scatter.model.get("x")[0][0]).to.equal(0);
        expect(scatter.model.get("x")[0][1]).to.equal(1);
    });
    it("canvas/png render check", async function() {
        const x = data_float32([0.5]);
        const y = data_float32([10]);
        const z = data_float32([0.5]);
        const { scatter, figure } = await create_figure_scatter(this.manager, [x], [y], [z]);
        scatter.model.set("size", 20);
        figure._real_update();
        let pixel = await figure.readPixel(test_x, test_y);
        const pixel_original = pixel;
        let [red, green, blue, alpha] = pixel;
        expect(red).to.be.gt(150);
        expect(green).to.eq(0);
        expect(blue).to.eq(0);
        expect(alpha).to.eq(255);

        figure.mouseDown(test_x, test_y);
        figure.mouseDrag(400, 0);
        figure._real_update();

        pixel = await figure.readPixel(test_x, test_y);
        [red, green, blue, alpha] = pixel;
        expect(red).to.be.eq(255);
        expect(green).to.eq(255);
        expect(blue).to.eq(255);
        expect(alpha).to.eq(255);

        figure.mouseDown(test_x * 1.5, test_y);
        figure.mouseDrag(-400, 0);
        figure._real_update();

        pixel = await figure.readPixel(test_x, test_y);
        expect(pixel).to.be.deep.equals(pixel_original);
    });
    it("with color scale", async function() {
        const x = data_float32([0.5]);
        const y = data_float32([10]);
        const z = data_float32([0.5]);
        const color = data_float32([0.5]);
        const color_scale = create_color_scale(this.manager, "color_scale", 0, 1);
        const { scatter, figure } = await create_figure_scatter(this.manager, [x], [y], [z], {color_scale: "IPY_MODEL_color_scale", color});
        scatter.model.set("size", 20);
        figure._real_update();
        const pixel = await figure.readPixel(test_x, test_y);
        let [red, green, blue, alpha] = pixel;
        expect(red).to.lt(10);
        expect(green).to.be.gt(150);
        expect(blue).to.lt(10);
        expect(alpha).to.eq(255);

        scatter.model.set("color", new Float32Array([0.0]));
        figure._real_update();
        [red, green, blue, alpha] = await figure.readPixel(test_x, test_y);
        expect(red).to.be.gt(150);
        expect(green).to.lt(10);
        expect(blue).to.lt(10);
        expect(alpha).to.eq(255);

        scatter.model.set("color", new Float32Array([1.0]));
        figure._real_update();
        [red, green, blue, alpha] = await figure.readPixel(test_x, test_y);
        expect(red).to.lt(10);
        expect(green).to.lt(10);
        expect(blue).to.be.gt(150);
        expect(alpha).to.eq(255);

    });
});
