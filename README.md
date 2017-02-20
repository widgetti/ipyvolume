# ipyvolume

[![Join the chat at https://gitter.im/maartenbreddels/ipyvolume](https://badges.gitter.im/maartenbreddels/ipyvolume.svg)](https://gitter.im/maartenbreddels/ipyvolume?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Documentation](https://readthedocs.org/projects/ipyvolume/badge/?version=latest)](https://ipyvolume.readthedocs.io/en/latest/?badge=latest)
[![Version](https://img.shields.io/pypi/v/ipyvolume.svg)](https://pypi.python.org/pypi/ipyvolume)
[![Anaconda-Server Badge](https://anaconda.org/conda-forge/ipyvolume/badges/downloads.svg)](https://anaconda.org/conda-forge/ipyvolume)
[![Coverage Status](https://coveralls.io/repos/github/maartenbreddels/ipyvolume/badge.svg)](https://coveralls.io/github/maartenbreddels/ipyvolume)
[![Build Status](https://travis-ci.org/maartenbreddels/ipyvolume.svg?branch=master)](https://travis-ci.org/maartenbreddels/ipyvolume)


3d plotting for Python in the Jupyter notebook based on IPython widgets using WebGL. 

Ipyvolume currenty can
 * Do volume rendering.
 * Create scatter plots (up to ~1 million glyphs).
 * Create quiver plots.
 * Render in the Jupyter notebook, or create a standalone html page (or snippet to embed in your page).
 * Render in stereo, for virtual reality with Google Cardboard.
 * Animate in d3 style, for instance if the x coordinates or color of a scatter plots changes.
 
Ipyvolume will probably, but not yet:
 * Render labels in latex.
 * Do isosurface rendering.
 * Do selections using mouse or touch.
 * Show a custom popup on hovering over a glyph.
 * Be stylable.

# Documentation

Documentation is generated at readthedocs:: [![Documentation](https://readthedocs.org/projects/ipyvolume/badge/?version=latest)](https://ipyvolume.readthedocs.io/en/latest/?badge=latest)

# Screencast demos

## Volume rendering 

![screencast](https://raw.githubusercontent.com/maartenbreddels/ipyvolume/master/misc/screencast.gif)

## Glyphs (quiver plots)

![screencast quiver](https://raw.githubusercontent.com/maartenbreddels/ipyvolume/master/misc/screencast_quiver.gif)

# Installation


To install use pip:

    $ pip install ipyvolume
    $ jupyter nbextension enable --py --sys-prefix ipyvolume

To install use pip (as non-admin):

    $ pip install ipyvolume --user
    $ jupyter nbextension enable --py --user ipyvolume

Or with anaconda/conda:
 
    $ pip install ipywidgets~=6.0.0b5
    $ conda install -c conda-forge ipyvolume

For a development installation (requires npm),

    $ git clone https://github.com/maartenbreddels/ipyvolume.git
    $ cd ipyvolume
    $ pip install -e .
    $ jupyter nbextension install --py --symlink --sys-prefix ipyvolume
    $ jupyter nbextension enable --py --sys-prefix ipyvolume

After changing the javascript, run npm install from the js directory, or `webpack --watch` and work from the examples/dev.ipynb notebook,
   

