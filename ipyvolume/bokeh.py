from __future__ import absolute_import
from bokeh.models import CustomJS
from bokeh.plotting import figure
import ipyvolume
import ipywidgets as widgets
from traitlets import Unicode

semver_range_frontend = "~" + ipyvolume._version.__version_js__

@widgets.register('ipyvolume.WidgetManagerHack')
class WidgetManagerHackModel(widgets.Widget):
    _model_name = Unicode('WidgetManagerHackModel').tag(sync=True)
    _model_module = Unicode('ipyvolume').tag(sync=True)
    _model_module_version = Unicode(semver_range_frontend).tag(sync=True)

wmh = None
def _ensure_widget_manager_hack():
    global wmh
    if not wmh:
        wmh = WidgetManagerHackModel()
def link_data_source_selection_to_widget(data_source, widget, trait_name):
    _ensure_widget_manager_hack()
    callback = CustomJS(args=dict(data=data_source), code="""

    var indices = data.selected["1d"].indices
    var widget_id = '%s'
    if(jupyter_widget_manager) {
        // MYSTERY: if we use require, we end up at bokeh's require, which cannot find it, using requirejs it seems to work
        requirejs(["@jupyter-widgets/base"], function(widgets) {
            var widget_promise = widgets.unpack_models('IPY_MODEL_' +widget_id, jupyter_widget_manager)
            widget_promise.then(function(widget) {
                     widget.set(%r, indices)
                     widget.save_changes()
            })
        })
    } else {
        console.error("no widget manager")
    }

    """ % (widget.model_id, trait_name))
    data_source.js_on_change("selected", callback)
