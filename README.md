ipyvolume
===============================

IPython widget for rendering 3d volumes

Installation
------------

To install use pip:

    $ pip install ipyvolume
    $ jupyter nbextension enable --py --sys-prefix ipyvolume


For a development installation (requires npm),

    $ git clone https://github.com/maartenbreddels/ipyvolume.git
    $ cd ipyvolume
    $ pip install -e .
    $ jupyter nbextension install --py --symlink --sys-prefix ipyvolume
    $ jupyter nbextension enable --py --sys-prefix ipyvolume
