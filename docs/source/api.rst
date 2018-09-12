API docs
========

Note that ipyvolume.pylab and ipyvolume.widgets are imported in the ipyvolume namespace, to you can access ipyvolume.scatter instead of ipyvolume.pylab.scatter.

Quick list for plotting.
------------------------

.. autosummary::

    ipyvolume.pylab.volshow
    ipyvolume.pylab.scatter
    ipyvolume.pylab.quiver
    ipyvolume.pylab.plot
    ipyvolume.pylab.plot_surface
    ipyvolume.pylab.plot_trisurf
    ipyvolume.pylab.plot_wireframe
    ipyvolume.pylab.plot_mesh
    ipyvolume.pylab.plot_isosurface

Quick list for controlling the figure.
--------------------------------------

.. autosummary::

    ipyvolume.pylab.figure
    ipyvolume.pylab.gcf
    ipyvolume.pylab.gcc
    ipyvolume.pylab.clear
    ipyvolume.pylab.show
    ipyvolume.pylab.view
    ipyvolume.pylab.xlim
    ipyvolume.pylab.ylim
    ipyvolume.pylab.zlim
    ipyvolume.pylab.xyzlim


Quick list for style and labels.
--------------------------------

.. autosummary::

    ipyvolume.pylab.xlabel
    ipyvolume.pylab.ylabel
    ipyvolume.pylab.zlabel
    ipyvolume.pylab.xyzlabel
    ipyvolume.pylab.style.use
    ipyvolume.pylab.style.set_style_dark
    ipyvolume.pylab.style.set_style_light
    ipyvolume.pylab.style.box_off
    ipyvolume.pylab.style.box_on
    ipyvolume.pylab.style.axes_off
    ipyvolume.pylab.style.axes_on
    ipyvolume.pylab.style.background_color

Quick list for saving figures.
------------------------------

.. autosummary::

    ipyvolume.pylab.save
    ipyvolume.pylab.savefig
    ipyvolume.pylab.screenshot



ipyvolume.pylab
---------------

.. automodule:: ipyvolume.pylab
    :members: scatter, quiver, plot, volshow, plot_surface, plot_trisurf, plot_wireframe, plot_mesh, plot_isosurface, xlim, ylim, zlim, xyzlim, xlabel, ylabel, zlabel, xyzlabel, view, figure, gcf, gcc, clear, show, save, savefig, screenshot, selector_default, movie, animation_control, transfer_function, style
    :undoc-members:
    :show-inheritance:

ipyvolume.widgets
-----------------

Test :any:`pythreejs.Camera`

.. automodule:: ipyvolume.widgets
    :members: quickvolshow, quickscatter, quickquiver, volshow, Figure, Volume, Scatter, Mesh
    :undoc-members:
    :show-inheritance:

ipyvolume.examples
------------------

.. automodule:: ipyvolume.examples
    :members:
    :undoc-members:
    :show-inheritance:

ipyvolume.headless
------------------

.. automodule:: ipyvolume.headless
    :members:
    :undoc-members:
    :show-inheritance:
