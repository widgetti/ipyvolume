from __future__ import division
import logging
import math

from ipython_genutils.py3compat import string_types, PY3
import ipyvolume as ipv
from . import utils
import ipywidgets
import ipywebrtc
import numpy as np
import PIL.Image

try:
	from io import BytesIO as StringIO # python3
except:
	from StringIO import StringIO # python2
from base64 import b64encode
import warnings

logger = logging.getLogger("ipyvolume")

def image_to_url(image, widget):
    if image is None:
    	return None
    if not isinstance(image, (list, tuple)):
    	images = [image]
    else:
    	images = image
    def flatten_frames(image):
        frames = []
        index = 0
        while True:
            try:
                image.seek(index)
            except EOFError:
                break
            frames.append(image.copy())
            index += 1
        return frames
    flattened = []
    for image in images:
        flattened += flatten_frames(image)
    def encode(image):
    	f = StringIO()
    	with warnings.catch_warnings():
    		warnings.simplefilter("ignore")
    		image.save(f, "png")
    	image_url = "data:image/png;base64," + b64encode(f.getvalue()).decode("ascii")
    	return image_url
    return [encode(image) for image in flattened]

def texture_to_json(texture, widget):
    if isinstance(texture, ipywebrtc.HasStream):
        return ipywidgets.widget_serialization['to_json'](texture, widget)
    else:
        return image_to_url(texture, widget)

max_texture_width = 2048*8  # this will nicely fit 512**3 textures
min_texture_width = 256

def _compute_tile_size(shape):
	# TODO: we need to be a bit smarter here, for large grids we need to 
	slices = shape[0]
	approx_rows = int(round(math.sqrt(slices)))
	image_width = max(min_texture_width, min(max_texture_width, utils.next_power_of_2(approx_rows * shape[1])))
	columns = image_width // shape[2]
	rows = int(math.ceil(slices/columns))
	image_height = max(min_texture_width, utils.next_power_of_2(rows * shape[1]))
	return rows, columns, image_width, image_height

def _cube_to_tiles(grid, vmin, vmax):
	slices = grid.shape[0]
	rows, columns, image_width, image_height = _compute_tile_size(grid.shape)
	image_height = rows * grid.shape[1]
	data = np.zeros((image_height, image_width, 4), dtype=np.uint8)
	#vmin, vmax = np.nanmin(grid), np.nanmax(grid)
	grid_normalized = (grid*1.0 - vmin) / (vmax - vmin)
	grid_normalized[~np.isfinite(grid_normalized)] = 0
	gradient = np.gradient(grid_normalized)
	with np.errstate(divide='ignore'):
		gradient = gradient / np.sqrt(gradient[0]**2 + gradient[1]**2 + gradient[2]**2)
	# intensity_normalized = (np.log(self.data3d + 1.) - np.log(mi)) / (np.log(ma) - np.log(mi));
	import PIL.Image
	for y2d in range(rows):
		for x2d in range(columns):
			zindex = x2d + y2d * columns
			if zindex < slices:
				I = grid_normalized[zindex]
				subdata = data[y2d * I.shape[0]:(y2d + 1) * I.shape[0], x2d * I.shape[1]:(x2d + 1) * I.shape[1]]
				subdata[...,3] = (I*255).astype(np.uint8)
				for i in range(3):
					subdata[...,i] = ((gradient[i][zindex]/2.+0.5)*255).astype(np.uint8)
				#for i in range(3):
				#	subdata[...,i+1] = subdata[...,0]
	tile_shape = (grid.shape[2], grid.shape[1])

	return data, tile_shape, rows, columns, grid.shape[0]


def cube_to_png(grid, vmin, vmax, file):
	tiles_data, tile_shape, rows, columns, slices = _cube_to_tiles(grid, vmin, vmax)
	image_height, image_width, __ = tiles_data.shape
	with warnings.catch_warnings():
		warnings.simplefilter("ignore")
		img = PIL.Image.frombuffer("RGBA", (image_width, image_height), tiles_data, 'raw')
		img.save(file, "png")
	return (image_width, image_height), tile_shape, rows, columns, slices

def tile_volume(vol, tex_size, tile_shape, vol_size):
	# now tiling is always square, if volume is for example a x/y ratio of 2/1 it will create a big texture
	# which will only be filled for half, needs to be changed based on ratio of x/y
	tex = np.zeros(tex_size,dtype=vol.dtype)
	for tileY in range(tile_shape[1]):
	    for tileX in range(tile_shape[0]):
	        z = tileX + tileY * tile_shape[0]
	        if z >= vol_size[2]:
	            break
	        slice_data = vol[z]
	        xoffset = tileX*vol_size[0]
	        yoffset = tileY*vol_size[1]	
	        tex[yoffset:yoffset+vol_size[1],xoffset:xoffset+vol_size[0]] = slice_data
	# debug image saving
	# scipy.misc.toimage(tex, cmin=tex.min(), cmax=tex.max()).save('outfile.png')


	return array_to_binary(tex)


def volume_to_json_volume_tiled(vol, obj=None):
	if vol is None:
		return None
	vol = np.asarray(vol)

	# Keeping things square, compute a factor a which both x and y of the volume shape needs to be multiplied to, to get the z.
	# With this factor you can then compute the number of tiles needed to match both the x and y shape.
	# a*shape.x  *  a*shape.y = shape.z
	# shape.x * shape.y * a^2 = shape.z
	# a = sqrt(shape.z/(shape.x*shape.y))
	# tile_shape.x = shape.y*a
	# tile_shape.y = shape.x*a
	vol_shape = vol.shape[-3:][::-1]
	a = math.sqrt(float(vol_shape[2])/(float(vol_shape[0]*vol_shape[1])))
	tile_shape = [int(math.ceil(vol_shape[1]*a)),int(math.ceil(vol_shape[0]*a))]
	tex_size = [vol_shape[1]*tile_shape[1], vol_shape[0]*tile_shape[0]]

	#print "vol_shape: {}, a: {}, tile_shape: {}, tex_size: {}".format(vol_shape,a, tile_shape, tex_size)

	if vol.ndim == 4: #time series
		return {"volume_data_tiled":[tile_volume(vol[t], tex_size, tile_shape, vol_shape) for t in range(vol.shape[0])], 
				"shape":vol_shape,
				"tile_shape": tile_shape,
				"vol_tex_size": tex_size}
	else:
		return {"volume_data_tiled":[tile_volume(vol, tex_size, tile_shape, vol_shape)], 
				"shape":vol_shape, 
				"tile_shape": tile_shape,
				"vol_tex_size": tex_size}

	return None

def rgba_to_png(rgba, file):
	import PIL.Image
	if len(rgba.shape) != 3 or rgba.shape[-1] != 4:
		return None
		logger.error("only 3d arrays with the last dimension equal to 4 (rgba images) are supported")
		return None
	vmin, vmax = np.nanmin(rgba), np.nanmax(rgba)
	rgba = (rgba - vmin) / (vmax - vmin)
	rgba[~np.isfinite(rgba)] = 0
	data = (np.clip(rgba, 0, 1) * 255).astype(np.uint8)
	with warnings.catch_warnings():
		warnings.simplefilter("ignore")
		img = PIL.Image.frombuffer("RGBA", rgba.shape[:2], data, 'raw')
		img.save(file, "png")

def rgba_to_json(rgba, obj=None):
	f = StringIO()
	image_shape, slice_shape, rows, columns, slices = rgba_to_png(rgba, f)
	image_url = "data:image/png;base64," + b64encode(f.getvalue()).decode("ascii") # + "'"
	return {"image_shape": image_shape, "slice_shape": slice_shape,"rows": rows, "columns": columns, "slices": slices, "src": image_url} #dict(shape=grid.shape, image=image_url)

def cube_to_json(grid, obj=None):
	if grid is None or len(grid.shape) == 1:
		return None
	f = StringIO()
	image_shape, slice_shape, rows, columns, slices = cube_to_png(grid, obj.data_min, obj.data_max, f)
	image_url = "data:image/png;base64," + b64encode(f.getvalue()).decode("ascii") # + "'"
	json = {"image_shape": image_shape, "slice_shape": slice_shape, "rows": rows, "columns": columns, "slices": slices, "src": image_url}
	return json

def cube_to_tiles(grid, obj=None):
	if grid is None or len(grid.shape) == 1:
		return None
	f = StringIO()
	tiles_data, slice_shape, rows, columns, slices = _cube_to_tiles(grid, obj.data_min, obj.data_max)
	image_height, image_width, __ = tiles_data.shape
	image_shape = image_width, image_height
	json = {"tiles": memoryview(tiles_data), "image_shape": image_shape, "slice_shape": slice_shape,
			"rows": rows, "columns": columns, "slices": slices}
	return json

def from_json(value, obj=None):
	return []

def array_to_json(ar, obj=None):
	return ar.tolist() if ar is not None else None


def array_to_binary(ar, obj=None, force_contiguous=True):
	if ar is None:
		return None
	if ar.dtype.kind not in ['u', 'i', 'f']:  # ints and floats
		raise ValueError("unsupported dtype: %s" % (ar.dtype))
	if ar.dtype == np.float64:  # WebGL does not support float64, case it here
		ar = ar.astype(np.float32)
	if ar.dtype == np.int64:  # JS does not support int64
		ar = ar.astype(np.int32)
	if force_contiguous and not ar.flags["C_CONTIGUOUS"]:  # make sure it's contiguous
		ar = np.ascontiguousarray(ar)
	return {'data':memoryview(ar), 'dtype':str(ar.dtype), 'shape':ar.shape}

def binary_to_array(value, obj=None):
	return np.frombuffer(value['data'], dtype=value['dtype']).reshape(value['shape'])

def array_sequence_to_binary_or_json(ar, obj=None):
	if ar is None:
		return None
	element = ar
	dimension = 0
	try:
		while True:
			element = element[0]
			dimension += 1
	except:
		pass
	try:
		element = element.item() # for instance get back the value from array(1)
	except:
		pass
	if isinstance(element, string_types):
		return array_to_json(ar)
	if dimension == 0: # scalars are passed as is (json), empty lists as well
		if isinstance(element, np.ndarray): # must be an empty list
			return []
		else:
			return element
	if isinstance(ar, (list, tuple, np.ndarray)): # ok, at least 1d
		if isinstance(ar[0], (list, tuple, np.ndarray)): # ok, 2d
			return [array_to_binary(ar[k]) for k in range(len(ar))]
		else:
			return [array_to_binary(ar)]
	else:
		raise ValueError("Expected a sequence, got %r", ar)

def array_to_binary_or_json(ar, obj=None):
	if ar is None:
		return None
	element = ar
	dimension = 0
	try:
		while True:
			element = element[0]
			dimension += 1
	except:
		pass
	try:
		element = element.item() # for instance get back the value from array(1)
	except:
		pass
	if isinstance(element, string_types):
		return array_to_json(ar)
	if dimension == 0: # scalars are passed as is (json)
		return element
	return [array_to_binary(ar)]

def from_json_to_array(value, obj=None):
	return np.frombuffer(value, dtype=np.float32) if value else None

last_value_to_array = None
def create_array_binary_serialization(attrname, update_from_js=False):
	def from_json_to_array(value, obj=None):
		global last_value_to_array
		last_value_to_array = value
		if update_from_js: # for some values we may want updates from the js side
			return np.array(value)
		else: # otherwise we probably get updates due to a bug in ipywidgets
			return getattr(obj, attrname) # ignore what we got send back, it is not supposed to be changing
	return dict(to_json=array_to_binary_or_json, from_json=from_json_to_array)

def create_array_cube_png_serialization(attrname, update_from_js=False):
	def fixed(value, obj=None):
		if update_from_js: # for some values we may want updates from the js side
			return from_json(value)
		else: # otherwise we probably get updates due to a bug in ipywidgets
			return getattr(obj, attrname) # ignore what we got send back, it is not supposed to be changing
	return dict(to_json=cube_to_json, from_json=fixed)

def color_to_binary_or_json(ar, obj=None):
	if ar is None:
		return None
	element = ar
	dimension = 0
	try:
		while True:
			element = element[0]
			dimension += 1
	except:
		pass
	try:
		element = element.item() # for instance get back the str from array('foo')
	except:
		pass
	if isinstance(element, string_types):
		return array_to_json(ar)
	if dimension == 0:  # scalars are passed as is (json)
		return ar
	if ar.shape[-1] == 3:
		# we add an alpha channel
		ones = np.ones(ar.shape[:-1])
		ar = np.stack([ar[...,0], ar[...,1], ar[...,2], ones], axis=-1)
	elif ar.shape[-1] != 4:
		raise ValueError('array should be of shape (...,3) or (...,4), not %r' % (ar.shape,))

	if dimension == 3:
		return [array_to_binary(ar[k]) for k in range(len(ar))]
	else:
		return [array_to_binary(ar)]

def json_to_array(json, obj=None):
	return np.array(json)
color_serialization = dict(to_json=color_to_binary_or_json, from_json=None)
array_sequence_serialization = dict(to_json=array_sequence_to_binary_or_json, from_json=json_to_array)
array_serialization = dict(to_json=array_to_binary_or_json, from_json=None)

array_volume_tiled_serialization = dict(to_json=volume_to_json_volume_tiled, from_json=from_json)

array_cube_png_serialization = dict(to_json=cube_to_json, from_json=from_json)
array_rgba_png_serialization = dict(to_json=rgba_to_json, from_json=from_json)
array_cube_tile_serialization = dict(to_json=cube_to_tiles, from_json=from_json)
#array_binary_serialization = dict(to_json=array_to_binary_or_json, from_json=from_json_to_array)
image_serialization = dict(to_json=image_to_url, from_json=None)
texture_serialization = dict(to_json=texture_to_json, from_json=None)

ndarray_serialization = dict(to_json=array_to_binary, from_json=binary_to_array)

if __name__ == "__main__":
    import sys
    grid = np.load(sys.argv[1]).items()[0][1]
    with open(sys.argv[2], "wb") as f:
	    cube_to_png(np.log10(grid+1), f)
