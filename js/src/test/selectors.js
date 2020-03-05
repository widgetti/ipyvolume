import { LassoSelector, CircleSelector, RectangleSelector } from "../selectors";
import { expect } from 'chai';

const color_inside = [255, 0, 0, 128];
const color_outside = [0, 0, 0, 0];

describe("Selector", () => {
    it("Lasso", () => {
        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');
        canvas.width = 20;
        canvas.height = 20;
        let selector = new LassoSelector(canvas);
        selector.mouseMove(0, 0);
        selector.mouseMove(10, 0);
        selector.mouseMove(0, 10);
        selector.draw();
        let data_inside = context.getImageData(2,2,1,1)
        let data_outside = context.getImageData(10,10,1,1)
        expect(Array.prototype.slice.call(data_inside.data)).to.deep.equals(color_inside)
        expect(Array.prototype.slice.call(data_outside.data)).to.deep.equals(color_outside)

        let path_data = selector.getData(10, 10)
        expect(path_data['pixel']).to.deep.equals([[0, 0], [10, 0], [0, 10]])
        expect(path_data['device']).to.deep.equals([[-1, 1], [1, 1], [-1, -1]])
        expect(path_data['type']).to.equal('lasso');

        selector.close()
        data_inside = context.getImageData(2,2,1,1)
        data_outside = context.getImageData(10,10,1,1)
        expect(Array.prototype.slice.call(data_inside.data)).to.deep.equals(color_outside)
        expect(Array.prototype.slice.call(data_outside.data)).to.deep.equals(color_outside)
    });
    it("Circle", () => {
        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');
        canvas.width = 20;
        canvas.height = 20;
        let selector = new CircleSelector(canvas);
        selector.mouseMove(0, 0);
        selector.mouseMove(5, 0);
        selector.draw();
        let data_inside = context.getImageData(2,2,1,1)
        let data_outside = context.getImageData(10,10,1,1)
        expect(Array.prototype.slice.call(data_inside.data)).to.deep.equals(color_inside)
        expect(Array.prototype.slice.call(data_outside.data)).to.deep.equals(color_outside)

        let path_data = selector.getData(10, 10)
        expect(path_data['pixel']['begin']).to.deep.equals([0, 0])
        expect(path_data['pixel']['end']).to.deep.equals([5, 0])
        expect(path_data['device']['begin']).to.deep.equals([-1, 1])
        expect(path_data['device']['end']).to.deep.equals([0, 1])
        expect(path_data['type']).to.equal('circle');

        selector.mouseMove(0, 10);
        path_data = selector.getData(10, 10)
        expect(path_data['pixel']['begin']).to.deep.equals([0, 0])
        expect(path_data['pixel']['end']).to.deep.equals([0, 10])
        expect(path_data['device']['begin']).to.deep.equals([-1, 1])
        expect(path_data['device']['end']).to.deep.equals([-1, -1])
        expect(path_data['type']).to.equal('circle');

        selector.close()
        data_inside = context.getImageData(2,2,1,1)
        data_outside = context.getImageData(10,10,1,1)
        expect(Array.prototype.slice.call(data_inside.data)).to.deep.equals(color_outside)
        expect(Array.prototype.slice.call(data_outside.data)).to.deep.equals(color_outside)
    });
    it("Rectangle", () => {
        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');
        canvas.width = 20;
        canvas.height = 20;
        let selector = new RectangleSelector(canvas);
        selector.mouseMove(0, 0);
        selector.mouseMove(5, 5);
        selector.draw();
        let data_inside = context.getImageData(2,2,1,1)
        let data_outside = context.getImageData(10,10,1,1)
        expect(Array.prototype.slice.call(data_inside.data)).to.deep.equals(color_inside)
        expect(Array.prototype.slice.call(data_outside.data)).to.deep.equals(color_outside)

        let path_data = selector.getData(10, 10)
        expect(path_data['pixel']['begin']).to.deep.equals([0, 0])
        expect(path_data['pixel']['end']).to.deep.equals([5, 5])
        expect(path_data['device']['begin']).to.deep.equals([-1, 1])
        expect(path_data['device']['end']).to.deep.equals([0, 0])
        expect(path_data['type']).to.equal('rectangle');

        selector.mouseMove(5, 10);
        path_data = selector.getData(10, 10)
        expect(path_data['pixel']['begin']).to.deep.equals([0, 0])
        expect(path_data['pixel']['end']).to.deep.equals([5, 10])
        expect(path_data['device']['begin']).to.deep.equals([-1, 1])
        expect(path_data['device']['end']).to.deep.equals([0, -1])
        expect(path_data['type']).to.equal('rectangle');

        selector.close()
        data_inside = context.getImageData(2,2,1,1)
        data_outside = context.getImageData(10,10,1,1)
        expect(Array.prototype.slice.call(data_inside.data)).to.deep.equals(color_outside)
        expect(Array.prototype.slice.call(data_outside.data)).to.deep.equals(color_outside)
    });
});
