import numpy as np

import PIL.Image
import pythreejs

import ipyvolume as ipv
from .datasets import UrlCached

def _randomSO3():
    """return random rotatation matrix, algo by James Arvo"""
    u1 = np.random.random()
    u2 = np.random.random()
    u3 = np.random.random()
    R = np.array([[np.cos(2*np.pi*u1), np.sin(2*np.pi*u1), 0], [-np.sin(2*np.pi*u1), np.cos(2*np.pi*u1), 0], [0, 0, 1]])
    v = np.array([np.cos(2*np.pi*u2)*np.sqrt(u3), np.sin(2*np.pi*u2)*np.sqrt(u3), np.sqrt(1-u3)])
    H = np.identity(3)-2*v*np.transpose([v])
    return - np.dot(H,  R)

def spherical_galaxy_orbit(orbit_x, orbit_y, orbit_z, N_stars=100, sigma_r=1, orbit_visible=False, orbit_line_interpolate=5, N_star_orbits=10, color=[255, 220, 200], size_star=1, scatter_kwargs={}):
    """Create a fake galaxy around the points orbit_x/y/z with N_stars around it"""
    if orbit_line_interpolate > 1:
        import scipy.interpolate
        x = np.linspace(0, 1, len(orbit_x))
        x_smooth = np.linspace(0, 1, len(orbit_x)*orbit_line_interpolate)
        kind = 'quadratic'
        orbit_x_line = scipy.interpolate.interp1d(x, orbit_x, kind)(x_smooth)
        orbit_y_line = scipy.interpolate.interp1d(x, orbit_y, kind)(x_smooth)
        orbit_z_line = scipy.interpolate.interp1d(x, orbit_z, kind)(x_smooth)
    else:
        orbit_x_line = orbit_x
        orbit_y_line = orbit_y
        orbit_z_line = orbit_z
    line = ipv.plot(orbit_x_line, orbit_y_line, orbit_z_line, visible=orbit_visible)
    x = np.repeat(orbit_x, N_stars).reshape((-1, N_stars))
    y = np.repeat(orbit_y, N_stars).reshape((-1, N_stars))
    z = np.repeat(orbit_z, N_stars).reshape((-1, N_stars))
    xr, yr, zr = np.random.normal(0, scale=sigma_r, size=(3, N_stars))# + 
    r = np.sqrt(xr**2 + yr**2 + zr**2)
    
    for i in range(N_stars):
        a = np.linspace(0, 1, x.shape[0]) * 2 * np.pi * N_star_orbits
        xo = r[i] * np.sin(a)
        yo = r[i] * np.cos(a)
        zo = a * 0
        xo, yo, zo = np.dot(_randomSO3(), [xo, yo, zo])
        #print(x.shape, xo.shape)
        x[:, i] += xo
        y[:, i] += yo
        z[:, i] += zo
    
    
    sprite = ipv.scatter(x, y, z, texture=radial_sprite((64, 64), color), marker='square_2d', size=size_star, **scatter_kwargs)
    with sprite.material.hold_sync():
        sprite.material.blending = pythreejs.BlendingMode.CustomBlending
        sprite.material.blendSrc = pythreejs.BlendFactors.SrcColorFactor
        sprite.material.blendDst = pythreejs.BlendFactors.OneFactor
        sprite.material.blendEquation = 'AddEquation'
        sprite.material.transparent = True
        sprite.material.depthWrite = False
        sprite.material.alphaTest = 0.1
    return sprite, line

def radial_sprite(shape, color):
    color = np.array(color)
    ara = np.zeros(shape[:2] + (4,), dtype=np.uint8)
    x = np.linspace(-1, 1, shape[0])
    y = np.linspace(-1, 1, shape[1])
    x, y = np.meshgrid(x, y)
    s = 0.5
    radius = np.sqrt(x**2+y**2)
    amplitude = np.maximum(0, np.exp(-radius**2/s**2)).T
    ara[...,3] = (amplitude * 255)
    ara[...,:3] = color * amplitude.reshape(shape + (1,))
    im = PIL.Image.fromarray(ara, 'RGBA')
    return im

def stars(N=1000, radius=100000, thickness=3, seed=42, color=[255, 240, 240]):
    import ipyvolume as ipv
    rng = np.random.RandomState(seed)
    x, y, z = rng.normal(size=(3, N))
    r = np.sqrt(x**2 + y**2 + z**2)/(radius + thickness * radius * np.random.random(N))
    x /= r
    y /= r
    z /= r
    s = ipv.scatter(x, y, z, texture=radial_sprite((64, 64), color), marker='square_2d', grow_limits=False, size=radius*0.7/100)
    s.material.transparent = True
    return s

milkyway_url = 'https://www.nasa.gov/sites/default/files/images/620057main_milkyway_full.jpg'
milkyway_image = UrlCached(milkyway_url)



def plot_milkyway(R_sun=8, size=100):
    mw_image = PIL.Image.open(milkyway_image.fetch())
    rescale = 40
    t = np.linspace(0, 1, 100)
    xmw = np.linspace(0, 1, 10)
    ymw = np.linspace(0, 1, 10)
    xmw, ymw = np.meshgrid(xmw, ymw)
    zmw = xmw * 0 + 0.01
    mw = mesh = ipv.plot_mesh((xmw-0.5)*rescale, (ymw-0.5)*rescale+R_sun, zmw, u=xmw, v=ymw, texture=mw_image, wireframe=False)
    mw.material.blending = pythreejs.BlendingMode.CustomBlending
    mw.material.blendSrc = pythreejs.BlendFactors.SrcColorFactor
    mw.material.blendDst = pythreejs.BlendFactors.OneFactor
    mw.material.blendEquation = 'AddEquation'
    mw.material.transparent = True
    mw.material.depthWrite = False
    mw.material.alphaTest = 0.1
    ipv.xyzlim(size)
    return mesh