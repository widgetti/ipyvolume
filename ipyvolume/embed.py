import json
import ipywidgets

template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
</head>
<body>

<script src="https://unpkg.com/jupyter-js-widgets@~2.0.20/dist/embed.js"></script>
<script type="application/vnd.jupyter.widget-state+json">
{json_data}
</script>
</script>
<script type="application/vnd.jupyter.widget-view+json">
{{
    "model_id": "{model_id}"
}}
</script>

</body>
</html>
"""


def get_state(widget, store=None, drop_defaults=False):
    if store is None:
        store = dict()
    state = widget.get_state(drop_defaults=drop_defaults)
    store[widget.model_id] = {
        'model_name': widget._model_name,
        'model_module': widget._model_module,
        'model_module_version': widget._model_module_version,
        'state': state
    }
    for key, value in state.items():
        value = getattr(widget, key)
        if isinstance(value, ipywidgets.Widget):
            get_state(value, store, drop_defaults=drop_defaults)
        elif isinstance(value, (list, tuple)):
            for item in value:
                if isinstance(item, ipywidgets.Widget):
                    get_state(item, store, drop_defaults=drop_defaults)
        elif isinstance(value, dict):
            for item in value.values():
                if isinstance(item, ipywidgets.Widget):
                    get_state(item, store, drop_defaults=drop_defaults)
    return store


def embed_html(filename, widget, drop_defaults=False):
    with open(filename, "w") as f:
        if widget is None:
            state = ipywidgets.Widget.get_manager_state(drop_defaults=drop_defaults)["state"]
        else:
            state = get_state(widget, drop_defaults=drop_defaults)
        values = dict(title="ipyvolume embed example",
                      json_data=json.dumps(dict(version_major=1, version_minor=0, state=state)),
                      model_id=widget.model_id)
        html_code = template.format(**values)
        f.write(html_code)