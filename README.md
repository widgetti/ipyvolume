# ipyvolume

[![Join the chat at https://gitter.im/maartenbreddels/ipyvolume](https://badges.gitter.im/maartenbreddels/ipyvolume.svg)](https://gitter.im/maartenbreddels/ipyvolume?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Documentation](https://readthedocs.org/projects/ipyvolume/badge/?version=latest)](https://ipyvolume.readthedocs.io/en/latest/?badge=latest)
[![Version](https://img.shields.io/pypi/v/ipyvolume.svg)](https://pypi.python.org/pypi/ipyvolume)
[![Anaconda-Server Badge](https://anaconda.org/conda-forge/ipyvolume/badges/downloads.svg)](https://anaconda.org/conda-forge/ipyvolume)
[![Coverage Status](https://coveralls.io/repos/github/maartenbreddels/ipyvolume/badge.svg)](https://coveralls.io/github/maartenbreddels/ipyvolume)
[![Build Status](https://travis-ci.org/maartenbreddels/ipyvolume.svg?branch=master)](https://travis-ci.org/maartenbreddels/ipyvolume)

Try out in mybinder: [![Binder](http://mybinder.org/badge.svg)](https://beta.mybinder.org/v2/gh/maartenbreddels/ipyvolume/master?filepath=notebooks/simple.ipynb)

3d plotting for Python in the Jupyter notebook based on IPython widgets using WebGL.

Ipyvolume currenty can
 * Do volume rendering.
 * Create scatter plots (up to ~1 million glyphs).
 * Create quiver plots (like scatter, but with an arrow pointing in a particular direction).
 * Render in the Jupyter notebook, or create a standalone html page (or snippet to embed in your page).
 * Render in stereo, for virtual reality with Google Cardboard.
 * Animate in d3 style, for instance if the x coordinates or color of a scatter plots changes.
 * Animations / sequences, all scatter/quiver plot properties can be a list of arrays, which can represent time snapshots.
 * Stylable (although still basic)
 * Integrates with
  * [ipywidgets](https://github.com/ipython/ipywidgets) for adding gui controls (sliders, button etc), see an [example at the documentation homepage](http://ipyvolume.readthedocs.io/en/latest/index.html#built-on-ipywidgets)
  * [bokeh](//bokeh.pydata.org)  by [linking the selection](http://ipyvolume.readthedocs.io/en/latest/bokeh.html)
  * [bqplot](https://github.com/bloomberg/bqplot) by [linking the selection](http://ipyvolume.readthedocs.io/en/latest/bqplot.html)

Ipyvolume will probably, but not yet:
 * Render labels in latex.
 * Do isosurface rendering.
 * Do selections using mouse or touch.
 * Show a custom popup on hovering over a glyph.

# Documentation

Documentation is generated at readthedocs: [![Documentation](https://readthedocs.org/projects/ipyvolume/badge/?version=latest)](https://ipyvolume.readthedocs.io/en/latest/?badge=latest)

# Screencast demos

## Animation

![screencast](https://cloud.githubusercontent.com/assets/1765949/23901444/8d4f26f8-08bd-11e7-81e6-cedad0a8471c.gif)

(see more at [the documentation](https://ipyvolume.readthedocs.io/en/latest/animation.html))

## Volume rendering

![screencast](https://raw.githubusercontent.com/maartenbreddels/ipyvolume/master/misc/screencast.gif)

## Glyphs (quiver plots)

![screencast quiver](https://raw.githubusercontent.com/maartenbreddels/ipyvolume/master/misc/screencast_quiver.gif)

# Installation

To install use pip:

    $ pip install ipyvolume

To install use pip (as non-admin):

    $ pip install ipyvolume --user

Or with anaconda/conda:

    $ pip install ipywidgets
    $ # or pip install ipywidgets
    $ conda install -c conda-forge ipyvolume

For a development installation (requires npm),

    $ git clone https://github.com/maartenbreddels/ipyvolume.git
    $ cd ipyvolume
    $ pip install -e .
    $ jupyter nbextension install --py --symlink --sys-prefix ipyvolume
    $ jupyter nbextension enable --py --sys-prefix ipyvolume

For all cases make sure [ipywidgets is enabled](http://ipywidgets.readthedocs.io/en/latest/user_install.html) if you use Jupyter notebook version < 5.3 (using `--user` instead of `--sys-prefix` if doing a local install):

    $ jupyter nbextension enable --py --sys-prefix widgetsnbextension
    $ jupyter nbextension enable --py --sys-prefix pythreejs
    $ jupyter nbextension enable --py --sys-prefix ipywebrtc
    $ jupyter nbextension enable --py --sys-prefix ipyvolume

After changing the javascript, run npm install from the js directory, or `webpack --watch` and work from the examples/dev.ipynb notebook.
