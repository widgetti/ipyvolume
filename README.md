# ipyvolume

[![Join the chat at https://gitter.im/maartenbreddels/ipyvolume](https://badges.gitter.im/maartenbreddels/ipyvolume.svg)](https://gitter.im/maartenbreddels/ipyvolume?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Documentation](https://readthedocs.org/projects/ipyvolume/badge/?version=latest)](https://ipyvolume.readthedocs.io/en/latest/?badge=latest)
[![Version](https://img.shields.io/pypi/v/ipyvolume.svg)](https://pypi.python.org/pypi/ipyvolume)
[![Anaconda-Server Badge](https://anaconda.org/conda-forge/ipyvolume/badges/downloads.svg)](https://anaconda.org/conda-forge/ipyvolume)
[![Coverage Status](https://coveralls.io/repos/github/maartenbreddels/ipyvolume/badge.svg)](https://coveralls.io/github/maartenbreddels/ipyvolume)
[![Build Status](https://travis-ci.org/maartenbreddels/ipyvolume.svg?branch=master)](https://travis-ci.org/maartenbreddels/ipyvolume)

Try out in mybinder: [![Binder](http://mybinder.org/badge.svg)](https://beta.mybinder.org/v2/gh/maartenbreddels/ipyvolume/master?filepath=notebooks/simple.ipynb)

3d plotting for Python in the Jupyter notebook based on IPython widgets using WebGL.

Ipyvolume currently can
 * Do (multi) volume rendering.
 * Create scatter plots (up to ~1 million glyphs).
 * Create quiver plots (like scatter, but with an arrow pointing in a particular direction).
 * Render isosurfaces.
 * Do lasso mouse selections.
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
 * Show a custom popup on hovering over a glyph.

# Documentation

Documentation is generated at readthedocs: [![Documentation](https://readthedocs.org/projects/ipyvolume/badge/?version=latest)](https://ipyvolume.readthedocs.io/en/latest/?badge=latest)

# Screencast demos

## Animation
```python
import ipyvolume as ipv
ds_stream = ipv.datasets.animated_stream.fetch()

fig = ipv.figure()
ipv.style.use('dark')
q = ipv.quiver(*ds_stream.data, size=6)
ipv.animation_control(q, interval=200)
ipv.show()
```
![Animation of ds_stream.data](https://user-images.githubusercontent.com/30920819/46180725-4eda9200-c305-11e8-9d09-4eecae487502.gif)

(see more at [the documentation](https://ipyvolume.readthedocs.io/en/latest/animation.html))

## Volume rendering

![screencast](https://raw.githubusercontent.com/maartenbreddels/ipyvolume/master/misc/screencast.gif)

## Glyphs (quiver plots)

![screencast quiver](https://raw.githubusercontent.com/maartenbreddels/ipyvolume/master/misc/screencast_quiver.gif)

# Installation

If you want to use Jupyter Lab, please use version 3.0.

## Using pip

*Advice: Make sure you use conda or virtualenv. If you are not a root user and want to use the `--user` argument for pip, you expose the installation to all python environments, which is a bad practice, make sure you know what you are doing.*

```
$ pip install ipyvolume
```

## Conda/Anaconda

```
$ conda install -c conda-forge ipyvolume
```


## Pre-notebook 5.3

If you are still using an old notebook version, ipyvolume and its dependend extension (widgetsnbextension) need to be enabled manually. If unsure, check which extensions are enabled:

```
$ jupyter nbextension list
```

If not enabled, enable them:

```
$ jupyter nbextension enable --py --sys-prefix ipyvolume
$ jupyter nbextension enable --py --sys-prefix widgetsnbextension
```

## Pip as user: (but really, do not do this)

**You have been warned, do this only if you know what you are doing, this might hunt you in the future, and now is a good time to consider learning virtualenv or conda.**

```
$ pip install ipyvolume --user
$ jupyter nbextension enable --py --user ipyvolume
$ jupyter nbextension enable --py --user widgetsnbextension
```



## Developer installation

```
$ git clone https://github.com/maartenbreddels/ipyvolume.git
$ cd ipyvolume
$ pip install -e . notebook jupyterlab
$ (cd js; npm run build)
$ jupyter nbextension install --py --overwrite --symlink --sys-prefix ipyvolume
$ jupyter nbextension enable --py --sys-prefix ipyvolume
# for jupyterlab (>=3.0), symlink share/jupyter/labextensions/bqplot-image-gl
$ jupyter labextension develop . --overwrite
```


## Developer workflow

### Jupyter notebook (classical)

*Note: There is never a need to restart the notebook server, nbextensions are picked up after a page reload.*

Start this command:
```
$ (cd js; npm run watch)
```

It will
 * Watch for changes in the sourcecode and run the typescript compiler for transpilation of the `src` dir to the `lib` dir.
 * Watch the lib dir, and webpack will build (among other things), `ROOT/ipyvolume/static/index.js`.

Refresh the page.
