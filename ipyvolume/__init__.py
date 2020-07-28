from __future__ import absolute_import

from ipyvolume._version import __version__  # noqa: F401
from ipyvolume import styles  # noqa: F401
from ipyvolume import examples  # noqa: F401
from ipyvolume import datasets  # noqa: F401
from ipyvolume import embed  # noqa: F401
from ipyvolume.widgets import *  # noqa: F401, F403
from ipyvolume.transferfunction import *  # noqa: F401, F403
from ipyvolume.pylab import *  # noqa: F401, F403
from ipyvolume.light import *

def _jupyter_nbextension_paths():
    return [{
        'section': 'notebook',
        'src': 'static',
        'dest': 'ipyvolume',
        'require': 'ipyvolume/extension'
    }]
