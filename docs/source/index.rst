.. ipyvolume documentation master file, created by
   sphinx-quickstart on Wed Jan 18 15:42:24 2017.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

=========
Ipyvolume
=========

IPyvolume is a Python library to visualize 3d volumes and glyphs (e.g. 3d scatter plots), in the Jupyter notebook, with minimal configuration and effort. It is currently pre-1.0, so use at own risk. IPyvolume's *volshow* is to 3d arrays what matplotlib's imshow is to 2d arrays.

Other (more mature but possibly more difficult to use) related packages are `yt <http://yt-project.org/>`_, `VTK <www.vtk.org>`_ and/or `Mayavi <http://docs.enthought.com/mayavi/mayavi/>`_.


Feedback and contributions are welcome: `Github <https://github.com/maartenbreddels/ipyvolume>`_, `Email <mailto:maartenbreddels@gmail.com>`_ or `Twitter <https://twitter.com/maartenbreddels>`_.

Quick intro
===========

Volume
------

For quick resuls, use :any:`ipyvolume.volume.quickvolshow`. From a numpy array, we create two boxes, using slicing, and visualize it.

.. ipywidgets-display::
    import numpy as np
    import ipyvolume as ipv
    V = np.zeros((128,128,128)) # our 3d array
    # outer box
    V[30:-30,30:-30,30:-30] = 0.75
    V[35:-35,35:-35,35:-35] = 0.0
    # inner box
    V[50:-50,50:-50,50:-50] = 0.25
    V[55:-55,55:-55,55:-55] = 0.0
    ipv.quickvolshow(V, level=[0.25, 0.75], opacity=0.03, level_width=0.1, data_min=0, data_max=1)

Scatter plot
------------

Simple scatter plots are also supported.

.. ipywidgets-display::
    import ipyvolume as ipv
    import numpy as np
    x, y, z = np.random.random((3, 10000))
    ipv.quickscatter(x, y, z, size=1, marker="sphere")

Quiver plot
------------


Quiver plots are also supported, showing a vector at each point.

.. ipywidgets-display::
    import ipyvolume as ipv
    import numpy as np
    x, y, z, u, v, w = np.random.random((6, 1000))*2-1
    quiver = ipv.quickquiver(x, y, z, u, v, w, size=5)

Mesh plot
------------

And surface/mesh plots, showing surfaces or wireframes.

.. ipywidgets-display::
	import ipyvolume as ipv
	x, y, z, u, v = ipv.examples.klein_bottle(draw=False)
	ipv.figure()
	m = ipv.plot_mesh(x, y, z, wireframe=False)
	ipv.squarelim()
	ipv.show()


Built on Ipywidgets
-------------------

For anything more sophisticed, use :any:`ipyvolume.pylab`, ipyvolume's copy of matplotlib's 3d plotting (+ volume rendering).

Since ipyvolume is built on `ipywidgets <http://ipywidgets.readthedocs.io/>`_, we can link widget's properties.

.. ipywidgets-display::
    import ipyvolume as ipv
    import numpy as np
    x, y, z, u, v, w = np.random.random((6, 1000))*2-1
    selected = np.random.randint(0, 1000, 100)
    ipv.figure()
    quiver = ipv.quiver(x, y, z, u, v, w, size=5, size_selected=8, selected=selected)

    from ipywidgets import FloatSlider, ColorPicker, VBox, jslink
    size = FloatSlider(min=0, max=30, step=0.1)
    size_selected = FloatSlider(min=0, max=30, step=0.1)
    color = ColorPicker()
    color_selected = ColorPicker()
    jslink((quiver, 'size'), (size, 'value'))
    jslink((quiver, 'size_selected'), (size_selected, 'value'))
    jslink((quiver, 'color'), (color, 'value'))
    jslink((quiver, 'color_selected'), (color_selected, 'value'))
    VBox([ipv.gcc(), size, size_selected, color, color_selected])

Try changing the slider to the change the size of the vectors, or the colors.

Quick installation
==================

This will most likely work, otherwise read :ref:`install`

::

    pip install ipyvolume
    jupyter nbextension enable --py --sys-prefix ipyvolume
    jupyter nbextension enable --py --sys-prefix widgetsnbextension

For conda/anaconda, use:

::

    conda install -c conda-forge ipyvolume
    pip install ipywidgets~=6.0.0b5 --user


About
=====

Ipyvolume is an offspring project from `vaex <http://vaex.astro.rug.nl/>`_. Ipyvolume makes use of `threejs <https://threejs.org/>`_, and excellent Javascript library for OpenGL/WebGL rendering.



Contents
========

.. toctree::
    :maxdepth: 2

    install
    examples
    mesh
    animation
    api
    vr


Changelog
=========

 * 0.4
   
   * plotting

     * lines
     * wireframes
     * meshes/surfaces
     * isosurfaces
     * texture (animated) support, gif image and MediaStream (movie, camera, canvas)

   * camera control (angles from the python side), FoV 
   * movie creation
   * eye separation for VR
   * better screenshot support (can be to a PIL Image), and higher resolution possible
   * mouse lasso (a bit rough), selections can be made from the Python side.
   * icon bar for common operations (fullscreen, stereo, screenshot, reset etc)
   * offline support for embedding/saving to html
   * Jupyter lab support
   * New contributors
   
     * Chris Sewell
     * Satrajit Ghosh
     * Sylvain Corlay
     * stonebig
     * Matt McCormick
     * Jean Michel Arbona

 * 0.3
   
   * new
     
     * axis with labels and ticklabels
     * styling
     * animation (credits also to https://github.com/jeammimi)
     * binary transfers
     * default camera control is trackball
   
   * changed
     
     * s and ss are now spelled out, size and size_selected


Indices and tables
==================

* :ref:`genindex`
* :ref:`modindex`
* :ref:`search`
