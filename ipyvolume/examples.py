import numpy as np
import scipy.special
import ipyvolume

__all__ = ["example_ylm"]

def xyz(shape=128, limits=[-3, 3], spherical=False):
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
	x, y, z = np.ogrid.__getitem__(v)
	if spherical:
		r = np.linalg.norm([x, y, z])
		theta = np.arctan2(y, x)
		phi = np.arccos(z / r)
		return x, y, z, r, theta, phi
	else:
		return x, y, z


def example_ylm(shape=128, limits=[-3, 3], **kwargs):
	__, __, __, r, theta, phi = xyz(shape=shape, limits=limits, spherical=True)
	radial = np.exp(-(r - 2) ** 2)
	data = np.abs(scipy.special.sph_harm(0, 2, theta, phi) ** 2) * radial
	return ipyvolume.volume(data=data.T, **kwargs)


# http://graphics.stanford.edu/data/voldata/
