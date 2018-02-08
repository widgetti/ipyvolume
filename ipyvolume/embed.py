import os
import io
import zipfile
import shutil
from ipywidgets import embed as wembed
import ipyvolume
from ipyvolume.utils import download_to_file, download_to_bytes
from ipyvolume._version import __version_threejs__

html_template = u"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    {extra_script_head}
</head>
<body>
{body_pre}
{snippet}
{body_post}
</body>
</html>
"""


def save_ipyvolumejs(target="", devmode=False,
                     version=ipyvolume._version.__version_js__, version3js=__version_threejs__):
    """ output the ipyvolume javascript to a local file
    
    :type target: str
    :type devmode: bool
    :param devmode: if True get index.js from js/dist directory
    :type version: str
    :param version: version number of ipyvolume
    :type version3js: str
    :param version3js: version number of threejs

    """
    url = "https://unpkg.com/ipyvolume@{version}/dist/index.js".format(version=version)
    pyv_filename = 'ipyvolume_v{version}.js'.format(version=version)
    pyv_filepath = os.path.join(target, pyv_filename)

    devfile = os.path.join(os.path.abspath(ipyvolume.__path__[0]), "..", "js", "dist", "index.js")
    if devmode:
        if not os.path.exists(devfile):
            raise IOError('devmode=True but cannot find : {}'.format(devfile))
        if target and not os.path.exists(target):
            os.makedirs(target)
        shutil.copy(devfile, pyv_filepath)
    else:
        download_to_file(url, pyv_filepath)

    # TODO: currently not in use, think about this if we want to have this external for embedding,
    # see also https://github.com/jovyan/pythreejs/issues/109
    # three_filename = 'three_v{version}.js'.format(version=__version_threejs__)
    # three_filepath = os.path.join(target, three_filename)
    # threejs = os.path.join(os.path.abspath(ipyvolume.__path__[0]), "static", "three.js")
    # shutil.copy(threejs, three_filepath)

    return pyv_filename#, three_filename


def save_requirejs(target="", version="2.3.4"):
    """ download and save the require javascript to a local file

    :type target: str
    :type version: str
    """
    url = "https://cdnjs.cloudflare.com/ajax/libs/require.js/{version}/require.min.js".format(version=version)
    filename = "require.min.v{0}.js".format(version)
    filepath = os.path.join(target, filename)
    download_to_file(url, filepath)
    return filename


def save_embed_js(target="", version=wembed.__html_manager_version__):
    """ download and save the ipywidgets embedding javascript to a local file

    :type target: str
    :type version: str

    """
    url = u'https://unpkg.com/@jupyter-widgets/html-manager@{0:s}/dist/embed-amd.js'.format(version)
    if version.startswith('^'):
        version = version[1:]
    filename = "embed-amd_v{0:s}.js".format(version)
    filepath = os.path.join(target, filename)

    download_to_file(url, filepath)
    return filename


# TODO this may be able to get directly taken from embed-amd.js in the future jupyter-widgets/ipywidgets#1650
def save_font_awesome(dirpath='', version="4.7.0"):
    """ download and save the font-awesome package to a local directory

    :type dirpath: str
    :type url: str

    """
    directory_name = "font-awesome-{0:s}".format(version)
    directory_path = os.path.join(dirpath, directory_name)
    if os.path.exists(directory_path):
        return directory_name
    url = "https://fontawesome.com/v{0:s}/assets/font-awesome-{0:s}.zip".format(version)
    content, encoding = download_to_bytes(url)

    try:
        zip_directory = io.BytesIO(content)
        unzip = zipfile.ZipFile(zip_directory)
        top_level_name = unzip.namelist()[0]
        unzip.extractall(dirpath)
    except Exception as err:
        raise IOError('Could not unzip content from: {0}\n{1}'.format(url, err))

    os.rename(os.path.join(dirpath, top_level_name), directory_path)

    return directory_name


def embed_html(filepath, widgets, makedirs=True, title=u'IPyVolume Widget', all_states=False,
               offline=False, scripts_path='js',
               drop_defaults=False, template=html_template,
               template_options=(("extra_script_head", ""), ("body_pre", ""), ("body_post", "")),
               devmode=False, offline_cors=False):
    """ Write a minimal HTML file with widget views embedded.

    :type filepath: str
    :param filepath: The file to write the HTML output to.
    :type widgets: widget or collection of widgets or None
    :param widgets:The widgets to include views for. If None, all DOMWidgets are included (not just the displayed ones).
    :param makedirs: whether to make directories in the filename path, if they do not already exist
    :param title: title for the html page
    :param all_states: if True, the state of all widgets know to the widget manager is included, else only those in widgets
    :param offline: if True, use local urls for required js/css packages and download all js/css required packages
    (if not already available), such that the html can be viewed with no internet connection
    :param scripts_path: the directory to save required js/css packages to (relative to the filepath)
    :type drop_defaults: bool
    :param drop_defaults: Whether to drop default values from the widget states
    :param template: template string for the html, must contain at least {title} and {snippet} place holders
    :param template_options: list or dict of additional template options
    :param devmode: if True, attempt to get index.js from local js/dist directory
    :param devmode: if True, attempt to get index.js from local js/dist folder
    :param offline_cors: if True, sets crossorigin attribute to anonymous, this allows for the return of error data
    from js scripts but can block local loading of the scripts in some browsers

    """
    dir_name_dst = os.path.dirname(os.path.abspath(filepath))
    if not os.path.exists(dir_name_dst) and makedirs:
        os.makedirs(dir_name_dst)

    template_opts = {"extra_script_head": "", "body_pre": "", "body_post": ""}
    template_opts.update(dict(template_options))

    if all_states:
        state = None
    else:
        state = wembed.dependency_state(widgets, drop_defaults=drop_defaults)

    if not offline:
        # we have to get the snippet (rather than just call embed_minimal_html), because if the new template includes
        # {} characters (such as in the bokeh example) then an error is raised when trying to format
        snippet = wembed.embed_snippet(widgets, state=state, requirejs=True, drop_defaults=drop_defaults)
        directory = os.path.dirname(filepath)
    else:

        if not os.path.isabs(scripts_path):
            scripts_path = os.path.join(os.path.dirname(filepath), scripts_path)
        # ensure script path is above filepath
        rel_script_path = os.path.relpath(scripts_path, os.path.dirname(filepath))
        if rel_script_path.startswith(".."):
            raise ValueError("The scripts_path must have the same root directory as the filepath")
        elif rel_script_path=='.':
            rel_script_path = ''
        else:
            rel_script_path += '/'

        fname_pyv = save_ipyvolumejs(scripts_path, devmode=devmode)
        fname_require = save_requirejs(os.path.join(scripts_path))
        fname_embed = save_embed_js(os.path.join(scripts_path))
        fname_fontawe = save_font_awesome(os.path.join(scripts_path))

        subsnippet = wembed.embed_snippet(widgets, embed_url=rel_script_path+fname_embed,
                                          requirejs=False, drop_defaults=drop_defaults, state=state)
        if not offline_cors:
            # TODO DIRTY hack, we need to do this cleaner upstream
            subsnippet = subsnippet.replace(' crossorigin="anonymous"', '')

        cors_attribute = 'crossorigin="anonymous"' if offline_cors else ' '
        snippet = """
<link href="{rel_script_path}{fname_fontawe}/css/font-awesome.min.css" rel="stylesheet">    
<script src="{rel_script_path}{fname_require}"{cors} data-main='./{rel_script_path}' ></script>
<script>
    require.config({{
      map: {{
        '*': {{
          'ipyvolume': '{fname_pyv}',
        }}
      }}}})
</script>
{subsnippet}
        """.format(rel_script_path=rel_script_path, fname_fontawe=fname_fontawe, fname_require=fname_require,
                   fname_pyv=os.path.splitext(fname_pyv)[0], 
                   subsnippet=subsnippet, cors=cors_attribute)

    template_opts['snippet'] = snippet
    template_opts['title'] = title
    html_code = template.format(**template_opts)

    with io.open(filepath, "w", encoding='utf8') as f:
        f.write(html_code)
