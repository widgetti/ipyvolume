
import * as THREE from "three";
import { patchShader } from "./scales";

export
class MeshDepthMaterialCustom extends (THREE as any).MeshDepthMaterial {
    constructor(defines, uniforms, vertexShader, fragmentShader, parameters) {
        super(parameters);
        this.defines = defines;
        this.uniforms = uniforms;
        this.onBeforeCompile = (shader) => {
            // const defines = this.defines();
            const defines = {DEPTH_PACKING:3201, ...this.defines()};
            let define_code = "";
            for (const key of Object.keys(defines)) {
                if (defines[key]) {
                    define_code += `#define ${key} ${defines[key]}\n`;
                }
            }
            shader.vertexShader = patchShader(define_code + vertexShader);
            shader.fragmentShader = patchShader(define_code + fragmentShader);
            // shallow copy the uniforms, so we share them (e.g. updating time)
            shader.uniforms = {...shader.uniforms, ...this.uniforms};
        };
    }
}

export
class MeshDistanceMaterialCustom extends (THREE as any).MeshDistanceMaterial {
    constructor(defines, uniforms, vertexShader, fragmentShader, parameters) {
        super(parameters);
        this.defines = defines;
        this.uniforms = uniforms;
        this.onBeforeCompile = (shader) => {
            const defines = this.defines();
            let define_code = "";
            for (const key of Object.keys(defines)) {
                if (defines[key]) {
                    define_code += `#define ${key} ${defines[key]}\n`;
                }
            }
            shader.vertexShader = patchShader(define_code + vertexShader);
            shader.fragmentShader = patchShader(define_code + fragmentShader);
            // shallow copy the uniforms, so we share them (e.g. updating time)
            shader.uniforms = {...shader.uniforms, ...this.uniforms};
        };
    }
}
