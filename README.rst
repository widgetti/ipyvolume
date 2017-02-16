ipyvolume
=========

|Documentation| |Version| |Downloads|

IPython widget for rendering 3d volumes and glyphs (e.g. scatter and quiver) in the Jupyter notebook

.. figure:: https://raw.githubusercontent.com/maartenbreddels/ipyvolume/master/misc/screencast.gif
   :alt: screencast

   screencast

Installation
------------

To install use pip:

::

   $ pip install ipyvolume
   $ jupyter nbextension enable --py --sys-prefix ipyvolume

To install use pip (as non-admin):

::

   $ pip install ipyvolume --user
   $ jupyter nbextension enable --py --user ipyvolume

For a development installation (requires npm),

::

   $ git clone https://github.com/maartenbreddels/ipyvolume.git
   $ cd ipyvolume
   $ pip install -e .
   $ jupyter nbextension install --py --symlink --sys-prefix ipyvolume
   $ jupyter nbextension enable --py --sys-prefix ipyvolume

.. |Documentation| image:: https://readthedocs.org/projects/ipyvolume/badge/?version=latest
   :target: https://ipyvolume.readthedocs.io/en/latest/?badge=latest
.. |Version| image:: https://img.shields.io/pypi/v/ipyvolume.svg
   :target: https://pypi.python.org/pypi/ipyvolume
.. |Downloads| image:: https://img.shields.io/pypi/dm/ipyvolume.svg
   :target: https://pypi.python.org/pypi/ipyvolume
