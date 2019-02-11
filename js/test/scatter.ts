// import {Figure} from '../src/Figure.js';
import {DummyManager} from './dummy-manager';
import { ScatterModel, ScatterView, FigureModel, FigureView } from "..";
import { expect } from 'chai';
import {create_model, create_figure_scatter, data_float32} from './widget-utils'
let ipyvolume = require('..');

describe("scatter >", () => {
    beforeEach(async function() {
        this.manager = new DummyManager({ipyvolume: ipyvolume});
    });

    it("create", async function() {
        let x = data_float32([0, 1]);
        let y = data_float32([2, 3]);
        let z = data_float32([0, 3]);
        let { scatter, figure } = await create_figure_scatter(this.manager, [x], [y], [z]);
        expect(scatter.model.get('x')[0][0]).to.equal(0);
        expect(scatter.model.get('x')[0][1]).to.equal(1);
    });
});
