from __future__ import absolute_import

from ipyvolume._version import __version__  # noqa: F401
from ipyvolume import styles  # noqa: F401
from ipyvolume import examples  # noqa: F401
from ipyvolume import datasets  # noqa: F401
from ipyvolume import embed  # noqa: F401
from ipyvolume.widgets import *  # noqa: F401, F403
from ipyvolume.transferfunction import *  # noqa: F401, F403
from ipyvolume.pylab import *  # noqa: F401, F403
import ipyvolume.ui  # noqa: F401, F403


def _prefix():
    import sys
    from pathlib import Path
    prefix = sys.prefix
    here = Path(__file__).parent
    # for when in dev mode
    if (here.parent / 'share/jupyter/nbextensions/ipyvolume').exists():
        prefix = here.parent
    return prefix


def _jupyter_labextension_paths():
    return [{
        'src': f'{_prefix()}/share/jupyter/labextensions/ipyvolume/',
        'dest': 'ipyvolume',
    }]


def _jupyter_nbextension_paths():
    return [{
        'section': 'notebook',
        'src': f'{_prefix()}/share/jupyter/nbextensions/ipyvolume/',
        'dest': 'ipyvolume',
        'require': 'ipyvolume/extension'
    }]
