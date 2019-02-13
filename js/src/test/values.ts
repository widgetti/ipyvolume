import { Values } from "../values";
import { expect } from 'chai';

describe("values >", () => {
    it("merge float32", () => {
        let arrays = {'x': new Float32Array([1,2]), 'y': new Float32Array([3,4]), 'z': new Float32Array([5,6])}
        let getter = (name) => arrays[name]
        let values = new Values(['x', 'y', 'z'], [], getter, 0)
        values.merge_to_vec3(['x', 'y', 'z'], 'pos')
        expect(Array.prototype.slice.call(values.array_vec3.pos)).to.deep.equals([1,3,5,2,4,6])
    });
    it("merge float32 and int", () => {
        let arrays = {'x': new Float32Array([1,2]), 'y': new Float32Array([3,4]), 'z': new Int32Array([5,6])}
        let getter = (name) => arrays[name]
        let values = new Values(['x', 'y', 'z'], [], getter, 0)
        values.merge_to_vec3(['x', 'y', 'z'], 'pos')
        expect(Array.prototype.slice.call(values.array_vec3.pos)).to.deep.equals([1,3,5,2,4,6])
    });
});