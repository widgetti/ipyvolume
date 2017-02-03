Examples
========
.. ipywidgets-setup::

   from ipywidgets import VBox, jsdlink, IntSlider, Button
   import ipyvolume
   import numpy as np


Math example
------------

Here we visualize spherical harmonics.

.. ipywidgets-display::

    ipyvolume.example_ylm()

Dataset: Aquarius A2 - pure dark matter simulation
--------------------------------------------------

This is a snapshot of the pure dark matter simulations of the Aquarius project `(Springel et al. 2008) <http://adsabs.harvard.edu/abs/2008MNRAS.391.1685S>`_.

.. ipywidgets-display::

    aqa2 = ipyvolume.datasets.aquariusA2.fetch()
    ipyvolume.volshow(aqa2.data.T, lighting=True, level=[0.16, 0.25, 0.46], opacity=0.06)

Dataset: Helmi & de Zeeuw 2000
------------------------------

This is a visualization of a simulation of the stellar accreted halo of the Milky Way `(Helmi & de Zeeuw 2000 <http://adsabs.harvard.edu/abs/2000MNRAS.319..657H>`_.

.. ipywidgets-display::

    hdz2000 = ipyvolume.datasets.hdz2000.fetch()
    ipyvolume.volshow(hdz2000.data.T, lighting=True, level=[0.6, 0.8, 0.9], opacity=[0.01, 0.03, 0.05])

Use with vaex
-------------

In combination with `vaex <http://vaex.astro.rug.nl/>`_ .(currently not working on rtd)

.. ipywidgets-display::

   import vaex as vx
   import ipyvolume
   from scipy.ndimage import gaussian_filter as gf
   import numpy as np
   ds = vx.datasets.helmi_de_zeeuw.fetch()
   counts = ds.count(binby=["x", "y", "z"], limits=[-10, 10], shape=128)
   counts = np.log10(gf(counts, 2))
   ipyvolume.volshow(counts.T, level=[0.6, 0.8, 0.9], opacity=[0.01, 0.03, 0.05])


More example
------------

.. toctree::
   :maxdepth: 2

   example_mcmc
