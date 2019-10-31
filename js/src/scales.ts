import { Material, ShaderMaterial } from "three";

// We also do this in bqplot, does that make sense?
// tslint:disable-next-line: no-var-requires
const shader_scales = (require("raw-loader!../glsl/scales.glsl") as any).default;
const shader_scales_mod = (require("raw-loader!../glsl/scales.glsl") as any);

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
