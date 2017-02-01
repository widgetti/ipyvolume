from ._version import version_info, __version__

from .volume import *
from .transferfunction import *
from .examples import  *
from . import datasets
from . import embed

def _jupyter_nbextension_paths():
    return [{
        'section': 'notebook',
        'src': 'static',
        'dest': 'ipyvolume',
        'require': 'ipyvolume/extension'
    }]
