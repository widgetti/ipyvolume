import ipywidgets as widgets
from traitlets import Unicode
import traitlets

@widgets.register('ipyvolume.Volume')
class Volume(widgets.DOMWidget):
    """"""
    _view_name = Unicode('VolumeView').tag(sync=True)
    _model_name = Unicode('VolumeModel').tag(sync=True)
    _view_module = Unicode('ipyvolume').tag(sync=True)
    _model_module = Unicode('ipyvolume').tag(sync=True)
    value = Unicode('').tag(sync=True)
    level1 = traitlets.Float(0.1).tag(sync=True)
    level2 = traitlets.Float(0.5).tag(sync=True)
    level3 = traitlets.Float(0.8).tag(sync=True)
    opacity1 = traitlets.Float(0.04).tag(sync=True)
    opacity2 = traitlets.Float(0.01).tag(sync=True)
    opacity3 = traitlets.Float(0.1).tag(sync=True)
    width1 = traitlets.Float(0.1).tag(sync=True)
    width2 = traitlets.Float(0.1).tag(sync=True)
    width3 = traitlets.Float(0.2).tag(sync=True)
    def __init__(self, **kwargs):
        super(Volume, self).__init__(**kwargs)
