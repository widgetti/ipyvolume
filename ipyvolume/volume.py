import ipywidgets as widgets
import ipywidgets

from traitlets import Unicode
import traitlets
from traittypes import Array
import logging
import numpy as np
from .serialize import array_cube_png_serialization
from .transferfunction import TransferFunction

logger = logging.getLogger("ipyvolume")


@widgets.register('ipyvolume.Volume')
class Volume(widgets.DOMWidget):
    """"""
    _view_name = Unicode('VolumeView').tag(sync=True)
    _model_name = Unicode('VolumeModel').tag(sync=True)
    _view_module = Unicode('ipyvolume').tag(sync=True)
    _model_module = Unicode('ipyvolume').tag(sync=True)
    volume = Array().tag(sync=True, **array_cube_png_serialization)
    tf = traitlets.Instance(TransferFunction).tag(sync=True, **ipywidgets.widget_serialization)
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
    angle1 = traitlets.Float(0.1).tag(sync=True)
    angle2 = traitlets.Float(0.2).tag(sync=True)
    def __init__(self, **kwargs):
        super(Volume, self).__init__(**kwargs)


def _volume_widets(v):
    import ipywidgets
    angle1 = ipywidgets.FloatSlider(min=0, max=np.pi*2, value=v.angle1, description="angle1")
    angle2 = ipywidgets.FloatSlider(min=0, max=np.pi*2, value=v.angle2, description="angle2")
    l1 = ipywidgets.FloatSlider(min=0, max=1, value=v.level1, description="level1")
    l2 = ipywidgets.FloatSlider(min=0, max=1, value=v.level2, description="level2")
    l3 = ipywidgets.FloatSlider(min=0, max=1, value=v.level3, description="level3")
    o1 = ipywidgets.FloatSlider(min=0, max=0.1, step=0.01, value=v.opacity1, description="opacity1")
    o2 = ipywidgets.FloatSlider(min=0, max=0.1, step=0.01, value=v.opacity2, description="opacity2")
    o3 = ipywidgets.FloatSlider(min=0, max=0.1, step=0.01, value=v.opacity2, description="opacity3")
    ipywidgets.jslink((v, 'level1'), (l1, 'value'))
    ipywidgets.jslink((v, 'level2'), (l2, 'value'))
    ipywidgets.jslink((v, 'level3'), (l3, 'value'))
    ipywidgets.jslink((v, 'opacity1'), (o1, 'value'))
    ipywidgets.jslink((v, 'opacity2'), (o2, 'value'))
    ipywidgets.jslink((v, 'opacity3'), (o3, 'value'))
    ipywidgets.jslink((v, 'angle1'), (angle1, 'value'))
    ipywidgets.jslink((v, 'angle2'), (angle2, 'value'))
    #ipywidgets.HBox([l1, l2, l3]), ipywidgets.HBox([o1, o2, o3]),
    return ipywidgets.VBox(
        [v.tf.control(), v, ipywidgets.HBox([angle1, angle2])]
    )


def volume(data, **kwargs):
    v = Volume(volume=data, **kwargs)
    return _volume_widets(v)