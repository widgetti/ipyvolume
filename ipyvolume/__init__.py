from __future__ import absolute_import

from ._version import __version__
from . import styles
from . import examples
from . import datasets
from . import embed
from .widgets import (Mesh,
                      Scatter,
                      Volume,
                      Figure,
                      quickquiver,
                      quickscatter,
                      quickvolshow)
from .transferfunction import (TransferFunction,
                               TransferFunctionJsBumps,
                               TransferFunctionWidgetJs3,
                               TransferFunctionWidget3)
from .pylab import (current,
                    clear,
                    controls_light,
                    figure,
                    gcf,
                    xlim,
                    ylim,
                    zlim,
                    xyzlim,
                    squarelim,
                    plot_trisurf,
                    plot_surface,
                    plot_wireframe,
                    plot_mesh,
                    plot,
                    scatter,
                    quiver,
                    show,
                    animate_glyphs,
                    animation_control,
                    gcc,
                    transfer_function,
                    plot_isosurface,
                    volshow,
                    save,
                    movie,
                    screenshot,
                    savefig,
                    xlabel,
                    ylabel,
                    zlabel,
                    xyzlabel,
                    view,
                    style,
                    plot_plane',
                    selector_default)

def _jupyter_nbextension_paths():
    return [{
        'section': 'notebook',
        'src': 'static',
        'dest': 'ipyvolume',
        'require': 'ipyvolume/extension'
    }]
