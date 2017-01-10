import logging
import numpy as np
logger = logging.getLogger("ipyvolume")
from io import BytesIO as StringIO
from base64 import b64encode

def cube_to_png(grid, file):
	#f = StringIO()
	# filename = os.path.join(base_path, "cube.png")
	#self.subspace_gridded.cube_png(file=f)
	if grid.shape != ((128,) * 3):
		logger.error("only 128**3 cubes are supported")
		return None
	data = np.zeros((128 * 8, 128 * 16, 4), dtype=np.uint8)

	vmin, vmax = np.nanmin(grid), np.nanmax(grid)
	grid_normalized = (grid - vmin) / (vmax - vmin)
	print(np.nanmin(grid_normalized), np.nanmax(grid_normalized))
	grid_normalized[~np.isfinite(grid_normalized)] = 0
	# intensity_normalized = (np.log(self.data3d + 1.) - np.log(mi)) / (np.log(ma) - np.log(mi));
	import PIL.Image
	for y2d in range(8):
		for x2d in range(16):
			zindex = x2d + y2d * 16
			I = grid_normalized[zindex]
			subdata = data[y2d * 128:(y2d + 1) * 128, x2d * 128:(x2d + 1) * 128]
			subdata[...,0] = (I*255).astype(np.uint8)
			for i in range(3):
				subdata[...,i+1] = subdata[...,0]
			#subdata[..., i + 1] = 255
	img = PIL.Image.frombuffer("RGBA", (128 * 16, 128 * 8), data, 'raw')
	img.save(file, "png")

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
	#print("shape rgba", rgba.shape[:2], vmin, vmax, rgba.sum())
	img = PIL.Image.frombuffer("RGBA", rgba.shape[:2], data, 'raw')
	img.save(file, "png")

def rgba_to_json(rgba, obj=None):
	f = StringIO()
	rgba_to_png(rgba, f)
	image_url = "data:image/png;base64," + b64encode(f.getvalue()).decode("ascii") # + "'"
	return image_url #dict(shape=grid.shape, image=image_url)

def cube_to_json(grid, obj=None):
	f = StringIO()
	cube_to_png(grid, f)
	image_url = "data:image/png;base64," + b64encode(f.getvalue()).decode("ascii") # + "'"
	return image_url #dict(shape=grid.shape, image=image_url)

def from_json(value, obj=None):
	return []

array_cube_png_serialization = dict(to_json=cube_to_json, from_json=from_json)
array_rgba_png_serialization = dict(to_json=rgba_to_json, from_json=from_json)

if __name__ == "__main__":
    import sys
    grid = np.load(sys.argv[1]).items()[0][1]
    with open(sys.argv[2], "wb") as f:
	    cube_to_png(np.log10(grid+1), f)