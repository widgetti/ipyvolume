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


Dataset: Helmi & de Zeeuw 2000
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

This is a visualization of a simulation of the stellar accreted halo of the Milky Way `(Helmi & de Zeeuw 2000 <http://adsabs.harvard.edu/abs/2000MNRAS.319..657H>`_.

.. ipywidgets-display::

    hdz2000 = ipyvolume.datasets.hdz2000.fetch()
    ipyvolume.quickvolshow(hdz2000.data.T, lighting=True, level=[0.6, 0.8, 0.9], opacity=[0.01, 0.03, 0.05])

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


