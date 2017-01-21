import ipywidgets as widgets
import ipywidgets

from traitlets import Unicode
import traitlets
from traittypes import Array
import logging
import numpy as np
from .serialize import array_cube_png_serialization
from .transferfunction import *

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
    angle1 = traitlets.Float(0.1).tag(sync=True)
    angle2 = traitlets.Float(0.2).tag(sync=True)
    def __init__(self, **kwargs):
        super(Volume, self).__init__(**kwargs)


def _volume_widets(v):
    import ipywidgets
    #angle1 = ipywidgets.FloatSlider(min=0, max=np.pi*2, value=v.angle1, description="angle1")
    #angle2 = ipywidgets.FloatSlider(min=0, max=np.pi*2, value=v.angle2, description="angle2")
    #ipywidgets.jslink((v, 'angle1'), (angle1, 'value'))
    #ipywidgets.jslink((v, 'angle2'), (angle2, 'value'))
    return ipywidgets.VBox(
        [v.tf.control(), v] # , ipywidgets.HBox([angle1, angle2])
    )

def volshow(data, **kwargs):
    if "tf" not in kwargs:
        kwargs["tf"] = TransferFunctionWidgetJs3(**kwargs)
    v = Volume(volume=data, **kwargs)
    return _volume_widets(v)

import jupyter_sphinx