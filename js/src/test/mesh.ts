import * as bqplot from "bqplot";
import { expect } from "chai";
import * as ipyvolume from "../";
import {DummyManager} from "./dummy-manager";
import {create_figure_mesh_triangles, data_float32, data_uint32} from "./widget-utils";

// text pixel coordinate
const test_x = 300;
const test_y = 300;
const pixel_red = [255, 0, 0, 255];

describe("mesh >", () => {
    beforeEach(async function() {
        this.manager = new DummyManager({ipyvolume, bqplot});
    });

    it("canvas/png render check", async function() {
        const x = data_float32([0.0, 0, 1., 1.]);
        const y = data_float32([0.1, 1000.0, 0.1, 1000.0]);
        const z = data_float32([0.5, 0.5, 0.5, 0.5]);
        const { mesh, figure } = await create_figure_mesh_triangles(this.manager, [x], [y], [z], [data_uint32([0, 2, 3, 0, 3, 1])]);
        figure._real_update();
        const pixel = await figure.readPixel(test_x, test_y);
        const [red, green, blue, alpha] = pixel;
        expect(red).to.be.gt(150);
        expect(green).to.eq(0);
        expect(blue).to.eq(0);
        expect(alpha).to.eq(255);
    });
});
