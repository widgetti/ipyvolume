"""Module defining several styles.

Possible properies

 * background-color
 * background-opacity
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

Run:
python -m ipyvolume.style
to update the json style (needed for the js side)
"""

import os
import json

from ipyvolume import utils


styles = {}
_defaults = {
    'background-opacity': 1.0,
    'axes': {'visible': True, 'label': {'color': 'black'}, 'ticklabel': {'color': 'black'}},
    'box': {'visible': True},
}


def create(name, properties):
    styles[name] = properties
    return properties


light = create("light", {'background-color': 'white', 'axes': {'color': 'black'}})

default = {}
utils.dict_deep_update(default, _defaults)
utils.dict_deep_update(default, light)

dark = create(
    "dark",
    {
        'background-color': '#000001',  # for some reason we cannot set it to black!?!
        'axes': {'color': 'white', 'label': {'color': 'white'}, 'ticklabel': {'color': 'white'}},
    },
)

demo = create(
    "demo",
    {
        'background-color': 'white',
        'box': {'color': 'pink', 'visible': True},
        'axes': {
            'color': 'black',
            'visible': True,
            'x': {'color': '#f00', 'label': {'color': '#0f0'}, 'ticklabel': {'color': '#00f'}},
            'y': {'color': '#0f0', 'label': {'color': '#00f'}, 'ticklabel': {'color': '#f00'}},
            'z': {'color': '#00f', 'label': {'color': '#f00'}, 'ticklabel': {'color': '#0f0'}},
        },
    },
)

minimal = {'box': {'visible': False}, 'axes': {'visible': False}}
nobox = create("nobox", {'box': {'visible': False}, 'axes': {'visible': True}})

_ar = {
    'background-color': '#000001',  # for some reason we cannot set it to black!?!
    'background-opacity': 0,
}
utils.dict_deep_update(_ar, minimal)
ar = create("ar", _ar)

if __name__ == "__main__":
    source = __file__
    dest = os.path.join(os.path.dirname(source), "../js/data/style.json")
    print(source, dest)
    need_update = (not os.path.exists(dest)) or (os.path.getmtime(source) > os.path.getmtime(dest))
    if need_update:
        print(styles)
        with open(dest, "w") as f:
            json.dump(styles, f, indent=2)
        print("wrote json")
