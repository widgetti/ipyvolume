_last_figure = None
import ipywidgets
from IPython.display import display
import IPython
from . import volume
import ipyvolume.embed
import os
import numpy as np
import shutil
from . import utils
import time

def _docsubst(f):
	"""Perform docstring substitutions"""
	f.__doc__ = f.__doc__.format(**_doc_snippets)
	return f

_doc_snippets = {}
_doc_snippets["color"] = "string format, examples for red:'red', '#f00', '#ff0000' or 'rgb(1,0,0)"
_doc_snippets["size"] = "float representing the size of the glyph in percentage of the viewport, where 100 is the full size of the viewport"
_doc_snippets["marker"] = "name of the marker, options are: 'arrow', 'box', 'diamond', 'sphere'"
_doc_snippets["x"] = "1d numpy array with x positions"
_doc_snippets["u"] = "1d numpy array indicating the x direction"

class current:
	figure = None
	container = None
	figures = {}
	containers = {}

def clear():
	"""Remove current figure (and container)"""
	current.container = None
	current.figure = None

def figure(key=None, width=400, height=500, lighting=True, controls=True, debug=False, **kwargs):
	"""Create a new figure (if no key is given) or return the figure associated with key

	:param key: Python object that identifies this figure
	:param width: pixel width of WebGL canvas
	:param height:  .. height ..
	:param lighting: use lighting or not
	:param controls: show controls or not
	:param debug: show debug buttons or not
	:return:
	"""
	if key is not None and key in current.figures:
		current.figure = current.figures[key]
		current.container = current.containers[key]
	else:
		current.figure = volume.Figure(volume_data=None, width=width, height=height, **kwargs)
		current.container = ipywidgets.VBox()
		current.container.children = [current.figure]
		if key is not None:
			current.figures[key] = current.figure
			current.containers[key] = current.container
		if controls:
			stereo = ipywidgets.ToggleButton(value=current.figure.stereo, description='stereo', icon='eye')
			fullscreen = ipywidgets.ToggleButton(value=current.figure.stereo, description='fullscreen',
												 icon='arrows-alt')
			l1 = ipywidgets.jslink((current.figure, 'stereo'), (stereo, 'value'))
			l2 = ipywidgets.jslink((current.figure, 'fullscreen'), (fullscreen, 'value'))
			current.container.children += (ipywidgets.HBox([stereo, fullscreen]),)
		if debug:
			show = ipywidgets.ToggleButtons(options=["Volume", "Back", "Front"])
			current.container.children += (show,)
			ipywidgets.jslink((current.figure, 'show'), (show, 'value'))
	return current.figure

def gcf():
	"""Get current figure, or create a new one"""
	if current.figure is None:
		return figure()
	else:
		return current.figure

def _grow_limit(limits, values):
	finites = np.isfinite(values)
	newvmin = np.min(values[finites])
	newvmax = np.max(values[finites])
	if limits is None:
		return newvmin, newvmax
	else:
		vmin, vmax = limits
		return min(newvmin, vmin), max(newvmax, vmax)

def _grow_limits(x, y, z):
	fig = gcf()
	xlim(*_grow_limit(fig.xlim, x))
	ylim(*_grow_limit(fig.ylim, y))
	zlim(*_grow_limit(fig.zlim, z))

def xlim(xmin, xmax):
	"""Set limits of x axis"""
	fig = gcf()
	fig.xlim = [xmin, xmax]
def ylim(ymin, ymax):
	"""Set limits of y axis"""
	fig = gcf()
	fig.ylim = [ymin, ymax]
def zlim(zmin, zmax):
	"""Set limits of zaxis"""
	fig = gcf()
	fig.zlim = [zmin, zmax]
def xyzlim(vmin, vmax):
	"""Set limits or all axis the same"""
	xlim(vmin, vmax)
	ylim(vmin, vmax)
	zlim(vmin, vmax)

default_color = "red"
default_color_selected = "white"
default_size = 2
default_size_selected = default_size*1.3

@_docsubst
def scatter(x, y, z, color=default_color, size=default_size, size_selected=default_size_selected, color_selected=default_color_selected, marker="diamond", selection=None, **kwargs):
	"""Create a scatter 3d plot with

	:param x: {x}
	:param y:
	:param z:
	:param color: {color}
	:param size: {size}
	:param size_selected: like size, but for selected glyphs
	:param color_selected:  like color, but for selected glyphs
	:param marker: {marker}
	:param selection: array with indices of x,y,z arrays of the selected markers, which can have a different size and color
	:param kwargs:
	:return:
	"""
	fig = gcf()
	_grow_limits(x, y, z)
	scatter = volume.Scatter(x=x, y=y, z=z, color=color, size=size, color_selected=color_selected, size_selected=size_selected, geo=marker, selection=selection, **kwargs)
	fig.scatters = fig.scatters + [scatter]
	return scatter


def quiver(x, y, z, u, v, w, size=default_size*10, size_selected=default_size_selected*10, color=default_color, color_selected=default_color_selected, marker="arrow", **kwargs):
	"""Create a quiver plot, which is like a scatter plot but with arrows pointing in the direction given by u, v and w

	:param x: {x}
	:param y:
	:param z:
	:param u: {u}
	:param v:
	:param w:
	:param size: {size}
	:param size_selected: like size, but for selected glyphs
	:param color: {color}
	:param color_selected: like color, but for selected glyphs
	:param marker: (currently only 'arrow' would make sense)
	:param kwargs:
	:return:
	"""
	fig = gcf()
	_grow_limits(x, y, z)
	scatter = volume.Scatter(x=x, y=y, z=z, vx=u, vy=v, vz=w,
							 color=color, size=size, color_selected=color_selected, size_selected=size_selected,
							 geo=marker, **kwargs)
	fig.scatters = fig.scatters + [scatter]
	return scatter


def show(extra_widgets=[]):
    """Display (like in IPython.display.dispay(...) the current figure"""
    gcf() # make sure we have something..
    display(gcc())
    for widget in extra_widgets:
        display(widget)

def animate_glyphs(scatter, sequence_length=None, add=True, interval=200):
	"""Animate scatter or quiver by adding a slider and play button.

	:param scatter: scatter or quiver object
	:param sequence_length: If sequence_length is None we try try our best to figure out, in case we do it badly, you can tell us what it should be
	:param add: if True, add the widgets to the container, else return a HBox with the slider and play button
	:param interval: interval in msec between each frame
	:return:
	"""
	if sequence_length is None:
		# get all non-None arrays
		values = [getattr(scatter, name) for name in "x y z vx vy vz".split()]
		values = [k for k in values if k is not None]
		# sort them such that the higest dim is first
		values.sort(key=lambda key: -len(key.shape))
		sequence_length = values[0].shape[0] # assume this defines the sequence length
	fig = gcf()
	fig.animation = interval
	fig.animation_exponent = 1.
	play = ipywidgets.Play(min=0, max=sequence_length, interval=interval, value=0, step=1)
	slider = ipywidgets.IntSlider(min=0, max=play.max-1)
	ipywidgets.jslink((play, 'value'), (slider, 'value'))
	ipywidgets.jslink((slider, 'value'), (scatter, 'sequence_index'))
	control = ipywidgets.HBox([play, slider])
	if add:
		current.container.children += (control,)
	else:
		return control

def gcc():
	"""Return the current container, that is the widget holding the figure and all the control widgets, buttons etc."""
	gcf() # make sure we have something..
	return current.container

def transfer_function(level=[0.1, 0.5, 0.9], opacity=[0.01, 0.05, 0.1], level_width=0.1, controls=True):
	"""Create a transfer function, see volshow"""
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
	tf = volume.TransferFunctionWidgetJs3(**tf_kwargs)
	fig = gcf()
	if controls:
		current.container.children = (tf.control(), ) + current.container.children
	return tf

def volshow(data, lighting=False, data_min=None, data_max=None, tf=None, stereo=False,
            ambient_coefficient=0.5, diffuse_coefficient=0.8,
            specular_coefficient=0.5, specular_exponent=5,
            downscale=1,
            level=[0.1, 0.5, 0.9], opacity=[0.01, 0.05, 0.1], level_width=0.1,
			controls=True):
	"""Visualize a 3d array using volume rendering.

	Currently only 1 volume can be rendered.


	:param data: 3d numpy array
	:param lighting: boolean, to use lighting or not, if set to false, lighting parameters will be overriden
	:param data_min: minimum value to consider for data, if None, computed using np.nanmin
	:param data_max: maximum value to consider for data, if None, computed using np.nanmax
	:param tf: transfer function (or a default one)
	:param stereo: stereo view for virtual reality (cardboard and similar VR head mount)
	:param ambient_coefficient: lighting parameter
	:param diffuse_coefficient: lighting parameter
	:param specular_coefficient: lighting parameter
	:param specular_exponent: lighting parameter
	:param downscale: downscale the rendering for better performance, for instance when set to 2, a 512x512 canvas will show a 256x256 rendering upscaled, but it will render twice as fast.
	:param level: level(s) for the where the opacity in the volume peaks, maximum sequence of length 3
	:param opacity: opacity(ies) for each level, scalar or sequence of max length 3
	:param level_width: width of the (gaussian) bumps where the opacity peaks, scalar or sequence of max length 3
	:param controls: add controls for lighting and transfer function or not
	:return:
	"""
	if tf is None:
		tf = transfer_function(level, opacity, level_width, controls=controls)
	if data_min is None:
		data_min = np.nanmin(data)
	if data_max is None:
		data_max = np.nanmax(data)
	vol = gcf()
	vol.tf = tf
	vol.data_min = data_min
	vol.data_max = data_max
	vol.volume_data = data
	vol.stereo = stereo
	vol.ambient_coefficient = ambient_coefficient
	vol.diffuse_coefficient = diffuse_coefficient
	vol.specular_coefficient = specular_coefficient
	vol.specular_exponent = specular_exponent

	if controls:
		ambient_coefficient = ipywidgets.FloatSlider(min=0, max=1, step=0.001, value=vol.ambient_coefficient,
													 description="ambient")
		diffuse_coefficient = ipywidgets.FloatSlider(min=0, max=1, step=0.001, value=vol.diffuse_coefficient,
													 description="diffuse")
		specular_coefficient = ipywidgets.FloatSlider(min=0, max=1, step=0.001, value=vol.specular_coefficient,
													  description="specular")
		specular_exponent = ipywidgets.FloatSlider(min=0, max=10, step=0.001, value=vol.specular_exponent,
												   description="specular exp")
		# angle2 = ipywidgets.FloatSlider(min=0, max=np.pi*2, value=v.angle2, description="angle2")
		ipywidgets.jslink((vol, 'ambient_coefficient'), (ambient_coefficient, 'value'))
		ipywidgets.jslink((vol, 'diffuse_coefficient'), (diffuse_coefficient, 'value'))
		ipywidgets.jslink((vol, 'specular_coefficient'), (specular_coefficient, 'value'))
		ipywidgets.jslink((vol, 'specular_exponent'), (specular_exponent, 'value'))
		widgets_bottom = [ipywidgets.HBox([ambient_coefficient, diffuse_coefficient]),
						  ipywidgets.HBox([specular_coefficient, specular_exponent])]
		current.container.children += tuple(widgets_bottom, )

	return vol

def save(filename, copy_js=True, makedirs=True):
	"""Save the figure/visualization as html file, and optionally copy the .js file to the same directory """
	dir_name_dst = os.path.dirname(os.path.abspath(filename))
	dir_name_src = os.path.join(os.path.abspath(ipyvolume.__path__[0]), "static")
	if not os.path.exists(dir_name_dst) and makedirs:
		os.makedirs(dir_name_dst)
	ipyvolume.embed.embed_html(filename, current.container)
	if copy_js:
		dst = os.path.join(dir_name_dst, "ipyvolume.js")
		src = os.path.join(dir_name_src, "index.js")
		shutil.copy(src, dst)

def savefig(filename, timeout_seconds=10):
    """Save the current figure to an image (png or jpeg) to a file"""
    # TODO: might be useful to save to a file object
    __, ext = os.path.splitext(filename)
    fig = gcf()
    fig.screen_capture_mime_type = "image/" + ext[1:] # skip .
    previous_value = fig.screen_capture_enabled
    try:
        #fig.screen_capture_data = None
        assert fig.screen_capture_enabled, "Please enabled screen capturing first"
        if 0: # this path doesn't work atm, lets keep it for future dev
            t0 = time.time()
            timeout = False
            ipython = IPython.get_ipython()
            while not timeout:
                data = fig.screen_capture_data
                if data is not None and len(data) > 0:
                    break
                timeout = (time.time() - t0) > timeout_seconds
                ipython.kernel.do_one_iteration()
            if timeout:
                raise ValueError("timed out, no image data returned")
        data = fig.screen_capture_data
        if len(data) == 0:
            raise ValueError("image data turned up empty, bug?")
        if not data.startswith('data:image'):
            raise ValueError("image data didn't give expected result, bug?")
        # skip a header like 'data:image/png;base64,'
        data = data[data.find(",")+1:]
        import base64
        with open(filename, "wb") as f:
            f.write(base64.b64decode(data))
    finally:
        fig.screen_capture_enabled = previous_value
    return filename

def xlabel(label):
	"""Set the labels for the x-axis"""
	fig = gcf()
	fig.xlabel = label

def ylabel(label):
	"""Set the labels for the y-axis"""
	fig = gcf()
	fig.ylabel = label

def zlabel(label):
	"""Set the labels for the z-axis"""
	fig = gcf()
	fig.zlabel = label

def xyzlabel(labelx, labely, labelz):
	"""Set all labels at once"""
	xlabel(labelx)
	ylabel(labely)
	zlabel(labelz)


# mimic matplotlib namesace
class style:
    """'Static class that mimics a matplotlib module.

    Example:
    >>> import ipyvolume.pylab as p3
    >>> p3.style.use('light'])
    >>> p3.style.use('seaborn-darkgrid'])
    >>> p3.style.use(['seaborn-darkgrid', {'axes.x.color':'orange'}])

    Possible style values:
     * figure.facecolor: background color
     * axes.color: color of the box around the volume/viewport
     * xaxis.color: color of xaxis
     * yaxis.color: color of xaxis
     * zaxis.color: color of xaxis

    """

    @staticmethod
    def use(style):
        """Set the style of the current figure/visualization

        :param style: matplotlib style name, or dict with values, or a sequence of these, where the last value overrides previous
        :return:
        """
        import six
        def valid(value): # checks if json'able
            return isinstance(value, six.string_types)
        def translate(mplstyle):
            style = {}
            mapping = [
                    ['figure.facecolor','background-color'],
                    ['xtick.color', 'axes.x.color'], # TODO: is this the right thing?
                    ['xtick.color', 'axes.z.color'], # map x to z as well
                    ['ytick.color', 'axes.y.color'],
                    ['axes.labelcolor', 'axes.label.color'],
                    ['text.color', 'color'],
                    ['axes.edgecolor', 'axes.color']
            ]
            for from_name, to_name in mapping:
                if from_name in mplstyle:
                    value = mplstyle[from_name]
                    if "color" in from_name:
                        try: # threejs doesn't like a color like '.13', so try to convert to proper format
                            value = float(value) * 255
                            value = "rgb(%d, %d, %d)" % (value, value, value)
                        except:
                            pass

                    utils.nested_setitem(style, to_name, value)
            return style
        if isinstance(style, six.string_types):
            styles = [style]
        else:
            styles = style
        totalstyle = utils.dict_deep_update({}, ipyvolume.style._defaults)
        for style in styles:
            if isinstance(style, six.string_types):
                if hasattr(ipyvolume.style, style):
                    style = getattr(ipyvolume.style, style)
                else:
                    # lets see if we can copy matplotlib's style
                    # we assume now it's a matplotlib style, get all properties that we understand
                    import matplotlib.style
                    cleaned_style = {key:value for key, value in dict(matplotlib.style.library[style]).items() if valid(value)}
                    style = translate(cleaned_style)
                    #totalstyle.update(cleaned_style)
            else:
                # otherwise assume it's a dict
                pass
            totalstyle = utils.dict_deep_update(totalstyle, style)
        fig = gcf()
        fig.style = totalstyle
