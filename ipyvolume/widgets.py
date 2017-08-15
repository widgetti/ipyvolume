from __future__ import absolute_import
import ipywidgets as widgets
import ipywidgets
from traittypes import Array
from ipyvolume.traittypes import Image
from traitlets import Unicode, Integer
import traitlets
import logging
import numpy as np
from .serialize import array_cube_png_serialization, array_serialization, array_sequence_serialization,\
    color_serialization, image_serialization, texture_serialization
from .transferfunction import *
import warnings
import ipyvolume
import ipywebrtc

logger = logging.getLogger("ipyvolume")

_last_volume_renderer = None
import ipyvolume._version
semver_range_frontend = "~" + ipyvolume._version.__version_js__

@widgets.register
class Mesh(widgets.DOMWidget):
    _view_name = Unicode('MeshView').tag(sync=True)
    _view_module = Unicode('ipyvolume').tag(sync=True)
    _model_name = Unicode('MeshModel').tag(sync=True)
    _model_module = Unicode('ipyvolume').tag(sync=True)
    _view_module_version = Unicode(semver_range_frontend).tag(sync=True)
    _model_module_version = Unicode(semver_range_frontend).tag(sync=True)
    x = Array(default_value=None).tag(sync=True, **array_sequence_serialization)
    y = Array(default_value=None).tag(sync=True, **array_sequence_serialization)
    z = Array(default_value=None).tag(sync=True, **array_sequence_serialization)
    u = Array(default_value=None, allow_none=True).tag(sync=True, **array_sequence_serialization)
    v = Array(default_value=None, allow_none=True).tag(sync=True, **array_sequence_serialization)
    triangles =  Array(default_value=None, allow_none=True).tag(sync=True, **array_serialization)
    lines =  Array(default_value=None, allow_none=True).tag(sync=True, **array_serialization)
    texture = traitlets.Union([
        traitlets.Instance(ipywebrtc.MediaStream),
        Unicode(),
        traitlets.List(Unicode, [], allow_none=True),
        Image(default_value=None, allow_none=True),
        traitlets.List(Image(default_value=None, allow_none=True))
    ]).tag(sync=True, **texture_serialization)

#    selected = Array(default_value=None, allow_none=True).tag(sync=True, **array_sequence_serialization)
    sequence_index = Integer(default_value=0).tag(sync=True)
    color = Array(default_value="red", allow_none=True).tag(sync=True, **color_serialization)
#    color_selected = traitlets.Union([Array(default_value=None, allow_none=True).tag(sync=True, **color_serialization),
#                                     Unicode().tag(sync=True)],
#                                     default_value="green").tag(sync=True)
#    geo = traitlets.Unicode('diamond').tag(sync=True)
    visible = traitlets.CBool(default_value=True).tag(sync=True)
    visible_lines = traitlets.CBool(default_value=True).tag(sync=True)
    visible_faces = traitlets.CBool(default_value=True).tag(sync=True)

@widgets.register
class Scatter(widgets.DOMWidget):
    _view_name = Unicode('ScatterView').tag(sync=True)
    _view_module = Unicode('ipyvolume').tag(sync=True)
    _model_name = Unicode('ScatterModel').tag(sync=True)
    _model_module = Unicode('ipyvolume').tag(sync=True)
    _view_module_version = Unicode(semver_range_frontend).tag(sync=True)
    _model_module_version = Unicode(semver_range_frontend).tag(sync=True)
    x = Array(default_value=None).tag(sync=True, **array_sequence_serialization)
    y = Array(default_value=None).tag(sync=True, **array_sequence_serialization)
    z = Array(default_value=None).tag(sync=True, **array_sequence_serialization)
    vx = Array(default_value=None, allow_none=True).tag(sync=True, **array_sequence_serialization)
    vy = Array(default_value=None, allow_none=True).tag(sync=True, **array_sequence_serialization)
    vz = Array(default_value=None, allow_none=True).tag(sync=True, **array_sequence_serialization)
    selected = Array(default_value=None, allow_none=True).tag(sync=True, **array_sequence_serialization)
    sequence_index = Integer(default_value=0).tag(sync=True)
    size = traitlets.Union([Array(default_value=None, allow_none=True).tag(sync=True, **array_sequence_serialization),
                           traitlets.Float().tag(sync=True)],
                           default_value=5).tag(sync=True)
    size_selected = traitlets.Union([Array(default_value=None, allow_none=True).tag(sync=True, **array_sequence_serialization),
                                    traitlets.Float().tag(sync=True)],
                                    default_value=7).tag(sync=True)
    color = Array(default_value="red", allow_none=True).tag(sync=True, **color_serialization)
    color_selected = traitlets.Union([Array(default_value=None, allow_none=True).tag(sync=True, **color_serialization),
                                     Unicode().tag(sync=True)],
                                     default_value="green").tag(sync=True)
    geo = traitlets.Unicode('diamond').tag(sync=True)
    connected = traitlets.CBool(default_value=False).tag(sync=True)



@widgets.register
class Figure(ipywebrtc.MediaStream):
    """Widget class representing a volume (rendering) using three.js"""
    _view_name = Unicode('FigureView').tag(sync=True)
    _view_module = Unicode('ipyvolume').tag(sync=True)
    _model_name = Unicode('FigureModel').tag(sync=True)
    _model_module = Unicode('ipyvolume').tag(sync=True)
    _view_module_version = Unicode(semver_range_frontend).tag(sync=True)
    _model_module_version = Unicode(semver_range_frontend).tag(sync=True)

    volume_data = Array(default_value=None, allow_none=True).tag(sync=True, **array_cube_png_serialization)
    eye_separation = traitlets.CFloat(6.4).tag(sync=True)
    data_min = traitlets.CFloat().tag(sync=True)
    data_max = traitlets.CFloat().tag(sync=True)
    tf = traitlets.Instance(TransferFunction, allow_none=True).tag(sync=True, **ipywidgets.widget_serialization)
    anglex = traitlets.Float(0.0).tag(sync=True)
    angley = traitlets.Float(0.0).tag(sync=True)
    anglez = traitlets.Float(0.0).tag(sync=True)
    angle_order = Unicode(default_value="XYZ").tag(sync=True)

    scatters = traitlets.List(traitlets.Instance(Scatter), [], allow_none=False).tag(sync=True, **ipywidgets.widget_serialization)
    meshes = traitlets.List(traitlets.Instance(Mesh), [], allow_none=False).tag(sync=True, **ipywidgets.widget_serialization)

    animation = traitlets.Float(1000.0).tag(sync=True)
    animation_exponent = traitlets.Float(.5).tag(sync=True)

    ambient_coefficient = traitlets.Float(0.5).tag(sync=True)
    diffuse_coefficient = traitlets.Float(0.8).tag(sync=True)
    specular_coefficient = traitlets.Float(0.5).tag(sync=True)
    specular_exponent = traitlets.Float(5).tag(sync=True)
    stereo = traitlets.Bool(False).tag(sync=True)

    camera_control = traitlets.Unicode(default_value='trackball').tag(sync=True)
    camera_fov = traitlets.CFloat(45,min=0.1,max=179.9).tag(sync=True)

    width = traitlets.CInt(500).tag(sync=True)
    height = traitlets.CInt(400).tag(sync=True)
    downscale = traitlets.CInt(1).tag(sync=True)
    show = traitlets.Unicode("Volume").tag(sync=True) # for debugging

    xlim = traitlets.List(traitlets.CFloat, default_value=[0, 1], minlen=2, maxlen=2).tag(sync=True)
    ylim = traitlets.List(traitlets.CFloat, default_value=[0, 1], minlen=2, maxlen=2).tag(sync=True)
    zlim = traitlets.List(traitlets.CFloat, default_value=[0, 1], minlen=2, maxlen=2).tag(sync=True)

    matrix_projection = traitlets.List(traitlets.CFloat, default_value=[0] * 16, allow_none=True, minlen=16, maxlen=16).tag(sync=True)
    matrix_world = traitlets.List(traitlets.CFloat, default_value=[0] * 16, allow_none=True, minlen=16, maxlen=16).tag(sync=True)

    xlabel = traitlets.Unicode("x").tag(sync=True)
    ylabel = traitlets.Unicode("y").tag(sync=True)
    zlabel = traitlets.Unicode("z").tag(sync=True)

    style = traitlets.Dict(default_value=ipyvolume.styles.default).tag(sync=True)

    render_continuous = traitlets.Bool(False).tag(sync=True)

    #xlim = traitlets.Tuple(traitlets.CFloat(0), traitlets.CFloat(1)).tag(sync=True)
    #y#lim = traitlets.Tuple(traitlets.CFloat(0), traitlets.CFloat(1)).tag(sync=True)
    #zlim = traitlets.Tuple(traitlets.CFloat(0), traitlets.CFloat(1)).tag(sync=True)

    def __init__(self, **kwargs):
        super(Figure, self).__init__(**kwargs)
        self._screenshot_handlers = widgets.CallbackDispatcher()
        self._lasso_handlers = widgets.CallbackDispatcher()
        self.on_msg(self._handle_custom_msg)

    def screenshot(self, width=None, height=None, mime_type='image/png'):
        self.send({'msg':'screenshot', 'width':width, 'height':height, 'mime_type':mime_type})

    def on_screenshot(self, callback, remove=False):
        self._screenshot_handlers.register_callback(callback, remove=remove)

    def _handle_custom_msg(self, content, buffers):
        if content.get('event', '') == 'screenshot':
            self._screenshot_handlers(content['data'])
        if content.get('event', '') == 'lasso':
            self._lasso_handlers(content['data'])

    def on_lasso(self, callback, remove=False):
        self._lasso_handlers.register_callback(callback, remove=remove)

    def project(self, x, y, z):
        W = np.matrix(self.matrix_world).reshape((4,4))     .T
        P = np.matrix(self.matrix_projection).reshape((4,4)).T
        M = np.dot(P, W)
        vertices = np.array([x, y, z, np.ones(len(x))])#.T
        p = np.array(np.dot(M, vertices))
        p = p / p[3]
        return p

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

def volshow(*args, **kwargs):
    """Deprecated: please use ipyvolume.quickvolshow or use the ipyvolume.pylab interface"""
    warnings.warn("Please use ipyvolume.quickvolshow or use the ipyvolume.pylab interface", DeprecationWarning, stacklevel=2)
    return quickvolshow(*args, **kwargs)

def quickquiver(x, y, z, u, v, w, **kwargs):
    import ipyvolume.pylab as p3
    p3.figure()
    p3.quiver(x, y, z, u, v, w, **kwargs)
    return p3.current.container

def quickscatter(x, y, z, **kwargs):
    import ipyvolume.pylab as p3
    p3.figure()
    p3.scatter(x, y, z, **kwargs)
    return p3.current.container


def quickvolshow(data, lighting=False, data_min=None, data_max=None, tf=None, stereo=False,
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
    if tf is None: # TODO: should this just call the pylab interface?
        #tf = TransferFunctionJsBumps(**kwargs)
        tf_kwargs = {}
        # level, opacity and widths can be scalars
        try:
            level[0]
        except:
            level = [level]
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
    v = Figure(volume_data=data, data_min=data_min, data_max=data_max, stereo=stereo,
                            width=width, height=height,
                            ambient_coefficient=ambient_coefficient,
                            diffuse_coefficient=diffuse_coefficient,
                            specular_coefficient=specular_coefficient,
                            specular_exponent=specular_exponent,
                            tf=tf, **kwargs)

    box = _volume_widets(v, lighting=lighting)
    return box

def scatter(x, y, z, color=(1,0,0), s=0.01):
    global _last_figure;
    fig = _last_figure
    if fig is None:
        fig = volshow(None)
    fig.scatter = Scatter(x=x, y=y, z=z, color=color, size=s)
    fig.volume.scatter = fig.scatter
    return fig
