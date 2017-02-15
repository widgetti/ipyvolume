import json
import ipywidgets

template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
{extra_script_head}
</head>
<body>
{body_pre}

<script src="https://unpkg.com/jupyter-js-widgets@~2.0.20/dist/embed.js"></script>
<script type="application/vnd.jupyter.widget-state+json">
{json_data}
</script>
{widget_views}

{body_post}
</body>
</html>
"""

widget_view_template = """<script type="application/vnd.jupyter.widget-view+json">
{{
    "model_id": "{model_id}"
}}
</script>"""


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

def add_referring_widgets(states, drop_defaults=False):
    found_new = False
    for widget_id, widget in ipywidgets.Widget.widgets.items(): # go over all widgets
        #print("widget", widget, widget_id)
        if widget_id not in states:
            #print("check members")
            widget_state = widget.get_state(drop_defaults=drop_defaults)
            widgets_found = []
            for key, value in widget_state.items():
                value = getattr(widget, key)
                if isinstance(value, ipywidgets.Widget):
                    widgets_found.append(value)
                elif isinstance(value, (list, tuple)):
                    for item in value:
                        if isinstance(item, ipywidgets.Widget):
                            widgets_found.append(item)
                elif isinstance(value, dict):
                    for item in value.values():
                        if isinstance(item, ipywidgets.Widget):
                            widgets_found.append(item)
            #print("found", widgets_found)
            for widgets_found in widgets_found:
                if widgets_found.model_id in states:
                    #print("we found that we needed to add ", widget_id, widget)
                    states[widget.model_id] = {
                        'model_name': widget._model_name,
                        'model_module': widget._model_module,
                        'model_module_version': widget._model_module_version,
                        'state': widget_state
                    }
                    found_new = True

                                #get_state(value, store, drop_defaults=drop_defaults)
    return found_new
def embed_html(filename, widgets, drop_defaults=False, all=False, title="ipyvolume embed example", template=template, **kwargs):
    try:
        widgets[0]
    except (IndexError, TypeError):
        widgets = [widgets]
    with open(filename, "w") as f:
        # collect the state of all relevant widgets
        state = {}
        if all:
            state = ipywidgets.Widget.get_manager_state(drop_defaults=drop_defaults)["state"]
        for widget in widgets:
            if not all:
                get_state(widget, state, drop_defaults=drop_defaults)
        # it may be that other widgets refer to the collected widgets, such as layouts, include those as well
        while add_referring_widgets(state):
            pass
        values = dict(extra_script_head="", body_pre="", body_post="")
        values.update(kwargs)
        widget_views = ""
        for widget in widgets:
            widget_views += widget_view_template.format(**dict(model_id=widget.model_id))
        values.update(dict(title=title,
                      json_data=json.dumps(dict(version_major=1, version_minor=0, state=state)),
                           widget_views=widget_views))
        html_code = template.format(**values)
        f.write(html_code)