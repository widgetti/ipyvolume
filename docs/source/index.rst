.. ipyvolume documentation master file, created by
   sphinx-quickstart on Wed Jan 18 15:42:24 2017.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

Ipyvolume
=========

IPyvolume is a Python library to visualize 3d volumes (in the Jupyter notebook), with minimal configuration and effort. It is currently pre-alpha, use at own risk. IPyvolume's *volshow* is to 3d arrays what matplotlib's imshow is to 2d arrays.


Installation
============

Pip as root
-----------

::

    pip install ipyvolume
    jupyter nbextension enable --py --sys-prefix widgetsnbextension

Pip as user
-----------

::

    pip install ipyvolume --user
    jupyter nbextension enable --py --user widgetsnbextension


Examples
========
.. ipywidgets-setup::

   from ipywidgets import VBox, jsdlink, IntSlider, Button
   import ipyvolume
   import numpy as np

Generated volume
----------------

From a numpy array, we create two boxes, using slicing, and visualize it using :any:`volshow`.

.. ipywidgets-display::
    import numpy as np
    import ipyvolume
    V = np.zeros((128,128,128)) # our 3d array
    # outer box
    V[30:-30,30:-30,30:-30] = 0.75
    V[35:-35,35:-35,35:-35] = 0.0
    # inner box
    V[50:-50,50:-50,50:-50] = 0.25
    V[55:-55,55:-55,55:-55] = 0.0
    ipyvolume.volshow(V, level=[0.25, 0.75], opacity=0.03, width=0.1, data_min=0, data_max=1)

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


API docs
========

ipyvolume.volume
----------------

.. automodule:: ipyvolume.volume
    :members: volshow, Volume
    :undoc-members:
    :show-inheritance:


Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`


