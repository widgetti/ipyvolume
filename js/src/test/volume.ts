import { expect } from "chai";
import * as ipyvolume from "../";
import {DummyManager} from "./dummy-manager";
import {create_figure_volume, create_transfer_function, data_float32, data_uint32} from "./widget-utils";

// text pixel coordinate
const test_x = 300;
const test_y = 300;
const pixel_red = [255, 0, 0, 255];

describe("mesh >", () => {
    beforeEach(async function() {
        this.manager = new DummyManager({ipyvolume});
    });

    it("canvas/png render check", async function() {
        const tf = await create_transfer_function(this.manager);
        const tiles = new Uint8Array([201, 201, 201, 0, 127, 127, 255, 255, 255, 127, 127, 255, 0, 0, 0, 255, 127,
             255, 127, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255]);
        const data = {
                tiles,
                image_shape: [4, 2],
                slice_shape: [2, 2],
                rows: 1,
                columns: 2,
                slices: 2,
            };
        const extent = [[0, 2], [0, 2], [0, 2]];
        const { volume, figure } = await create_figure_volume(this.manager, data, extent, tf);
        figure._real_update();
        const pixel = await figure.debug_readPixel(test_x, test_y);
        const [red, green, blue, alpha] = pixel;
        expect(red).to.be.eq(0);
        expect(green).to.gt(120); // this gives different results on travis/headless
        expect(blue).to.eq(0);
        expect(alpha).to.eq(255);
    });
});
