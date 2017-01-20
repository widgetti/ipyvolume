.. ipyvolume documentation master file, created by
   sphinx-quickstart on Wed Jan 18 15:42:24 2017.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

Ipyvolume
=========

IPyvolume is a Python library to visualize 3d volumes (in the Jupyter notebook), with minimal configuration and effort. It is currently pre-alpha, use at own risk.

Examples
========
.. ipywidgets-setup::

    from ipywidgets import VBox, jsdlink, IntSlider, Button
    import ipyvolume

.. ipywidgets-display::

    tf = ipyvolume.transferfunction.TransferFunctionWidgetJs3()
    ipyvolume.example_ylm(tf=tf)

Use with vaex
-------------
.. ipywidgets-display::

   import vaex as vx
   import ipyvolume
   from scipy.ndimage import gaussian_filter as gf
   import numpy as np
   ds = vx.datasets.helmi_de_zeeuw.fetch()
   counts = ds.count(binby=["x", "y", "z"], limits=[-10, 10], shape=128)
   counts = np.log10(gf(counts, 2))
   ipyvolume.volume(counts.T, level1=0.6, level2=0.8, level3=0.9, opacity2=0.03)

Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`

