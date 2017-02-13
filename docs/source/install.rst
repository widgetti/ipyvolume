.. _install:

Installation
============

Pip as root
-----------

::

    pip install ipyvolume
    jupyter nbextension enable --py --sys-prefix ipyvolume
    jupyter nbextension enable --py --sys-prefix widgetsnbextension

Pip as user
-----------

::

    pip install ipyvolume --user
    jupyter nbextension enable --py --user ipyvolume
    jupyter nbextension enable --py --user widgetsnbextension



Conda/Anaconda
--------------

::

    conda install -c conda-forge ipyvolume
    pip install ipywidgets~=6.0.0b5 # Possible included with a --user flag


The last pip install is needed since the beta of ipywidgets is not available on conda-forge at the moment of writing.


