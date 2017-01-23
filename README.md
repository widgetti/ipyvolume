ipyvolume
===============================
[![Documentation](https://readthedocs.org/projects/ipyvolume/badge/?version=latest)](https://ipyvolume.readthedocs.io/en/latest/?badge=latest)


IPython widget for rendering 3d volumes in the Jupyter notebook

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


