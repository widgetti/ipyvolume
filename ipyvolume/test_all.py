from __future__ import absolute_import
import ipyvolume
import ipyvolume.pylab as p3
import ipyvolume.examples
import ipyvolume.datasets
import ipyvolume.utils
import numpy as np
import os
import shutil
import json
import pytest


# helpful to remove previous test results for development
if os.path.exists("tmp"):
    shutil.rmtree("tmp")
os.makedirs("tmp")

def test_figure():
    f1 = p3.figure()
    f2 = p3.figure(2)
    f3 = p3.figure()
    f4 = p3.figure(2)
    f5 = p3.gcf()
    p3.clear()
    f6 = p3.gcf()

    assert f1 != f2
    assert f2 != f3
    assert f3 != f4
    assert f2 == f2
    assert f4 == f5
    assert f5 != f6

    for controls in [True, False]:
        for debug in [True, False]:
            p3.figure(debug=debug, controls=controls)

def test_limits():
    f = p3.figure()
    p3.xlim(-10, 11)
    assert f.xlim[0] == -10
    assert f.xlim[1] == 11

    p3.ylim(-12, 13)
    assert f.ylim[0] == -12
    assert f.ylim[1] == 13

    p3.zlim(-14, 15)
    assert f.zlim[0] == -14
    assert f.zlim[1] == 15

    p3.xyzlim(-17, 17)
    assert f.xlim[0] == -17
    assert f.xlim[1] == 17
    assert f.ylim[0] == -17
    assert f.ylim[1] == 17
    assert f.zlim[0] == -17
    assert f.zlim[1] == 17

def test_labels():
    f = p3.figure()
    p3.xlabel("x1")
    p3.ylabel("y1")
    p3.zlabel("z1")
    assert f.xlabel == "x1"
    assert f.ylabel == "y1"
    assert f.zlabel == "z1"
    p3.xyzlabel("x2", "y2", "z2")
    assert f.xlabel == "x2"
    assert f.ylabel == "y2"
    assert f.zlabel == "z2"


def test_scatter():
    x, y, z = np.random.random((3, 100))
    p3.scatter(x, y, z)
    p3.save("tmp/ipyolume_scatter.html")

def test_quiver():
    x, y, z, u, v, w = np.random.random((6, 100))
    p3.quiver(x, y, z, u, v, w)
    p3.save("tmp/ipyolume_quiver.html")


def test_volshow():
    x, y, z = ipyvolume.examples.xyz()
    p3.volshow(x*y*z)
    p3.volshow(x*y*z, level=1)
    p3.volshow(x*y*z, opacity=1)
    p3.volshow(x*y*z, level_width=1)
    p3.save("tmp/ipyolume_volume.html")


def test_bokeh():
    from bokeh.io import output_notebook, show
    from bokeh.plotting import figure
    import ipyvolume.bokeh

    x, y, z = np.random.random((3, 100))

    p3.figure()
    scatter = p3.scatter(x, y, z)

    tools = "wheel_zoom,box_zoom,box_select,lasso_select,help,reset,"
    p = figure(title="E Lz space", tools=tools, webgl=True, width=500, height=500)
    r = p.circle(x, y, color="navy", alpha=0.2)
    ipyvolume.bokeh.link_data_source_selection_to_widget(r.data_source, scatter, 'selected')

    from bokeh.resources import CDN
    from bokeh.embed import components

    script, div = components(p)
    template_options = dict(extra_script_head=script + CDN.render_js() + CDN.render_css(),
                            body_pre="<h2>Do selections in 2d (bokeh)<h2>" + div + "<h2>And see the selection in ipyvolume<h2>")
    ipyvolume.embed.embed_html("tmp/bokeh.html",
                               [p3.gcc(), ipyvolume.bokeh.wmh], all_states=True,
                               template_options=template_options)

def test_quick():
    x, y, z = ipyvolume.examples.xyz()
    p3.volshow(x*y*z)
    ipyvolume.quickvolshow(x*y*z, lighting=True)
    ipyvolume.quickvolshow(x*y*z, lighting=True, level=1, opacity=1, level_width=1)


    x, y, z, u, v, w = np.random.random((6, 100))
    ipyvolume.quickscatter(x, y, z)
    ipyvolume.quickquiver(x, y, z, u, v, w)

@pytest.mark.parametrize("performance", [0,1])
def test_widgets_state(performance):
    try:
        _remove_buffers = None
        try:
            from ipywidgets.widgets.widget import _remove_buffers
        except:
            pass
        ipyvolume.serialize.performance = performance
        x, y, z = np.random.random((3, 100))
        p3.figure()
        scatter = p3.scatter(x, y, z)
        state = scatter.get_state()
        if _remove_buffers:
            _remove_buffers(state)
        else:
            scatter._split_state_buffers(state)
    finally:
        ipyvolume.serialize.performance = 0

def test_download():
    url = "https://github.com/maartenbreddels/ipyvolume/raw/master/datasets/hdz2000.npy.bz2"
    ipyvolume.utils.download_to_file(url, "tmp/test_download.npy.bz2", chunk_size=None)
    assert os.path.exists("tmp/test_download.npy.bz2")
    ipyvolume.utils.download_to_file(url, "tmp/test_download2.npy.bz2", chunk_size=1000)
    assert os.path.exists("tmp/test_download2.npy.bz2")
    filesize = os.path.getsize("tmp/test_download.npy.bz2")
    content, encoding = ipyvolume.utils.download_to_bytes(url, chunk_size=None)
    assert len(content) == filesize
    content, encoding = ipyvolume.utils.download_to_bytes(url, chunk_size=1000)
    assert len(content) == filesize
    byte_list = list(ipyvolume.utils.download_yield_bytes(url, chunk_size=1000))
    # write the first chunk of the url to file then attempt to resume the download
    with open("tmp/test_download3.npy.bz2", 'wb') as f:
        f.write(byte_list[0])
    ipyvolume.utils.download_to_file(url, "tmp/test_download3.npy.bz2", resume=True)


def test_embed():
    p3.clear()
    x, y, z = np.random.random((3, 100))
    p3.scatter(x, y, z)
    p3.save("tmp/ipyolume_scatter_online.html", offline=False)
    assert os.path.getsize("tmp/ipyolume_scatter_online.html") > 0
    p3.save("tmp/ipyolume_scatter_offline.html", offline=True, scripts_path='js/subdir')
    assert os.path.getsize("tmp/ipyolume_scatter_offline.html") > 0


def test_threejs_version():
    # a quick check, as a reminder to change if threejs version is updated
    configpath = os.path.join(os.path.abspath(ipyvolume.__path__[0]), "..", "js", "package.json")
    with open(configpath) as f:
        config = json.load(f)
    major, minor = ipyvolume._version.__version_threejs__.split(".")
    major_js, minor_js, patch_js = config['dependencies']['three'][1:].split(".")
    version_msg = "version in python and js side for three js conflect: %s vs %s" % (
        ipyvolume._version.__version_threejs__, config['dependencies']['three'])
    assert (major == major_js) and (minor == minor_js), version_msg


# just cover and call
ipyvolume.examples.ball()
ipyvolume.examples.example_ylm()

ipyvolume.datasets.aquariusA2.fetch()
ipyvolume.datasets.hdz2000.fetch()
ipyvolume.datasets.zeldovich.fetch()
