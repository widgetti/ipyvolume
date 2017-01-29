import numpy as np
import ipyvolume
try:
	import scipy.ndimage
	import scipy.special
except:
	pass # it's ok, it's not crucial
__all__ = ["example_ylm"]

def xyz(shape=128, limits=[-3, 3], spherical=False, sparse=True):
	dim = 3
	try:
		shape[0]
	except:
		shape = [shape] * dim
	try:
		limits[0][0]
	except:
		limits = [limits] * dim
	v = [slice(vmin, vmax+(vmax-vmin)/float(N)/2, (vmax-vmin)/float(N-1)) for (vmin, vmax), N in zip(limits, shape)]
	if sparse:
		x, y, z = np.ogrid.__getitem__(v)
	else:
		x, y, z = np.mgrid.__getitem__(v)
	if spherical:
		r = np.linalg.norm([x, y, z])
		theta = np.arctan2(y, x)
		phi = np.arccos(z / r)
		return x, y, z, r, theta, phi
	else:
		return x, y, z


def example_ylm(m=0, n=2, shape=128, limits=[-4, 4], **kwargs):
	__, __, __, r, theta, phi = xyz(shape=shape, limits=limits, spherical=True)
	radial = np.exp(-(r - 2) ** 2)
	data = np.abs(scipy.special.sph_harm(m, n, theta, phi) ** 2) * radial
	return ipyvolume.volshow(data=data.T, **kwargs)

def ball(rmax=3, rmin=0, shape=128, limits=[-4, 4], **kwargs):
	__, __, __, r, theta, phi = xyz(shape=shape, limits=limits, spherical=True)
	data = r * 0
	data[(r < rmax) & (r >= rmin)] = 0.5
	if "data_min" not in kwargs:
		kwargs["data_min"] = 0
	if "data_max" not in kwargs:
		kwargs["data_max"] = 1
	return ipyvolume.volshow(data=data.T, **kwargs)

# http://graphics.stanford.edu/data/voldata/
