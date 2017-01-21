.. ipyvolume documentation master file, created by
   sphinx-quickstart on Wed Jan 18 15:42:24 2017.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

Ipyvolume
=========

IPyvolume is a Python library to visualize 3d volumes (in the Jupyter notebook), with minimal configuration and effort. It is currently pre-alpha, use at own risk. IPyvolume's *volshow* is to 3d arrays what matplotlib's imshow is to 2d arrays.


Examples
========
.. ipywidgets-setup::

   from ipywidgets import VBox, jsdlink, IntSlider, Button
   import ipyvolume
   import numpy as np

Generated volume
----------------
.. ipywidgets-display::
   import numpy as np
   V = np.zeros((128,128,128)) # our 3d array
   # outer box
   V[30:-30,30:-30,30:-30] = 0.75
   V[35:-35,35:-35,35:-35] = 0.0
   # inner box
   V[50:-50,50:-50,50:-50] = 0.25
   V[55:-55,55:-55,55:-55] = 0.0
   #V[10:30,10:30,10:30] = 0.5
   # for normalization
   V[0,0,0] = 1
   ipyvolume.volshow(V, opacity1=0.03, level1=0.25,
                  opacity2=0.03, level2=0.75, opacity3=0)

Builtin funtional examples
--------------------------
.. ipywidgets-display::

    ipyvolume.example_ylm()


Use with vaex
-------------

(currently now working on rtd)
.. ipywidgets-display::

   import vaex as vx
   import ipyvolume
   from scipy.ndimage import gaussian_filter as gf
   import numpy as np
   ds = vx.datasets.helmi_de_zeeuw.fetch()
   counts = ds.count(binby=["x", "y", "z"], limits=[-10, 10], shape=128)
   counts = np.log10(gf(counts, 2))
   ipyvolume.volshow(counts.T, level1=0.6, level2=0.8, level3=0.9, opacity2=0.03)


Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`

