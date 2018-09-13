from __future__ import absolute_import
from ._version import __version__

from . import styles
from .widgets import *
from .transferfunction import *
from . import examples
from . import datasets
from . import embed
from .pylab import *

def _jupyter_nbextension_paths():
    return [{
        'section': 'notebook',
        'src': 'static',
        'dest': 'ipyvolume',
        'require': 'ipyvolume/extension'
    }]
