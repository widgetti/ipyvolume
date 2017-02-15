_last_figure = None
import ipywidgets
from IPython.display import display
from . import volume
import ipyvolume.embed
import os
import numpy as np
import shutil

def _docsubst(f):
	"""Perform docstring substitutions"""
	f.__doc__ = f.__doc__.format(**_doc_snippets)
	return f

_doc_snippets = {}
_doc_snippets["color"] = "string format, examples for red:'red', '#f00', '#ff0000' or 'rgb(1,0,0)"
_doc_snippets["size"] = "float representing the size of the glyph in fraction of the viewport, where 1. is full viewport"
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


def figure(key=None, width=400, height=500, lighting=True, controls=True, debug=False):
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
		current.figure = volume.VolumeRendererThree(data=None)
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
default_size = 0.02
default_size_selected = default_size*1.3

@_docsubst
def scatter(x, y, z, color=default_color, s=default_size, ss=default_size_selected, color_selected=default_color_selected, marker="diamond", selection=None, **kwargs):
	"""Create a scatter 3d plot with

	:param x: {x}
	:param y:
	:param z:
	:param color: {color}
	:param s: {size}
	:param ss: like size, but for selected glyphs
	:param color_selected:  like color, but for selected glyphs
	:param marker: {marker}
	:param selection: array with indices of x,y,z arrays of the selected markers, which can have a different size and color
	:param kwargs:
	:return:
	"""
	fig = gcf()
	_grow_limits(x, y, z)
	scatter = volume.Scatter(x=x, y=y, z=z, color=color, size=s, color_selected=color_selected, size_selected=ss, geo=marker, selection=selection, **kwargs)
	fig.scatters = fig.scatters + [scatter]
	return scatter


def quiver(x, y, z, u, v, w, s=default_size*10, ss=default_size_selected*10, color=default_color, color_selected=default_color_selected, marker="arrow", **kwargs):
	"""Create a quiver plot, which is like a scatter plot but with arrows pointing in the direction given by u, v and w

	:param x: {x}, for convenience the array is flattened if not 1d.
	:param y:
	:param z:
	:param u: {u}
	:param v:
	:param w:
	:param s: {size}
	:param ss: like size, but for selected glyphs
	:param color: {color}
	:param color_selected: like color, but for selected glyphs
	:param marker: (currently only 'arrow' would make sense)
	:param kwargs:
	:return:
	"""
	fig = gcf()
	_grow_limits(x, y, z)
	scatter = volume.Scatter(x=x.flatten(), y=y.flatten(), z=z.flatten(), vx=u.flatten(), vy=v.flatten(), vz=w.flatten(), color=color, size=s, color_selected=color_selected, size_selected=ss,
							 geo=marker, **kwargs)
	fig.scatters = fig.scatters + [scatter]
	return scatter


def show():
	"""Display (like in IPython.display.dispay(...) the current figure"""
	gcf() # make sure we have something..
	display(gcc())

def gcc():
	"""Return the current container, that is the widget holding the figure and all the control widgets, buttons etc."""
	gcf() # make sure we have something..
	return current.container

def transfer_function(level=[0.1, 0.5, 0.9], opacity=[0.01, 0.05, 0.1], level_width=0.1, controls=True):
	"""Create a transfer function, see volshow"""
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
	vol.data = data
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

def save(filename, copy_js=True):
	"""Save the figure/visualization as html file, and optionally copy the .js file to the same directory """
	ipyvolume.embed.embed_html(filename, current.container)
	if copy_js:
		dir_name_dst = os.path.dirname(os.path.abspath(filename))
		dir_name_src = os.path.join(os.path.abspath(ipyvolume.__path__[0]), "static")
		dst = os.path.join(dir_name_dst, "ipyvolume.js")
		src = os.path.join(dir_name_src, "index.js")
		shutil.copy(src, dst)