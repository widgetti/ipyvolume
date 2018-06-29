import { FigureModel, FigureView, WidgetManagerHackModel } from "../src/figure.js";
import { expect } from 'chai';

describe("figure >", () => {
    it("smoke test", () => {
        expect(FigureModel).to.be.not.undefined;
        expect(FigureView).to.be.not.undefined;
        expect(WidgetManagerHackModel).to.be.not.undefined;
    });
});