_last_figure = None
import ipywidgets
from IPython.display import display
from . import volume
import ipyvolume.embed
import os
import numpy as np
import shutil

class current:
	figure = None

def clear():
	current.container = None
	current.figure = None


def figure(width=400, height=500, lighting=False, controls=True, debug=False):
	current.figure = volume.VolumeRendererThree(data=None)
	current.container = ipywidgets.VBox()
	current.container.children = [current.figure]
	if controls:
		stereo = ipywidgets.ToggleButton(value=current.figure.stereo, description='stereo', icon='eye')
		fullscreen = ipywidgets.ToggleButton(value=current.figure.stereo, description='fullscreen', icon='arrows-alt')
		l1 = ipywidgets.jslink((current.figure, 'stereo'), (stereo, 'value'))
		l2 = ipywidgets.jslink((current.figure, 'fullscreen'), (fullscreen, 'value'))
		current.container.children += (ipywidgets.HBox([stereo, fullscreen]),)
	if debug:
		show = ipywidgets.ToggleButtons(options=["Volume", "Back", "Front"])
		current.container.children += (show,)
		ipywidgets.jslink((current.figure, 'show'), (show, 'value'))
	return current.figure

def gcf():
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
	fig = gcf()
	fig.xlim = [xmin, xmax]
def ylim(ymin, ymax):
	fig = gcf()
	fig.ylim = [ymin, ymax]
def zlim(zmin, zmax):
	fig = gcf()
	fig.zlim = [zmin, zmax]
def xyzlim(vmin, vmax):
	xlim(vmin, vmax)
	ylim(vmin, vmax)
	zlim(vmin, vmax)

default_color = (1,0,0)
default_color_selected = (1,1,1)
default_size = 0.02
default_size_selected = default_size*1.3

def scatter(x, y, z, color=default_color, s=default_size, ss=default_size_selected, color_selected=default_color_selected, marker="diamond", **kwargs):
	fig = gcf()
	_grow_limits(x, y, z)
	scatter = volume.Scatter(x=x, y=y, z=z, color=color, size=s, color_selected=color_selected, size_selected=ss, geo=marker, **kwargs)
	fig.scatters = fig.scatters + [scatter]
	return scatter


def quiver(X, Y, Z, U, V, W, s=default_size*10, ss=default_size_selected*10, color=default_color, color_selected=default_color_selected, marker="arrow", **kwargs):
	fig = gcf()
	_grow_limits(X, Y, Z)
	scatter = volume.Scatter(x=X.flatten(), y=Y.flatten(), z=Z.flatten(), vx=U.flatten(), vy=V.flatten(), vz=W.flatten(), color=color, size=s, color_selected=color_selected, size_selected=ss,
							 geo=marker, **kwargs)
	fig.scatters = fig.scatters + [scatter]
	return scatter


def show():
	gcf() # make sure we have something..
	display(gcc())

def gcc():
	"""Return the current container, that is the widget holding the figure and all the control widgets, buttons etc."""
	gcf() # make sure we have something..
	return current.container

def transfer_function(level=[0.1, 0.5, 0.9], opacity=[0.01, 0.05, 0.1], level_width=0.1, controls=True):
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

def save_html(filename, copy_js=True):
	ipyvolume.embed.embed_html(filename, current.container)
	if copy_js:
		dir_name_dst = os.path.dirname(os.path.abspath(filename))
		dir_name_src = os.path.join(os.path.abspath(ipyvolume.__path__[0]), "static")
		dst = os.path.join(dir_name_dst, "ipyvolume.js")
		src = os.path.join(dir_name_src, "index.js")
		shutil.copy(src, dst)