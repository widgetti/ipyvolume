Virtual reality
===============

Ipyvolume can render in stereo, and go fullscreen (not supported for iOS). Together with `Google Cardboard <https://vr.google.com/cardboard/>`_ or other VR glasses (I am using VR Box 2) this enables virtual reality visualisation. Since mobile devices are usually less powerful, the example below is rendered at low resolution to enable a reasonable framerate on all devices.

Open this page on your mobile device, enter fullscreen mode and put on your glasses, looking around will rotate the object to improve depth perception.

.. ipywidgets-display::

    import ipyvolume as ipv
    aqa2 = ipv.datasets.aquariusA2.fetch()
    ipv.quickvolshow(aqa2.data.T, lighting=True, level=[0.16, 0.25, 0.46], width=256, height=256, stereo=True, opacity=0.06)
