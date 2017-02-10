import logging
import numpy as np
import math
logger = logging.getLogger("ipyvolume")
from io import BytesIO as StringIO
from base64 import b64encode
import warnings


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

def from_json_to_array(value, obj=None):
	return np.array(value) if value else None

array_cube_png_serialization = dict(to_json=cube_to_json, from_json=from_json)
array_rgba_png_serialization = dict(to_json=rgba_to_json, from_json=from_json)
array_serialization = dict(to_json=array_to_json, from_json=from_json_to_array)

if __name__ == "__main__":
    import sys
    grid = np.load(sys.argv[1]).items()[0][1]
    with open(sys.argv[2], "wb") as f:
	    cube_to_png(np.log10(grid+1), f)