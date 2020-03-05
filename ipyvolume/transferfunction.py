"""The transferfunction module of ipvyolume."""

from __future__ import absolute_import

import ipywidgets as widgets
import matplotlib.colors
import matplotlib.cm
import numpy as np
import traitlets
from traitlets import Unicode, validate
from traittypes import Array

from . import serialize
import ipyvolume._version

__all__ = ['TransferFunction', 'TransferFunctionJsBumps', 'TransferFunctionWidgetJs3', 'TransferFunctionWidget3']

N = 1024
x = np.linspace(0, 1, N, endpoint=True)
semver_range_frontend = "~" + ipyvolume._version.__version_js__


@widgets.register
class TransferFunction(widgets.DOMWidget):
    _model_name = Unicode('TransferFunctionModel').tag(sync=True)
    _view_name = Unicode('TransferFunctionView').tag(sync=True)
    _model_module = Unicode('ipyvolume').tag(sync=True)
    _view_module = Unicode('ipyvolume').tag(sync=True)
    style = Unicode("height: 32px; width: 100%;").tag(sync=True)
    rgba = Array(default_value=None, allow_none=True).tag(sync=True, **serialize.ndarray_serialization)
    _view_module_version = Unicode(semver_range_frontend).tag(sync=True)
    _model_module_version = Unicode(semver_range_frontend).tag(sync=True)


class TransferFunctionJsBumps(TransferFunction):
    _model_name = Unicode('TransferFunctionJsBumpsModel').tag(sync=True)
    _model_module = Unicode('ipyvolume').tag(sync=True)
    levels = traitlets.List(traitlets.CFloat(), default_value=[0.1, 0.5, 0.8]).tag(sync=True)
    opacities = traitlets.List(traitlets.CFloat(), default_value=[0.01, 0.05, 0.1]).tag(sync=True)
    widths = traitlets.List(traitlets.CFloat(), default_value=[0.1, 0.1, 0.1]).tag(sync=True)

    def control(self, max_opacity=0.2):
        return widgets.VBox()


class TransferFunctionWidgetJs3(TransferFunction):
    _model_name = Unicode('TransferFunctionWidgetJs3Model').tag(sync=True)
    _model_module = Unicode('ipyvolume').tag(sync=True)
    level1 = traitlets.Float(0.1).tag(sync=True)
    level2 = traitlets.Float(0.5).tag(sync=True)
    level3 = traitlets.Float(0.8).tag(sync=True)
    opacity1 = traitlets.Float(0.01).tag(sync=True)
    opacity2 = traitlets.Float(0.05).tag(sync=True)
    opacity3 = traitlets.Float(0.1).tag(sync=True)
    width1 = traitlets.Float(0.1).tag(sync=True)
    width2 = traitlets.Float(0.1).tag(sync=True)
    width3 = traitlets.Float(0.1).tag(sync=True)

    def control(self, max_opacity=0.2):
        l1 = widgets.FloatSlider(min=0, max=1, step=0.001, value=self.level1)
        l2 = widgets.FloatSlider(min=0, max=1, step=0.001, value=self.level2)
        l3 = widgets.FloatSlider(min=0, max=1, step=0.001, value=self.level3)
        o1 = widgets.FloatSlider(min=0, max=max_opacity, step=0.001, value=self.opacity1)
        o2 = widgets.FloatSlider(min=0, max=max_opacity, step=0.001, value=self.opacity2)
        o3 = widgets.FloatSlider(min=0, max=max_opacity, step=0.001, value=self.opacity2)
        widgets.jslink((self, 'level1'), (l1, 'value'))
        widgets.jslink((self, 'level2'), (l2, 'value'))
        widgets.jslink((self, 'level3'), (l3, 'value'))
        widgets.jslink((self, 'opacity1'), (o1, 'value'))
        widgets.jslink((self, 'opacity2'), (o2, 'value'))
        widgets.jslink((self, 'opacity3'), (o3, 'value'))
        return widgets.VBox(
            [
                widgets.HBox([widgets.Label(value="levels:"), l1, l2, l3]),
                widgets.HBox([widgets.Label(value="opacities:"), o1, o2, o3]),
            ]
        )


class TransferFunctionWidget3(TransferFunction):
    level1 = traitlets.Float(0.1).tag(sync=True)
    level2 = traitlets.Float(0.5).tag(sync=True)
    level3 = traitlets.Float(0.8).tag(sync=True)
    opacity1 = traitlets.Float(0.4).tag(sync=True)
    opacity2 = traitlets.Float(0.1).tag(sync=True)
    opacity3 = traitlets.Float(0.1).tag(sync=True)
    width1 = traitlets.Float(0.1).tag(sync=True)
    width2 = traitlets.Float(0.1).tag(sync=True)
    width3 = traitlets.Float(0.1).tag(sync=True)

    def __init__(self, *args, **kwargs):
        super(TransferFunctionWidget3, self).__init__(*args, **kwargs)
        N = range(1, 4)
        self.observe(
            self.recompute_rgba, ["level%d" % k for k in N] + ["opacity%d" % k for k in N] + ["width%d" % k for k in N]
        )
        self.recompute_rgba()

    def recompute_rgba(self, *_ignore):
        import matplotlib
        rgba = np.zeros((1024, 4))
        N = range(1, 4)
        levels = [getattr(self, "level%d" % k) for k in N]
        opacities = [getattr(self, "opacity%d" % k) for k in N]
        widths = [getattr(self, "width%d" % k) for k in N]
        # print(levels, opacities, widths)
        colors = [np.array(matplotlib.colors.colorConverter.to_rgb(name)) for name in ["red", "green", "blue"]]
        # TODO: vectorize
        for i in range(rgba.shape[0]):
            position = i / (1023.0)
            intensity = 0.0
            # self.rgba[i, 0, :] = 0
            for j in range(3):
                intensity = np.exp(-((position - levels[j]) / widths[j]) ** 2)
                rgba[i, 0:3] += colors[j] * opacities[j] * intensity
                rgba[i, 3] += opacities[j] * intensity
            rgba[i, 0:3] /= rgba[i, 0:3].max()
        rgba = np.clip(rgba, 0, 1)
        self.rgba = rgba

    def control(self, max_opacity=0.2):
        l1 = widgets.FloatSlider(min=0, max=1, value=self.level1)
        l2 = widgets.FloatSlider(min=0, max=1, value=self.level2)
        l3 = widgets.FloatSlider(min=0, max=1, value=self.level3)
        o1 = widgets.FloatSlider(min=0, max=max_opacity, step=0.001, value=self.opacity1)
        o2 = widgets.FloatSlider(min=0, max=max_opacity, step=0.001, value=self.opacity2)
        o3 = widgets.FloatSlider(min=0, max=max_opacity, step=0.001, value=self.opacity2)
        widgets.jslink((self, 'level1'), (l1, 'value'))
        widgets.jslink((self, 'level2'), (l2, 'value'))
        widgets.jslink((self, 'level3'), (l3, 'value'))
        widgets.jslink((self, 'opacity1'), (o1, 'value'))
        widgets.jslink((self, 'opacity2'), (o2, 'value'))
        widgets.jslink((self, 'opacity3'), (o3, 'value'))
        return widgets.VBox(
            [
                widgets.HBox([widgets.Label(value="levels:"), l1, l2, l3]),
                widgets.HBox([widgets.Label(value="opacities:"), o1, o2, o3]),
            ]
        )


def linear_transfer_function(color,
                             min_opacity=0,
                             max_opacity=0.05,
                             reverse_opacity=False,
                             n_elements = 256):
    """Transfer function of a single color and linear opacity.

    :param color: Listlike RGB, or string with hexidecimal or named color.
        RGB values should be within 0-1 range.
    :param min_opacity: Minimum opacity, default value is 0.0.
        Lowest possible value is 0.0, optional.
    :param max_opacity: Maximum opacity, default value is 0.05.
        Highest possible value is 1.0, optional.
    :param reverse_opacity: Linearly decrease opacity, optional.
    :param n_elements: Length of rgba array transfer function attribute.
    :type color: listlike or string
    :type min_opacity: float, int
    :type max_opacity: float, int
    :type reverse_opacity: bool
    :type n_elements: int
    :return: transfer_function
    :rtype: ipyvolume TransferFunction

    :Example:
    >>> import ipyvolume as ipv
    >>> green_tf = ipv.transfer_function.linear_transfer_function('green')
    >>> ds = ipv.datasets.aquariusA2.fetch()
    >>> ipv.volshow(ds.data[::4,::4,::4], tf=green_tf)
    >>> ipv.show()

    .. seealso:: matplotlib_transfer_function()
    """
    r, g, b = matplotlib.colors.to_rgb(color)
    opacity = np.linspace(min_opacity, max_opacity, num=n_elements)
    if reverse_opacity:
        opacity = np.flip(opacity, axis=0)
    rgba = np.transpose(np.stack([[r] * n_elements,
                                  [g] * n_elements,
                                  [b] * n_elements,
                                  opacity]))
    transfer_function = TransferFunction(rgba=rgba)
    return transfer_function


def matplotlib_transfer_function(colormap_name,
                                 min_opacity=0,
                                 max_opacity=0.05,
                                 reverse_colormap=False,
                                 reverse_opacity=False,
                                 n_elements=256):
    """Transfer function from matplotlib colormaps.

    :param colormap_name: name of matplotlib colormap
    :param min_opacity: Minimum opacity, default value is 0.
        Lowest possible value is 0, optional.
    :param max_opacity: Maximum opacity, default value is 0.05.
        Highest possible value is 1.0, optional.
    :param reverse_colormap: reversed matplotlib colormap, optional.
    :param reverse_opacity: Linearly decrease opacity, optional.
    :param n_elements: Length of rgba array transfer function attribute.
    :type colormap_name: str
    :type min_opacity: float, int
    :type max_opacity: float, int
    :type reverse_colormap: bool
    :type reverse_opacity: bool
    :type n_elements: int
    :return: transfer_function
    :rtype: ipyvolume TransferFunction

    :Example:
    >>> import ipyvolume as ipv
    >>> rgb = (0, 255, 0)  # RGB value for green
    >>> green_tf = ipv.transfer_function.matplotlib_transfer_function('bone')
    >>> ds = ipv.datasets.aquariusA2.fetch()
    >>> ipv.volshow(ds.data[::4,::4,::4], tf=green_tf)
    >>> ipv.show()

    .. seealso:: linear_transfer_function()
    """
    cmap = matplotlib.cm.get_cmap(name=colormap_name)
    rgba = np.array([cmap(i) for i in np.linspace(0, 1, n_elements)])
    if reverse_colormap:
        rgba = np.flip(rgba, axis=0)
    # Create opacity values to overwrite default matplotlib opacity=1.0
    opacity = np.linspace(min_opacity, max_opacity, num=n_elements)
    if reverse_opacity:
        opacity = np.flip(opacity, axis=0)
    rgba[:,-1] = opacity # replace opacity=1 with actual opacity
    transfer_function = TransferFunction(rgba=rgba)
    return transfer_function


def predefined_transfer_functions():
    """Load predefined transfer functions into a dictionary.

    :return: dictionary of predefined transfer functions.
    :rtype: dict of ipyvolume TransferFunction instances
    """
    transfer_functions = {}
    # RGB primary and secondary colors
    colors = ['red', 'green', 'blue', 'yellow', 'magenta', 'cyan',
              'black', 'gray', 'white']
    for color in colors:
        tf = linear_transfer_function(color)
        transfer_functions[color] = tf
        tf_reversed = linear_transfer_function(rgb, reverse_opacity=True)
        transfer_functions[color_key + '_r'] = tf_reversed
    # All matplotlib colormaps
    matplotlib_colormaps = matplotlib.cm.cmap_d.keys()
    for colormap in matplotlib_colormaps:
        transfer_functions[colormap] = matplotlib_transfer_function(colormap)
    return transfer_functions
