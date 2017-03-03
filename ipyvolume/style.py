"""
Possible properies

 * background-color
 * axes
  * color
  * visible
  * label
    * color
  * ticklabel
    * color
  * x/y/z
    * color
    * visible
    * label
      * color
    * ticklabel
      * color
"""
from . import utils
import copy

_defaults = {
    'axes': {
        'visible': True,
        'label' : {
            'color': 'black'
        },
        'ticklabel': {
            'color': 'black'
        }
    },
    'box': {
        'visible': True,
    },
}

def create(name, properties):
    style = copy.deepcopy(_defaults)
    utils.dict_deep_update(style, properties)
    return style

default = light = create("light", \
{
    'background-color': 'white',
    'axes': {
        'color': 'black',
    }
})

dark = create("dark", \
{
    'background-color': 'black',
    'axes': {
        'color': 'white',
        'label': {
            'color': 'white'
        },
        'ticklabel': {
            'color': 'white'
        },
    }
})

demo = create("demo", \
{
		'background-color': 'white',
        'box' : {
            'color': 'pink',
            'visible': True,
        },
        'axes': {
            'color': 'black',
            'visible': True,
            'x': {
                'color': '#f00',
                'label': {
                    'color': '#0f0'
                },
                'ticklabel': {
                    'color': '#00f'
                },
            },
            'y': {
                'color': '#0f0',
                'label': {
                    'color': '#00f'
                },
                'ticklabel': {
                    'color': '#f00'
                }
            },
            'z': {
                    'color': '#00f',
                    'label': {
                        'color': '#f00'
                    },
                    'ticklabel': {
                        'color': '#0f0'
                    }
            }
        }
})

minimal = {
		'background-color': 'white',
        'box' : {
            'visible': False,
        },
        'axes': {
            'visible': False,
            'color': 'black'
        }
}
