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

@widgets.register('ipyvolume.VolumeRendererThree')
class VolumeRendererThree(widgets.DOMWidget):
    """Widget class representing a volume (rendering) using three.js"""
    _view_name = Unicode('VolumeRendererThreeView').tag(sync=True)
    _view_module = Unicode('ipyvolume').tag(sync=True)
    _model_name = Unicode('VolumeRendererThreeModel').tag(sync=True)
    _model_module = Unicode('ipyvolume').tag(sync=True)

    data = Array().tag(sync=True, **array_cube_png_serialization)
    data_min = traitlets.CFloat().tag(sync=True)
    data_max = traitlets.CFloat().tag(sync=True)
    tf = traitlets.Instance(TransferFunction).tag(sync=True, **ipywidgets.widget_serialization)
    angle1 = traitlets.Float(0.1).tag(sync=True)
    angle2 = traitlets.Float(0.2).tag(sync=True)

    ambient_coefficient = traitlets.Float(0.5).tag(sync=True)
    diffuse_coefficient = traitlets.Float(0.8).tag(sync=True)
    specular_coefficient = traitlets.Float(0.5).tag(sync=True)
    specular_exponent = traitlets.Float(5).tag(sync=True)
    stereo = traitlets.Bool(False).tag(sync=True)
    fullscreen = traitlets.Bool(False).tag(sync=True)

    width = traitlets.CInt(500).tag(sync=True)
    height = traitlets.CInt(400).tag(sync=True)
    downscale = traitlets.CInt(1).tag(sync=True)


@widgets.register('ipyvolume.Volume')
class Volume(widgets.DOMWidget):
    """Widget class representing a volume (rendering)"""
    _view_name = Unicode('VolumeView').tag(sync=True)
    _model_name = Unicode('VolumeModel').tag(sync=True)
    _view_module = Unicode('ipyvolume').tag(sync=True)
    _model_module = Unicode('ipyvolume').tag(sync=True)
    data = Array().tag(sync=True, **array_cube_png_serialization)
    data_min = traitlets.CFloat().tag(sync=True)
    data_max = traitlets.CFloat().tag(sync=True)
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

    if 1:
        stereo = widgets.ToggleButton(value=v.stereo, description='stereo', icon='eye')
        fullscreen = widgets.ToggleButton(value=v.stereo, description='fullscreen', icon='arrows-alt')
        ipywidgets.jslink((v, 'stereo'), (stereo, 'value'))
        ipywidgets.jslink((v, 'fullscreen'), (fullscreen, 'value'))
        widgets_bottom += [ipywidgets.HBox([stereo,fullscreen])]

    return ipywidgets.VBox(
        [v.tf.control(), v,
         ] + widgets_bottom# , ipywidgets.HBox([angle1, angle2])
    )

def volshow(data, lighting=False, data_min=None, data_max=None, tf=None, stereo=False,
            width=400, height=500,
            ambient_coefficient=0.5, diffuse_coefficient=0.8,
            specular_coefficient=0.5, specular_exponent=5,
            downscale=1,
            level=[0.1, 0.5, 0.9], opacity=[0.01, 0.05, 0.1], level_width=0.1, **kwargs):
    """
    Visualize a 3d array using volume rendering

    :param data: 3d numpy array
    :param lighting: boolean, to use lighting or not, if set to false, lighting parameters will be overriden
    :param data_min: minimum value to consider for data, if None, computed using np.nanmin
    :param data_max: maximum value to consider for data, if None, computed using np.nanmax
    :param tf: transfer function (see ipyvolume.transfer_function, or use the argument below)
    :param stereo: stereo view for virtual reality (cardboard and similar VR head mount)
    :param width: width of rendering surface
    :param height: height of rendering surface
    :param ambient_coefficient: lighting parameter
    :param diffuse_coefficient: lighting parameter
    :param specular_coefficient: lighting parameter
    :param specular_exponent: lighting parameter
    :param downscale: downscale the rendering for better performance, for instance when set to 2, a 512x512 canvas will show a 256x256 rendering upscaled, but it will render twice as fast.
    :param level: level(s) for the where the opacity in the volume peaks, maximum sequence of length 3
    :param opacity: opacity(ies) for each level, scalar or sequence of max length 3
    :param level_width: width of the (gaussian) bumps where the opacity peaks, scalar or sequence of max length 3
    :param kwargs: extra argument passed to Volume and default transfer function
    :return:

    """
    if tf is None:
        #tf = TransferFunctionJsBumps(**kwargs)
        tf_kwargs = {}
        # opacity and widths can be scalars
        try:
            opacity[0]
        except:
            opacity = [opacity] * 3
        try:
            level_width[0]
        except:
            level_width = [level_width] * 3
        #clip off lists
        min_length = min(len(level), len(level_width), len(opacity))
        level = list(level[:min_length])
        opacity = list(opacity[:min_length])
        level_width = list(level_width[:min_length])
        # append with zeros
        while len(level) < 3:
            level.append(0)
        while len(opacity) < 3:
            opacity.append(0)
        while len(level_width) < 3:
            level_width.append(0)
        for i in range(1,4):
            tf_kwargs["level"+str(i)] = level[i-1]
            tf_kwargs["opacity"+str(i)] = opacity[i-1]
            tf_kwargs["width"+str(i)] = level_width[i-1]
        tf = TransferFunctionWidgetJs3(**tf_kwargs)
    if data_min is None:
        data_min = np.nanmin(data)
    if data_max is None:
        data_max = np.nanmax(data)
    v = VolumeRendererThree(data=data, data_min=data_min, data_max=data_max, stereo=stereo,
                            width=width, height=height,
                            ambient_coefficient=ambient_coefficient,
                            diffuse_coefficient=diffuse_coefficient,
                            specular_coefficient=specular_coefficient,
                            specular_exponent=specular_exponent,
                            tf=tf, **kwargs)
    return _volume_widets(v, lighting=lighting)

