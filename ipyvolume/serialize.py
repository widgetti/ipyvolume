import logging
import numpy as np
import math
from ipython_genutils.py3compat import string_types, PY3
import ipyvolume as ipv
import ipywidgets
import ipywebrtc

logger = logging.getLogger("ipyvolume")
try:
	from io import BytesIO as StringIO # python3
except:
	from StringIO import StringIO # python2
from base64 import b64encode
import warnings

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


def cube_to_png(grid, vmin, vmax, file):
	image_width = 2048
	slices = grid.shape[0]
	columns = image_width // grid.shape[2]
	rows = int(math.ceil(slices/columns))
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
	with warnings.catch_warnings():
		warnings.simplefilter("ignore")
		img = PIL.Image.frombuffer("RGBA", (image_width, image_height), data, 'raw')
		img.save(file, "png")
	return (image_width, image_height), (grid.shape[2], grid.shape[1]), rows, columns, grid.shape[0]

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


def from_json(value, obj=None):
	return []

def array_to_json(ar, obj=None):
	return ar.tolist() if ar is not None else None


def array_to_binary(ar, obj=None, force_contiguous=True):
	if ar.dtype.kind not in ['u', 'i', 'f']:  # ints and floats
		raise ValueError("unsupported dtype: %s" % (ar.dtype))
	if ar.dtype == np.float64:  # WebGL does not support float64, case it here
		ar = ar.astype(np.float32)
	if ar.dtype == np.int64:  # JS does not support int64
		ar = ar.astype(np.int32)
	if force_contiguous and not ar.flags["C_CONTIGUOUS"]:  # make sure it's contiguous
		ar = np.ascontiguousarray(ar)
	return {'buffer':memoryview(ar), 'dtype':str(ar.dtype), 'shape':ar.shape}


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
	if dimension == 0: # scalars are passed as is (json)
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
	if dimension == 3:
		return [array_to_binary(ar[k]) for k in range(len(ar))]
	else:
		return [array_to_binary(ar)]

color_serialization = dict(to_json=color_to_binary_or_json, from_json=None)
array_sequence_serialization = dict(to_json=array_sequence_to_binary_or_json, from_json=None)
array_serialization = dict(to_json=array_to_binary_or_json, from_json=None)

array_cube_png_serialization = dict(to_json=cube_to_json, from_json=from_json)
array_rgba_png_serialization = dict(to_json=rgba_to_json, from_json=from_json)
#array_binary_serialization = dict(to_json=array_to_binary_or_json, from_json=from_json_to_array)
image_serialization = dict(to_json=image_to_url, from_json=None)
texture_serialization = dict(to_json=texture_to_json, from_json=None)


if __name__ == "__main__":
    import sys
    grid = np.load(sys.argv[1]).items()[0][1]
    with open(sys.argv[2], "wb") as f:
	    cube_to_png(np.log10(grid+1), f)
