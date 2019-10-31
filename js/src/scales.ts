import * as d3 from "d3";
import { Material, ShaderMaterial } from "three";

// We also do this in bqplot, does that make sense?
// tslint:disable-next-line: no-var-requires
const shader_scales = (require("raw-loader!../glsl/scales.glsl") as any).default;
const shader_scales_mod = (require("raw-loader!../glsl/scales.glsl") as any);

export
const scaleTypeMap = {
    linear: 1,
    log: 2,
};

export
function patchMaterial(material: any) {
    material.onBeforeCompile = (shader) => {
        shader.vertexShader = // this is the fragment program string in the template format
        shader.vertexShader.replace( // we have to transform the string
            "#include <scales>", // we will swap out this chunk
            shader_scales,
        );
    };
}

export
function createD3Scale(scale) {
    if (scale.type === "linear") {
        return d3.scaleLinear().domain(scale.domain);
    } else if (scale.type === "log") {
        return d3.scaleLog().domain(scale.domain);
    } else {
        throw new Error("Scale not supported: " + scale);
    }
}
