import os
import io
import requests
import zipfile
import shutil
from ipywidgets import embed as wembed
import ipyvolume


# TODO this doesn't work now since iyvolume/static/index.js is for the notebook, js/dist/index.js for unpkg is required
def save_ipyvolumejs(dirname, makedirs=True):
    """ output the ipyvolume javascript to a local file
    
    :param dirname: folderpath to output js file to
    :param makedirs: whether to make the directories if they do not already exist
    
    """
    dir_name_dst = os.path.abspath(dirname)
    dir_name_src = os.path.join(os.path.abspath(ipyvolume.__path__[0]), "static")
    if not os.path.exists(dir_name_dst) and makedirs:
        os.makedirs(dir_name_dst)
    dst = os.path.join(dir_name_dst, "ipyvolume.js")
    src = os.path.join(dir_name_src, "index.js")
    shutil.copy(src, dst)


def save_requirejs(filepath='require.min.js', url="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.4/require.min.js"):
    """ download and save the require javascript to a local file

    :type filepath: str
    :type url: str
    """
    content = requests.get(url).content
    with open(filepath, 'w') as f:
        f.write(content.decode("utf8"))


def save_font_awesome(dirpath='font-awesome', url="http://fontawesome.io/assets/font-awesome-4.7.0.zip"):
    """ download and save the font-awesome package to a local folder

    :type dirpath: str
    :type url: str

    """
    parentdirname = os.path.dirname(dirpath)

    try:
        zip_folder = io.BytesIO(requests.get(url).content)
        unzip = zipfile.ZipFile(zip_folder)
        top_level_name = unzip.namelist()[0]
        unzip.extractall(parentdirname)
    except Exception as err:
        raise IOError('Could not save: {0}\n{1}'.format(url, err))

    os.rename(os.path.join(parentdirname, top_level_name), dirpath)


def save_embed_js(filepath="embed-amd.js", url=wembed.DEFAULT_EMBED_REQUIREJS_URL):
    """ download and save the ipywidgets embedding javascript to a local file

    :type filepath: str
    :type url: str
    """
    if not url.endswith('.js'):
        url += '.js'
    content = requests.get(wembed.DEFAULT_EMBED_REQUIREJS_URL).content
    with open(filepath, 'w') as f:
        f.write(content.decode("utf8"))


def embed_html(filepath, views, makedirs=True, title=u'IPyVolume Widget',
                       offline=False, offline_req=True, offline_folder='',
                       drop_defaults=False, template=None):
    """ Write a minimal HTML file with widget views embedded.

    :type filepath: str
    :param filepath: The file to write the HTML output to.
    :type views: widget or collection of widgets or None
    :param views:The widgets to include views for. If None, all DOMWidgets are included (not just the displayed ones).
    :param makedirs: whether to make directories in the filename path, if they do not already exist
    :param title: title for the html page
    :param offline: if True, use local urls for required js/css packages
    :param offline_req: if True and offline=True, download all js/css required packages,
    such that the html can be viewed with no internet connection
    :param offline_folder: the folder to save required js/css packages to (relative to the filepath)
    :type drop_defaults: bool
    :param drop_defaults: Whether to drop default values from the widget states
    :param template: template string for the html, must contain {title} and {snippet} place holders

    """
    dir_name_dst = os.path.dirname(os.path.abspath(filepath))
    if not os.path.exists(dir_name_dst) and makedirs:
        os.makedirs(dir_name_dst)

    if not offline:
        return wembed.embed_minimal_html(filepath, views, title=title,
                                         template=template, requirejs=True, drop_defaults=drop_defaults)

    if offline_req:
        scripts_path = os.path.join(dir_name_dst, offline_folder)
        if not os.path.exists(scripts_path):
            os.makedirs(scripts_path)
        # TODO embed-amd.js looks for ipyvolume.js in the local path of the html file, not it's own local path,
        # so this can't be in the scripts path
        save_ipyvolumejs(dir_name_dst)
        save_requirejs(os.path.join(scripts_path, "require.min.js"))
        save_embed_js(os.path.join(scripts_path, "embed-amd.js"))
        save_font_awesome(os.path.join(scripts_path, "font-awesome"))

    offline_folder = ''
    if offline_folder:
        offline_folder += '/'
    snippet = wembed.embed_snippet(views, embed_url=offline_folder+"embed-amd.js",
                                   requirejs=False, drop_defaults=drop_defaults)
    offline_snippet = """
    <link href="{offline_folder}font-awesome/css/font-awesome.min.css" rel="stylesheet">    
    <script src="{offline_folder}require.min.js" crossorigin="anonymous"></script>
    {snippet}
    """.format(offline_folder=offline_folder, snippet=snippet)

    values = {
        'title': title,
        'snippet': offline_snippet,
    }

    if template is None:
        template = wembed.html_template

    html_code = template.format(**values)

    with open(filepath, "w") as f:
        f.write(html_code)
