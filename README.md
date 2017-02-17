ipyvolume
===============================
[![Documentation](https://readthedocs.org/projects/ipyvolume/badge/?version=latest)](https://ipyvolume.readthedocs.io/en/latest/?badge=latest)
[![Version](https://img.shields.io/pypi/v/ipyvolume.svg)](https://pypi.python.org/pypi/ipyvolume)
[![Anaconda-Server Badge](https://anaconda.org/conda-forge/ipyvolume/badges/downloads.svg)](https://anaconda.org/conda-forge/ipyvolume)
[![Coverage Status](https://coveralls.io/repos/github/maartenbreddels/ipyvolume/badge.svg)](https://coveralls.io/github/maartenbreddels/ipyvolume)
[![Build Status](https://travis-ci.org/maartenbreddels/ipyvolume.svg?branch=master)](https://travis-ci.org/maartenbreddels/ipyvolume)

IPython widget for rendering 3d volumes and glyphs (e.g. scatter and quiver) in the Jupyter notebook. Plots can be exported as standalone html, and render in stereo to show it in virtual reality on your phone with Google Cardboard.

Try out in mybinder: [![Binder](https://img.shields.io/badge/launch-binder-red.svg)](http://mybinder.org/repo/maartenbreddels/ipyvolume/notebooks/examples/simple.ipynb?kernel_name=python2)

Screencast showing the volume rendering
![screencast](https://raw.githubusercontent.com/maartenbreddels/ipyvolume/master/misc/screencast.gif)

Volume rendering and glyphs (quiver)
![screencast quiver](https://raw.githubusercontent.com/maartenbreddels/ipyvolume/master/misc/screencast_quiver.gif)

Installation
------------

To install use pip:

    $ pip install ipyvolume
    $ jupyter nbextension enable --py --sys-prefix ipyvolume

To install use pip (as non-admin):

    $ pip install ipyvolume --user
    $ jupyter nbextension enable --py --user ipyvolume


For a development installation (requires npm),

    $ git clone https://github.com/maartenbreddels/ipyvolume.git
    $ cd ipyvolume
    $ pip install -e .
    $ jupyter nbextension install --py --symlink --sys-prefix ipyvolume
    $ jupyter nbextension enable --py --sys-prefix ipyvolume


