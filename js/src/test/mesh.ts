import * as bqplot from "bqplot";
import { expect } from "chai";
import * as ipyvolume from "../";
import {DummyManager} from "./dummy-manager";
import {create_color_scale, create_figure_mesh_triangles, data_float32, data_uint32} from "./widget-utils";

// text pixel coordinate
const test_x = 250;
const test_y = 200;
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
    it("with color scale", async function() {
        const x = data_float32([0.0, 0, 1., 1.]);
        const y = data_float32([0.1, 1000.0, 0.1, 1000.0]);
        const z = data_float32([0.5, 0.5, 0.5, 0.5]);
        const color = data_float32([0.5, 0.5, 0.5, 0.5]);
        const color_scale = create_color_scale(this.manager, "color_scale", 0, 1);
        const { mesh, figure } = await create_figure_mesh_triangles(this.manager, [x], [y], [z], [data_uint32([0, 2, 3, 0, 3, 1])], {color_scale: "IPY_MODEL_color_scale", color: [color]});
        figure._real_update();
        const pixel = await figure.readPixel(test_x, test_y);
        let [red, green, blue, alpha] = pixel;
        expect(red).to.lt(10);
        expect(green).to.be.gt(150);
        expect(blue).to.lt(10);
        expect(alpha).to.eq(255);

        const color2 = [new Float32Array([0.0, 0.25, 0.5, 1.0])];
        // TODO: the deserializers may need some refactoring, this is ugly
        (color2 as any).original_data = [{shape: [4]}];
        mesh.model.set("color", color2);
        figure._real_update();
        // right upper corner (blue)
        [red, green, blue, alpha] = await figure.readPixel(test_x + 100, test_y - 100);
        expect(red).to.lt(30);
        expect(green).to.lt(30);
        expect(blue).to.be.gt(150);
        expect(alpha).to.eq(255);

        [red, green, blue, alpha] = await figure.readPixel(test_x + 100, test_y + 100);
        expect(red).to.lt(30);
        expect(green).to.be.gt(150);
        expect(blue).to.lt(30);
        expect(alpha).to.eq(255);

    });
});
