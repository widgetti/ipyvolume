Examples
========
.. ipywidgets-setup::

   from ipywidgets import VBox, jsdlink, IntSlider, Button
   import ipyvolume
   import ipyvolume.pylab as p3
   import numpy as np

More example
------------

.. toctree::
   :maxdepth: 2

   bokeh
   bqplot
   example_glyphs
   example_mcmc


Volume rendering only
---------------------

Math example
~~~~~~~~~~~~

Here we visualize spherical harmonics.

.. ipywidgets-display::

    ipyvolume.example_ylm(shape=32)


Use with vaex
~~~~~~~~~~~~~

In combination with `vaex <http://vaex.astro.rug.nl/>`_ .(currently not working on rtd)

.. ipywidgets-display::

   import vaex as vx
   import ipyvolume
   from scipy.ndimage import gaussian_filter as gf
   import numpy as np
   ds = vx.datasets.helmi_de_zeeuw.fetch()
   counts = ds.count(binby=["x", "y", "z"], limits=[-10, 10], shape=128)
   counts = np.log10(gf(counts, 2))
   ipyvolume.quickvolshow(counts.T, level=[0.6, 0.8, 0.9], opacity=[0.01, 0.03, 0.05])


