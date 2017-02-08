_last_figure = None
from IPython.display import display
from . import volume
import numpy as np

class current:
	figure = None

def clear():
	current.figure = None

def figure(width=400, height=500, lighting=False):
	if not current.figure:
		current.figure = volume.VolumeRendererThree(data=None)
	return current.figure

def scatter(x, y, z, color=(1,0,0), s=0.01):
	fig = figure()
	fig.scatter = volume.Scatter(x=x, y=y, z=z, color=color, size=s)
	return fig.scatter


def show():
	display(current.figure)

def transfer_function(level=[0.1, 0.5, 0.9], opacity=[0.01, 0.05, 0.1], level_width=0.1):
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

def volshow(data, lighting=False, data_min=None, data_max=None, tf=None, stereo=False,
            ambient_coefficient=0.5, diffuse_coefficient=0.8,
            specular_coefficient=0.5, specular_exponent=5,
            downscale=1,
            level=[0.1, 0.5, 0.9], opacity=[0.01, 0.05, 0.1], level_width=0.1):
	if tf is None:
		tf = transfer_function(level, opacity, level_width)
	if data_min is None:
		data_min = np.nanmin(data)
	if data_max is None:
		data_max = np.nanmax(data)
	vol = current.figure
	vol.data = data
	vol.data_min = data_min
	vol.data_max = data_max
	vol.stereo = stereo
	vol.ambient_coefficient = ambient_coefficient
	vol.diffuse_coefficient = diffuse_coefficient
	vol.specular_coefficient = specular_coefficient
	vol.specular_exponent = specular_exponent
	vol.tf = tf

