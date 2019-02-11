// some helper functions to quickly create widgets

export
async function create_model_ipyvolume(manager, name: string, id: string, args: Object) {
    return create_model(manager, 'ipyvolume', `${name}Model`, `${name}View`, id, args);
}

export
async function create_model(manager, module: string, model: string, view: string, id: string, args = {}) {
    let model_widget = await manager.new_widget({
            model_module: module,
            model_name: model,
            model_module_version : '*',
            view_module: module,
            view_name: view,
            view_module_version: '*',
            model_id: id,
    }, args );
    return model_widget;
   
}

export
async function create_view(manager, model, options = {}) {
    let view = await manager.create_view(model, options);
    return view;
}

export
async function create_widget(manager, name: string, id: string, args: Object) {
    let model = await create_model_ipyvolume(manager, name, id, args)
    let view = await manager.create_view(model);
    await manager.display_view(undefined, view);
    return {model: model, view:view};
}

export
async function create_figure_scatter(manager, x, y, z) {
    let layout = await create_model(manager, '@jupyter-widgets/base', 'LayoutModel', 'LayoutView', 'layout_figure1', {_dom_classes: '', width: '400px', height: '500px'})

    let scatterModel = await create_model_ipyvolume(manager, 'Scatter', 'scatter1', {
        x: x, y: y, z: z, _view_module_version: '*', _view_module: 'ipyvolume'})
    let figureModel;
    try {
        figureModel = await create_model_ipyvolume(manager, 'Figure', 'figure1', {
            layout: 'IPY_MODEL_layout_figure1',
            scatters: ['IPY_MODEL_scatter1'],
            meshes: [],
            volumes: []
        })
    } catch(e) {
        console.error('error', e)
    }
    let figure  = await create_view(manager, figureModel);
    await manager.display_view(undefined, figure);
    return {figure: figure, scatter: await figure.scatter_views[scatterModel.cid]}
}
export
function data_float32 (ar) {
    return { dtype: 'float32', data: new Float32Array([...ar]) };
}
