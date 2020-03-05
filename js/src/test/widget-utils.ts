// some helper functions to quickly create widgets

export
async function create_model_ipyvolume(manager, name: string, id: string, args: object) {
    return create_model(manager, "ipyvolume", `${name}Model`, `${name}View`, id, args);
}

export
async function create_model(manager, module: string, model: string, view: string, id: string, args = {}) {
    const model_widget = await manager.new_widget({
            model_module: module,
            model_name: model,
            model_module_version : "*",
            view_module: module,
            view_name: view,
            view_module_version: "*",
            model_id: id,
    }, args );
    return model_widget;

}

export
async function create_view(manager, model, options = {}) {
    const view = await manager.create_view(model, options);
    return view;
}

export
async function create_widget(manager, name: string, id: string, args: object) {
    const model = await create_model_ipyvolume(manager, name, id, args);
    const view = await manager.create_view(model);
    await manager.display_view(undefined, view);
    return {model, view};
}

export
async function create_figure_scatter(manager, x, y, z) {
    const layout = await create_model(manager, "@jupyter-widgets/base", "LayoutModel", "LayoutView", "layout_figure1", {_dom_classes: "", width: "400px", height: "500px"});

    const scatterModel = await create_model_ipyvolume(manager, "Scatter", "scatter1", {
        x, y, z, _view_module_version: "*", _view_module: "ipyvolume"});
    let figureModel;
    try {
        figureModel = await create_model_ipyvolume(manager, "Figure", "figure1", {
            layout: "IPY_MODEL_layout_figure1",
            scatters: ["IPY_MODEL_scatter1"],
            meshes: [],
            volumes: [],
            animation: 0,
        });
    } catch (e) {
        console.error("error", e);
    }
    const figure  = await create_view(manager, figureModel);
    await manager.display_view(undefined, figure);
    return {figure, scatter: await figure.scatter_views[scatterModel.cid]};
}

export
async function create_figure_mesh_triangles(manager, x, y, z, triangles) {
    const layout = await create_model(manager, "@jupyter-widgets/base", "LayoutModel", "LayoutView", "layout_figure1", {_dom_classes: "", width: "400px", height: "500px"});

    const meshModel = await create_model_ipyvolume(manager, "Mesh", "mesh1", {
        x, y, z, triangles, color: "red", _view_module_version: "*", _view_module: "ipyvolume"});
    let figureModel;
    try {
        figureModel = await create_model_ipyvolume(manager, "Figure", "figure1", {
            layout: "IPY_MODEL_layout_figure1",
            scatters: [],
            meshes: ["IPY_MODEL_mesh1"],
            volumes: [],
            animation: 0,
        });
    } catch (e) {
        console.error("error", e);
    }
    const figure  = await create_view(manager, figureModel);
    await manager.display_view(undefined, figure);
    return {figure, mesh: await figure.mesh_views[meshModel.cid]};
}

const tf_data = new Uint8Array([0, 0, 128, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 128, 63, 0, 0, 0, 0, 0, 0, 128, 63, 0, 0, 0, 0, 0, 0, 128, 63]);

export
async function create_transfer_function(manager) {
    const layout = await create_model(manager, "@jupyter-widgets/base", "LayoutModel", "LayoutView", "layout_tf_1", {_dom_classes: ""});

    const tfModel = await create_model_ipyvolume(manager, "TransferFunction", "tf1", {
        _dom_classes: [],
        layout: "IPY_MODEL_layout_tf_1",
        rgba: {
            data: tf_data,
            dtype: "float32",
            shape: [2, 4],
        }},
    );
    return tfModel;
}

export
async function create_figure_volume(manager, data, extent, transfer_function) {
    const layout = await create_model(manager, "@jupyter-widgets/base", "LayoutModel", "LayoutView", "layout_figure1", {_dom_classes: "", width: "400px", height: "500px"});

    const volumeModel = await create_model_ipyvolume(manager, "Volume", "volume1", {
        data, extent, tf: "IPY_MODEL_" + String(transfer_function.model_id), _view_module_version: "*", _view_module: "ipyvolume"});
    let figureModel;
    try {
        figureModel = await create_model_ipyvolume(manager, "Figure", "figure1", {
            layout: "IPY_MODEL_layout_figure1",
            scatters: [],
            meshes: [],
            volumes: ["IPY_MODEL_volume1"],
            animation: 0,
        });
    } catch (e) {
        console.error("error", e);
    }
    const figure = await create_view(manager, figureModel);
    await manager.display_view(undefined, figure);
    return {figure, volume: await figure.mesh_views[volumeModel.cid]};
}

export
function data_float32(ar) {
    return { dtype: "float32", data: new Float32Array([...ar]), shape: [ar.length] };
}
export
function data_uint32(ar) {
    return { dtype: "uint32", data: new Uint32Array([...ar]), shape: [ar.length]  };
}
