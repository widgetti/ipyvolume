import { expect } from "chai";
import { Values } from "../values";

describe("values >", () => {
    it("merge float32", () => {
        const arrays = {x: new Float32Array([1, 2]), y: new Float32Array([3, 4]), z: new Float32Array([5, 6])};
        const getter = (name) => arrays[name];
        const values = new Values(["x", "y", "z"], [], getter, 0);
        values.merge_to_vec3(["x", "y", "z"], "vertices");
        expect(Array.prototype.slice.call(values.array_vec3.vertices)).to.deep.equals([1, 3, 5, 2, 4, 6]);
    });
    it("merge float32 and int", () => {
        const arrays = {x: new Float32Array([1, 2]), y: new Float32Array([3, 4]), z: new Int32Array([5, 6])};
        const getter = (name) => arrays[name];
        const values = new Values(["x", "y", "z"], [], getter, 0);
        values.merge_to_vec3(["x", "y", "z"], "vertices");
        expect(Array.prototype.slice.call(values.array_vec3.vertices)).to.deep.equals([1, 3, 5, 2, 4, 6]);
    });
});
