// This file contains the javascript that is run when the notebook is loaded.
// It contains some requirejs configuration and the `load_ipython_extension`
// which is required for any notebook extension.

// Configure requirejs
if ((window as any).require) {
    (window as any).require.config({
        map: {
            "*" : {
                "ipyvolume": "nbextensions/ipyvolume/index",
                "jupyter-js-widgets": "nbextensions/jupyter-js-widgets/extension",
            },
        },
    });
}

// Export the required load_ipython_extention
// tslint:disable-next-line: no-empty
export function load_ipython_extension() {}
