# Installation

## Using pip

*Advice: Make sure you use conda or virtualenv. If you are not a root user and want to use the `--user` argument for pip, you expose the installation to all python environments, which is a bad practice, make sure you know what you are doing.*

```
$ pip install ipyvolume
```

## Conda/Anaconda

```
$ conda install -c conda-forge ipyvolume
```

## For Jupyter lab users

The Jupyter lab extension is not enabled by default (yet).

```
$ conda install -c conda-forge nodejs  # or some other way to have a recent node
$ jupyter labextension install jupyter labextension install @jupyter-widgets/jupyterlab-manager
$ jupyter labextension install ipyvolume
$ jupyter labextension install jupyter-threejs

```


## Pre-notebook 5.3

If you are still using an old notebook version, ipyvolume and its dependend extension (widgetsnbextension) need to be enabled manually. If unsure, check which extensions are enabled:

```
$ jupyter nbextention list
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
$ pip install -e .
$ jupyter nbextension install --py --symlink --sys-prefix ipyvolume
$ jupyter nbextension enable --py --sys-prefix ipyvolume
```

For all cases make sure [ipywidgets is enabled](http://ipywidgets.readthedocs.io/en/latest/user_install.html) if you use Jupyter notebook version < 5.3 (using `--user` instead of `--sys-prefix` if doing a local install):

```
$ jupyter nbextension enable --py --sys-prefix widgetsnbextension
$ jupyter nbextension enable --py --sys-prefix pythreejs
$ jupyter nbextension enable --py --sys-prefix ipywebrtc
$ jupyter nbextension enable --py --sys-prefix ipyvolume
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
