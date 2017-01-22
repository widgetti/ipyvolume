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

    ambient_coefficient = traitlets.Float(0.5).tag(sync=True)
    diffuse_coefficient = traitlets.Float(0.8).tag(sync=True)
    specular_coefficient = traitlets.Float(0.5).tag(sync=True)
    specular_exponent = traitlets.Float(5).tag(sync=True)

    def __init__(self, **kwargs):
        super(Volume, self).__init__(**kwargs)


def _volume_widets(v, lighting=False):
    import ipywidgets
    #angle1 = ipywidgets.FloatSlider(min=0, max=np.pi*2, value=v.angle1, description="angle1")
    #angle2 = ipywidgets.FloatSlider(min=0, max=np.pi*2, value=v.angle2, description="angle2")
    #ipywidgets.jslink((v, 'angle1'), (angle1, 'value'))
    #ipywidgets.jslink((v, 'angle2'), (angle2, 'value'))
    if lighting:
        ambient_coefficient = ipywidgets.FloatSlider(min=0, max=1, step=0.001, value=v.ambient_coefficient, description="ambient")
        diffuse_coefficient = ipywidgets.FloatSlider(min=0, max=1, step=0.001, value=v.diffuse_coefficient, description="diffuse")
        specular_coefficient = ipywidgets.FloatSlider(min=0, max=1, step=0.001, value=v.specular_coefficient, description="specular")
        specular_exponent = ipywidgets.FloatSlider(min=0, max=10, step=0.001, value=v.specular_exponent, description="specular exp")
        #angle2 = ipywidgets.FloatSlider(min=0, max=np.pi*2, value=v.angle2, description="angle2")
        ipywidgets.jslink((v, 'ambient_coefficient'), (ambient_coefficient, 'value'))
        ipywidgets.jslink((v, 'diffuse_coefficient'), (diffuse_coefficient, 'value'))
        ipywidgets.jslink((v, 'specular_coefficient'), (specular_coefficient, 'value'))
        ipywidgets.jslink((v, 'specular_exponent'), (specular_exponent, 'value'))
        widgets_bottom = [ipywidgets.HBox([ambient_coefficient, diffuse_coefficient]),
         ipywidgets.HBox([specular_coefficient, specular_exponent])]
    else:
        widgets_bottom = []
        v.ambient_coefficient = 1
        v.diffuse_coefficient = 0
        v.specular_coefficient = 0

    return ipywidgets.VBox(
        [v.tf.control(), v,
         ] + widgets_bottom# , ipywidgets.HBox([angle1, angle2])
    )

def volshow(data, lighting=False, **kwargs):
    if "tf" not in kwargs:
        kwargs["tf"] = TransferFunctionWidgetJs3(**kwargs)
    v = Volume(volume=data, **kwargs)
    return _volume_widets(v, lighting=lighting)

