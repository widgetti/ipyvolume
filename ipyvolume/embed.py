import os
import json
import ipywidgets
import ipyvolume
from base64 import standard_b64encode

template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
{extra_script_head}
</head>
<body>
{body_pre}

<script src="{embed_url}"></script>
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


template_external = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
{extra_script_head}
</head>
<body>
{body_pre}

<script src="https://unpkg.com/jupyter-js-widgets@~2.0.20/dist/embed.js"></script>
<script type="javascript">
widget_data = {json_data}
</script>
{widget_views}

{body_post}
</body>
</html>
"""

widget_view_template_external = """<script type="javascript">
widget_views = {{
    "model_id": "{model_id}"
}}
</script>"""



def get_widget_state(widget, drop_defaults=False):
    model_state = widget.get_state(drop_defaults=drop_defaults)
    model_state, buffer_paths, buffers = ipywidgets.widget._remove_buffers(model_state)
    state = {
        'model_name': widget._model_name,
        'model_module': widget._model_module,
        'model_module_version': widget._model_module_version,
        'state': model_state
    }
    if len(buffers) > 0:
        buffer_list = [{'encoding': 'base64', 'path': p, 'data': standard_b64encode(d).decode('ascii')} for p, d in zip(buffer_paths, buffers)]
        state['buffers'] = buffer_list
    return state

def get_state(widget, store=None, drop_defaults=False):
    if store is None:
        store = dict()
    state = widget.get_state(drop_defaults=drop_defaults)
    store[widget.model_id] = widget._get_embed_state(drop_defaults=drop_defaults)
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
            widget_state, buffer_paths, buffers = ipywidgets.widget._remove_buffers(widget_state)
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
                    states[widget.model_id] = widget._get_embed_state(drop_defaults=drop_defaults)
                    found_new = True
    return found_new
import ipywidgets.embed

def embed_html(filename, widgets, drop_defaults=False, all=False, title="ipyvolume embed example", external_json=False,
               indent=2,
               template=template, template_options={"embed_url":ipywidgets.embed.DEFAULT_EMBED_SCRIPT_URL},
               widget_view_template=widget_view_template, **kwargs):
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

        values = template_options.copy()
        values.update(dict(extra_script_head="", body_pre="", body_post=""))
        values.update(kwargs)
        widget_views = ""
        for widget in widgets:
            widget_views += widget_view_template.format(**dict(model_id=widget.model_id))
        # Rely on ipywidget to get the default values
        json_data = ipywidgets.widgets.Widget.get_manager_state(widgets=[])
        # but plug in our own state
        json_data['state'] = state
        if external_json:
            filename_base = os.path.splitext(filename)[0]
            with open(filename_base+".json", "w") as fjson:
                json.dump(json_data, fjson)
            values.update(dict(title=title, widget_views=widget_views))
        else:
            values.update(dict(title=title,
                      json_data=json.dumps(json_data, indent=indent),
                           widget_views=widget_views))
        html_code = template.format(**values)
        f.write(html_code)
