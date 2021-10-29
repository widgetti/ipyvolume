from pathlib import Path
import ipyvuetify as v
import ipyvue
import ipywidgets as widgets
import traitlets
import ipyvolume

HERE = Path(__file__).parent
VUE_DIR = HERE / 'vue'


class Legend(v.VuetifyTemplate):
    template_file = str(VUE_DIR / 'legend.vue')
    models = traitlets.Any({'figure': {
        'scatters': [], 'meshes': [], 'volumes': []
    }}).tag(sync=True)
    figure = traitlets.Instance(ipyvolume.Figure).tag(sync=True, **widgets.widget_serialization)


class Container(v.VuetifyTemplate):
    template_file = str(VUE_DIR / 'container.vue')
    figure = traitlets.Instance(ipyvolume.Figure).tag(sync=True, **widgets.widget_serialization)
    legend = traitlets.Instance(Legend).tag(sync=True, **widgets.widget_serialization)
    legend_show = traitlets.Bool(True).tag(sync=True)
    children = traitlets.List().tag(sync=True, **widgets.widget_serialization)
    models = traitlets.Any({'figure': {}}).tag(sync=True)
    panels = traitlets.List(traitlets.CInt(), default_value=[0, 1, 2]).tag(sync=True)


class Popup(v.VuetifyTemplate):
    template_file = str(VUE_DIR / 'popup.vue')

    value = traitlets.Integer(0).tag(sync=True)
    description = traitlets.Unicode('Label').tag(sync=True)
    icon = traitlets.Unicode('mdi-chart-bubble').tag(sync=True)
    color = traitlets.Unicode('orange').tag(sync=True)

    extra_html = traitlets.Unicode('').tag(sync=True)
    record = traitlets.Dict(allow_none=True).tag(sync=True)


def watch():
    ipyvue.watch(str(VUE_DIR))
