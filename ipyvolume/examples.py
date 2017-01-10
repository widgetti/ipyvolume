import numpy as np
import scipy.special
import ipyvolume

x, y, z = np.ogrid[-3:3:6./128,-3:3:6./128,-3:3:6./128]
r = np.linalg.norm([x,y,z])

theta = np.arctan2(y, x)
phi = np.arccos(z/r)

__all__ = ["example_ylm"]

def example_ylm(**kwargs):
	radial = np.exp(-(r - 2) ** 2)
	data = np.abs(scipy.special.sph_harm(0, 2, theta, phi) ** 2).T * radial
	return ipyvolume.volume(data=data, **kwargs)