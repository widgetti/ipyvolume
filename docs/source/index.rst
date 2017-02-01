.. ipyvolume documentation master file, created by
   sphinx-quickstart on Wed Jan 18 15:42:24 2017.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

=========
Ipyvolume
=========

IPyvolume is a Python library to visualize 3d volumes (in the Jupyter notebook), with minimal configuration and effort. It is currently pre-alpha, use at own risk. IPyvolume's *volshow* is to 3d arrays what matplotlib's imshow is to 2d arrays.

Quick example
=============

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
    ipyvolume.volshow(V, level=[0.25, 0.75], opacity=0.03, level_width=0.1, data_min=0, data_max=1)


Quick installation
==================

This will most likely work, otherwise read :ref:`install`

::

    pip install ipyvolume
    jupyter nbextension enable --py --sys-prefix ipyvolume
    jupyter nbextension enable --py --sys-prefix widgetsnbextension



Contents
========

.. toctree::
    :maxdepth: 2

    install
    examples
    api
    vr





Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`


