from __future__ import absolute_import
_last_figure = None
import ipywidgets
from IPython.display import display
import IPython
import ipyvolume as ipv
import ipyvolume.embed
import os
import numpy as np
from . import utils
import time
from . import examples
import warnings
import PIL.Image
import traitlets
try:
    from io import BytesIO as StringIO
except:
    from cStringIO import StringIO
import base64


def _docsubst(f):
    """Perform docstring substitutions"""
    f.__doc__ = f.__doc__.format(**_doc_snippets)
    return f


_doc_snippets = {}
_doc_snippets[
    "color"] = "string format, examples for red:'red', '#f00', '#ff0000' or 'rgb(1,0,0), or rgb array of shape (N, 3)"
_doc_snippets[
    "color2d"] = "string format, examples for red:'red', '#f00', '#ff0000' or 'rgb(1,0,0), or rgb array of shape (2, N, 3)"
_doc_snippets[
    "size"] = "float representing the size of the glyph in percentage of the viewport, where 100 is the full size of the viewport"
_doc_snippets["marker"] = "name of the marker, options are: 'arrow', 'box', 'diamond', 'sphere'"
_doc_snippets["x"] = "1d numpy array with x positions"
_doc_snippets["u"] = "1d numpy array indicating the x direction"
_doc_snippets["x2d"] = "2d numpy array with x positions"


class current:
    figure = None
    container = None
    figures = {}
    containers = {}


def clear():
    """Remove current figure (and container)"""
    current.container = None
    current.figure = None


def figure(key=None, width=400, height=500, lighting=True, controls=True, controls_vr=False, debug=False, **kwargs):
    """Create a new figure (if no key is given) or return the figure associated with key

    :param key: Python object that identifies this figure
    :param width: pixel width of WebGL canvas
    :param height:  .. height ..
    :param lighting: use lighting or not
    :param controls: show controls or not
    :param controls_vr: show controls for VR or not
    :param debug: show debug buttons or not
    :return:
    """
    if key is not None and key in current.figures:
        current.figure = current.figures[key]
        current.container = current.containers[key]
    else:
        current.figure = ipv.Figure(volume_data=None, width=width, height=height, **kwargs)
        current.container = ipywidgets.VBox()
        current.container.children = [current.figure]
        if key is not None:
            current.figures[key] = current.figure
            current.containers[key] = current.container
        if controls:
            #stereo = ipywidgets.ToggleButton(value=current.figure.stereo, description='stereo', icon='eye')
            #l1 = ipywidgets.jslink((current.figure, 'stereo'), (stereo, 'value'))
            #current.container.children += (ipywidgets.HBox([stereo, ]),)
            pass # stereo and fullscreen are now include in the js code (per view)
        if controls_vr:
            eye_separation = ipywidgets.FloatSlider(value=current.figure.eye_separation, min=-10, max=10, icon='eye')
            ipywidgets.jslink((eye_separation, 'value'), (current.figure, 'eye_separation'))
            current.container.children += (eye_separation,)
        if debug:
            show = ipywidgets.ToggleButtons(options=["Volume", "Back", "Front"])
            current.container.children += (show,)
            #ipywidgets.jslink((current.figure, 'show'), (show, 'value'))
            traitlets.link((current.figure, 'show'), (show, 'value'))
    return current.figure


def gcf():
    """Get current figure, or create a new one"""
    if current.figure is None:
        return figure()
    else:
        return current.figure


def _grow_limit(limits, values):
    finites = np.isfinite(values)
    newvmin = np.min(values[finites])
    newvmax = np.max(values[finites])
    if limits is None:
        return newvmin, newvmax
    else:
        vmin, vmax = limits
        return min(newvmin, vmin), max(newvmax, vmax)


def _grow_limits(x, y, z):
    fig = gcf()
    xlim(*_grow_limit(fig.xlim, x))
    ylim(*_grow_limit(fig.ylim, y))
    zlim(*_grow_limit(fig.zlim, z))


def xlim(xmin, xmax):
    """Set limits of x axis"""
    fig = gcf()
    fig.xlim = [xmin, xmax]


def ylim(ymin, ymax):
    """Set limits of y axis"""
    fig = gcf()
    fig.ylim = [ymin, ymax]


def zlim(zmin, zmax):
    """Set limits of zaxis"""
    fig = gcf()
    fig.zlim = [zmin, zmax]


def xyzlim(vmin, vmax=None):
    """Set limits or all axis the same, if vmax not given, use [-vmin, vmax]"""
    if vmax is None:
        vmin, vmax = -vmin, vmin
    xlim(vmin, vmax)
    ylim(vmin, vmax)
    zlim(vmin, vmax)


def squarelim():
    fig = gcf()
    xmin, xmax = fig.xlim
    ymin, ymax = fig.ylim
    zmin, zmax = fig.zlim
    width = max([abs(xmax - xmin), abs(ymax - ymin), abs(zmax - zmin)])
    xc = (xmin + xmax) / 2
    yc = (ymin + ymax) / 2
    zc = (zmin + zmax) / 2
    xlim(xc - width / 2, xc + width / 2)
    ylim(yc - width / 2, yc + width / 2)
    zlim(zc - width / 2, zc + width / 2)


default_color = "red"
default_color_selected = "white"
default_size = 2
default_size_selected = default_size * 1.3


@_docsubst
def plot_trisurf(x, y, z, triangles=None, lines=None, color=default_color, u=None, v=None, texture=None):
    """Draws a polygon/triangle mesh defined by a coordinate and triangle indices

    Example:

    The following plots a rectangle in the z==2 plane, consisting of 2 triangles

    >>> plot_trisurf([0, 0, 3., 3.], [0, 4., 0, 4.], 2, triangles=[[0, 2, 3], [0, 3, 1]])

    Note that the z value is constant, and thus not a list/array. For guidance, the triangles
    refer to the vertices in this manner:

    ^ ydir
    |
    2 3
    0 1  ---> x dir

    Note that if you want per face/triangle colors, you need to duplicate each vertex.


    :param x: {x}
    :param y:
    :param z:
    :param triangles: ndarray with indices referring to the vertices, defining the triangles, with shape (M, 3)
    :param lines: ndarray with indices referring to the vertices, defining the lines, with shape (K, 2)
    :param color: {color}
    :return:
    """
    fig = gcf()
    if triangles is not None:
        triangles = np.array(triangles).astype(dtype=np.uint32)
    if lines is not None:
        lines = np.array(lines).astype(dtype=np.uint32)
    mesh = ipv.Mesh(x=x, y=y, z=z, triangles=triangles, lines=lines, color=color, u=u, v=v, texture=texture)
    _grow_limits(np.array(x).reshape(-1), np.array(y).reshape(-1), np.array(z).reshape(-1))
    fig.meshes = fig.meshes + [mesh]
    return mesh


@_docsubst
def plot_surface(x, y, z, color=default_color, wrapx=False, wrapy=False):
    """Draws a 2d surface in 3d, defines by the 2d ordered arrays x,y,z

    :param x: {x2d}
    :param y:
    :param z:
    :param color: {color2d}
    :param wrapx: when True, the x direction is assumed to wrap, and polygons are drawn between the end end begin points
    :param wrapy: simular for the y coordinate
    :return:
    """
    return plot_mesh(x, y, z, color=color, wrapx=wrapx, wrapy=wrapy, wireframe=False)


@_docsubst
def plot_wireframe(x, y, z, color=default_color, wrapx=False, wrapy=False):
    """Draws a 2d wireframe in 3d, defines by the 2d ordered arrays x,y,z

    :param x: {x2d}
    :param y:
    :param z:
    :param color: {color2d}
    :param wrapx: when True, the x direction is assumed to wrap, and polygons are drawn between the end end begin points
    :param wrapy: simular for the y coordinate
    :return:
    """
    return plot_mesh(x, y, z, color=color, wrapx=wrapx, wrapy=wrapy, wireframe=True, surface=False)


def plot_mesh(x, y, z, color=default_color, wireframe=True, surface=True, wrapx=False, wrapy=False, u=None, v=None,
              texture=None):
    fig = gcf()

    # assert len(x.shape) == 2
    # assert len(y.shape) == 2
    # assert len(z.shape) == 2
    # if isinstance(color, np.ndarray):
    # 	assert len(color.shape) == 3
    # 	assert color.shape[:2] == x.shape
    # 	color = color.reshape(-1)

    def dim(x):
        d = 0
        el = x
        while True:
            try:
                el = el[0]
                d += 1
            except:
                break
        return d

    if dim(x) == 2:
        nx, ny = shape = x.shape
    else:
        nx, ny = shape = x[0].shape

    def reshape(ar):
        if dim(ar) == 3:
            return [k.reshape(-1) for k in ar]
        else:
            return ar.reshape(-1)

    def reshape_color(ar):
        if dim(ar) == 4:
            return [k.reshape(-1, 3) for k in ar]
        else:
            return ar.reshape(-1, 3)

    if isinstance(color, np.ndarray):
        # if dim(color) == 4:
        #	color = color.reshape((color.shape[0], -1, color.shape[-1]))
        color = reshape_color(color)
        # print(color.shape)

    x = reshape(x)
    y = reshape(y)
    z = reshape(z)
    if u is not None:
        u = reshape(u)
    if v is not None:
        v = reshape(v)
    _grow_limits(np.array(x).reshape(-1), np.array(y).reshape(-1), np.array(z).reshape(-1))
    mx = nx if wrapx else nx - 1
    my = ny if wrapy else ny - 1
    triangles = np.zeros(((mx) * (my) * 2, 3), dtype=np.uint32)
    lines = np.zeros(((mx) * (my) * 4, 2), dtype=np.uint32)

    def index_from2d(i, j):
        xi = (i % nx)
        yi = (j % ny)
        return nx * xi + yi
        """
        ^ ydir
        |
        2 3
        0 1  ---> x dir
        """

    for i in range(mx):
        for j in range(my):
            p0 = index_from2d(i, j)
            p1 = index_from2d(i + 1, j)
            p2 = index_from2d(i, j + 1)
            p3 = index_from2d(i + 1, j + 1)
            triangle_index = (i * mx) + j
            triangles[triangle_index * 2 + 0, :] = [p0, p1, p3]
            triangles[triangle_index * 2 + 1, :] = [p0, p3, p2]
            lines[triangle_index * 4 + 0, :] = [p0, p1]
            lines[triangle_index * 4 + 1, :] = [p0, p2]
            lines[triangle_index * 4 + 2, :] = [p2, p3]
            lines[triangle_index * 4 + 3, :] = [p1, p3]
    # print(i, j, p0, p1, p2, p3)
    mesh = ipv.Mesh(x=x, y=y, z=z, triangles=triangles if surface else None, color=color,
                       lines=lines if wireframe else None,
                       u=u, v=v, texture=texture)
    fig.meshes = fig.meshes + [mesh]
    return mesh


@_docsubst
def scatter(x, y, z, color=default_color, size=default_size, size_selected=default_size_selected,
            color_selected=default_color_selected, marker="diamond", selection=None, **kwargs):
    """Create a scatter 3d plot with

    :param x: {x}
    :param y:
    :param z:
    :param color: {color}
    :param size: {size}
    :param size_selected: like size, but for selected glyphs
    :param color_selected:  like color, but for selected glyphs
    :param marker: {marker}
    :param selection: array with indices of x,y,z arrays of the selected markers, which can have a different size and color
    :param kwargs:
    :return:
    """
    fig = gcf()
    _grow_limits(x, y, z)
    scatter = ipv.Scatter(x=x, y=y, z=z, color=color, size=size, color_selected=color_selected,
                             size_selected=size_selected, geo=marker, selection=selection, **kwargs)
    fig.scatters = fig.scatters + [scatter]
    return scatter


def quiver(x, y, z, u, v, w, size=default_size * 10, size_selected=default_size_selected * 10, color=default_color,
           color_selected=default_color_selected, marker="arrow", **kwargs):
    """Create a quiver plot, which is like a scatter plot but with arrows pointing in the direction given by u, v and w

    :param x: {x}
    :param y:
    :param z:
    :param u: {u}
    :param v:
    :param w:
    :param size: {size}
    :param size_selected: like size, but for selected glyphs
    :param color: {color}
    :param color_selected: like color, but for selected glyphs
    :param marker: (currently only 'arrow' would make sense)
    :param kwargs:
    :return:
    """
    fig = gcf()
    _grow_limits(x, y, z)
    scatter = ipv.Scatter(x=x, y=y, z=z, vx=u, vy=v, vz=w,
                             color=color, size=size, color_selected=color_selected, size_selected=size_selected,
                             geo=marker, **kwargs)
    fig.scatters = fig.scatters + [scatter]
    return scatter


def show(extra_widgets=[]):
    """Display (like in IPython.display.dispay(...) the current figure"""
    gcf()  # make sure we have something..
    display(gcc())
    for widget in extra_widgets:
        display(widget)


def animate_glyphs(*args, **kwargs):
    """Deprecated: please use animation_control"""
    warnings.warn("Please use animation_control(...)", DeprecationWarning, stacklevel=2)
    animation_control(*args, **kwargs)


def animation_control(object, sequence_length=None, add=True, interval=200):
    """Animate scatter, quiver or mesh by adding a slider and play button.

    :param object: scatter, quiver, or mesh object (having an sequence_index property), or a list of objects
    :param sequence_length: If sequence_length is None we try try our best to figure out, in case we do it badly, you can tell us what it should be
    :param add: if True, add the widgets to the container, else return a HBox with the slider and play button
    :param interval: interval in msec between each frame
    :return:
    """
    if isinstance(object, (list, tuple)):
        objects = object
    else:
        objects = [object]
    del object
    if sequence_length is None:
        # get all non-None arrays
        sequence_lengths = []
        for object in objects:
            values = [getattr(object, name) for name in "x y z vx vy vz".split() if hasattr(object, name)]
            values = [k for k in values if k is not None]
            # sort them such that the higest dim is first
            values.sort(key=lambda key: -len(key.shape))
            sequence_length = values[0].shape[0]  # assume this defines the sequence length
            sequence_lengths.append(sequence_length)
        sequence_length = max(sequence_lengths)
    fig = gcf()
    fig.animation = interval
    fig.animation_exponent = 1.
    play = ipywidgets.Play(min=0, max=sequence_length - 1, interval=interval, value=0, step=1)
    slider = ipywidgets.FloatSlider(min=0, max=play.max, step=1)
    ipywidgets.jslink((play, 'value'), (slider, 'value'))
    for object in objects:
        ipywidgets.jslink((slider, 'value'), (object, 'sequence_index'))
    control = ipywidgets.HBox([play, slider])
    if add:
        current.container.children += (control,)
    else:
        return control


def gcc():
    """Return the current container, that is the widget holding the figure and all the control widgets, buttons etc."""
    gcf()  # make sure we have something..
    return current.container


def transfer_function(level=[0.1, 0.5, 0.9], opacity=[0.01, 0.05, 0.1], level_width=0.1, controls=True):
    """Create a transfer function, see volshow"""
    tf_kwargs = {}
    # level, opacity and widths can be scalars
    try:
        level[0]
    except:
        level = [level]
    try:
        opacity[0]
    except:
        opacity = [opacity] * 3
    try:
        level_width[0]
    except:
        level_width = [level_width] * 3
        # clip off lists
    min_length = min(len(level), len(level_width), len(opacity))
    level = list(level[:min_length])
    opacity = list(opacity[:min_length])
    level_width = list(level_width[:min_length])
    # append with zeros
    while len(level) < 3:
        level.append(0)
    while len(opacity) < 3:
        opacity.append(0)
    while len(level_width) < 3:
        level_width.append(0)
    for i in range(1, 4):
        tf_kwargs["level" + str(i)] = level[i - 1]
        tf_kwargs["opacity" + str(i)] = opacity[i - 1]
        tf_kwargs["width" + str(i)] = level_width[i - 1]
    tf = ipv.TransferFunctionWidgetJs3(**tf_kwargs)
    fig = gcf()
    if controls:
        current.container.children = (tf.control(),) + current.container.children
    return tf

def plot_isosurface(data, level=None, color=default_color, wireframe=True, surface=True, controls=True):
    from skimage import measure
    if level is None:
        level = np.median(data)
    verts, triangles = measure.marching_cubes(data, level)#, spacing=(0.1, 0.1, 0.1))
    x, y, z = verts.T
    mesh = plot_trisurf(x, y, z, triangles=triangles, color=color)
    if controls:
        vmin, vmax = np.percentile(data, 1),  np.percentile(data, 99)
        level_slider = ipywidgets.FloatSlider(value=level, min=vmin, max=vmax, icon='eye')
        recompute_button = ipywidgets.Button(description='update')
        controls = ipywidgets.HBox(children=[level_slider, recompute_button])
        current.container.children += (controls,)
        def recompute(*_ignore):
            level = level_slider.value
            recompute_button.description = "updating..."
            verts, triangles = measure.marching_cubes(data, level)  # , spacing=(0.1, 0.1, 0.1))
            x, y, z = verts.T
            with mesh.hold_sync():
                mesh.x = x
                mesh.y = y
                mesh.z = z
                mesh.triangles = triangles.astype(dtype=np.uint32)
                recompute_button.description = "update"

        recompute_button.on_click(recompute)
    return mesh


def volshow(data, lighting=False, data_min=None, data_max=None, tf=None, stereo=False,
            ambient_coefficient=0.5, diffuse_coefficient=0.8,
            specular_coefficient=0.5, specular_exponent=5,
            downscale=1,
            level=[0.1, 0.5, 0.9], opacity=[0.01, 0.05, 0.1], level_width=0.1,
            controls=True):
    """Visualize a 3d array using volume rendering.

    Currently only 1 volume can be rendered.


    :param data: 3d numpy array
    :param lighting: boolean, to use lighting or not, if set to false, lighting parameters will be overriden
    :param data_min: minimum value to consider for data, if None, computed using np.nanmin
    :param data_max: maximum value to consider for data, if None, computed using np.nanmax
    :param tf: transfer function (or a default one)
    :param stereo: stereo view for virtual reality (cardboard and similar VR head mount)
    :param ambient_coefficient: lighting parameter
    :param diffuse_coefficient: lighting parameter
    :param specular_coefficient: lighting parameter
    :param specular_exponent: lighting parameter
    :param downscale: downscale the rendering for better performance, for instance when set to 2, a 512x512 canvas will show a 256x256 rendering upscaled, but it will render twice as fast.
    :param level: level(s) for the where the opacity in the volume peaks, maximum sequence of length 3
    :param opacity: opacity(ies) for each level, scalar or sequence of max length 3
    :param level_width: width of the (gaussian) bumps where the opacity peaks, scalar or sequence of max length 3
    :param controls: add controls for lighting and transfer function or not
    :return:
    """
    vol = gcf()
    if tf is None:
        tf = vol.tf or transfer_function(level, opacity, level_width, controls=controls)
    if data_min is None:
        data_min = np.nanmin(data)
    if data_max is None:
        data_max = np.nanmax(data)
    vol.tf = tf
    vol.data_min = data_min
    vol.data_max = data_max
    vol.volume_data = data
    vol.stereo = stereo
    vol.ambient_coefficient = ambient_coefficient
    vol.diffuse_coefficient = diffuse_coefficient
    vol.specular_coefficient = specular_coefficient
    vol.specular_exponent = specular_exponent

    if controls:
        ambient_coefficient = ipywidgets.FloatSlider(min=0, max=1, step=0.001, value=vol.ambient_coefficient,
                                                     description="ambient")
        diffuse_coefficient = ipywidgets.FloatSlider(min=0, max=1, step=0.001, value=vol.diffuse_coefficient,
                                                     description="diffuse")
        specular_coefficient = ipywidgets.FloatSlider(min=0, max=1, step=0.001, value=vol.specular_coefficient,
                                                      description="specular")
        specular_exponent = ipywidgets.FloatSlider(min=0, max=10, step=0.001, value=vol.specular_exponent,
                                                   description="specular exp")
        # angle2 = ipywidgets.FloatSlider(min=0, max=np.pi*2, value=v.angle2, description="angle2")
        ipywidgets.jslink((vol, 'ambient_coefficient'), (ambient_coefficient, 'value'))
        ipywidgets.jslink((vol, 'diffuse_coefficient'), (diffuse_coefficient, 'value'))
        ipywidgets.jslink((vol, 'specular_coefficient'), (specular_coefficient, 'value'))
        ipywidgets.jslink((vol, 'specular_exponent'), (specular_exponent, 'value'))
        widgets_bottom = [ipywidgets.HBox([ambient_coefficient, diffuse_coefficient]),
                          ipywidgets.HBox([specular_coefficient, specular_exponent])]
        current.container.children += tuple(widgets_bottom, )

    return vol


def save(filename, copy_js=True, makedirs=True, **kwargs):
    """Save the figure/visualization as html file, and optionally copy the .js file to the same directory """
    ipyvolume.embed.embed_html(filename, current.container,
                       makedirs=makedirs, copy_js=copy_js, **kwargs)

def _change_y_angle(fig, frame, fraction):
    fig.angley = fraction * np.pi * 2


def movie(f="movie.mp4", function=_change_y_angle, fps=30, frames=30, endpoint=False, \
          cmd_template_ffmpeg="ffmpeg -y -r {fps} -i {tempdir}/frame-%5d.png -vcodec h264 -pix_fmt yuv420p {filename}",
          cmd_template_gif="convert -delay {delay} {loop} {tempdir}/frame-*.png {filename}",
          gif_loop=0):
    """Create a movie (mp4/gif) out of many frames

    Example:
    def set_angles(fig, i, fraction):
        fig.angley = fraction*np.pi*2
    # 4 second movie, that rotates around the y axis
    p3.movie('test2.gif', set_angles, fps=20, frames=20*4, endpoint=False)

    :param f: filename out output movie (e.g. 'movie.mp4' or 'movie.gif')
    :param function: function called before each frame with arguments (figure, framenr, fraction)
    :param fps: frames per seconds
    :param frames: total number of frames
    :param endpoint: if fraction goes from [0, 1] (inclusive) or [0, 1) (endpoint=False is useful for loops/rotatations)
    :param cmd_template_ffmpeg: template command when running ffmpeg (non-gif ending filenames)
    :param cmd_template_gif: template command when running imagemagick's convert (if filename ends in .gif)
    :param gif_loop: None for no loop, otherwise the framenumber to go after the end
    :return: the temp dir where the frames are stored
    """
    movie_filename = f
    import tempfile
    tempdir = tempfile.mkdtemp()
    output = ipywidgets.Output()
    display(output)
    fig = gcf()
    for i in range(frames):
        with output:
            fraction = i / (frames - 1. if endpoint else frames)
            function(fig, i, fraction)
            frame_filename = os.path.join(tempdir, "frame-%05d.png" % i)
            savefig(frame_filename, output_widget=output)
    with output:
        if movie_filename.endswith(".gif"):
            if gif_loop is None:
                loop = ""
            else:
                loop = "-loop %d" % gif_loop
            delay = 100 / fps
            cmd = cmd_template_gif.format(delay=delay, loop=loop, tempdir=tempdir, filename=movie_filename)
        else:
            cmd = cmd_template_ffmpeg.format(fps=fps, tempdir=tempdir, filename=movie_filename)
        print(cmd)
        os.system(cmd)
    return tempdir


def _screenshot_data(timeout_seconds=10, output_widget=None, format="png", width=None, height=None, fig=None):
    if fig is None:
        fig = gcf()
    else:
        assert isinstance(fig, ipv.Figure)
    if output_widget is None:
        output_widget = ipywidgets.Output()
        display(output_widget)
    # use lists to avoid globals
    done = [False]
    data = [None]

    def screenshot_handler(image_data):
        with output_widget:
            # print("data")
            # print(data)
            done[0] = True
            data[0] = image_data

    fig.on_screenshot(screenshot_handler)
    try:
        fig.screenshot(width=width, height=height,mime_type="image/"+format)
        t0 = time.time()
        timeout = False
        ipython = IPython.get_ipython()
        while (not done[0]) and not timeout:
            ipython.kernel.do_one_iteration()
            with output_widget:
                time.sleep(0.05)
                timeout = (time.time() - t0) > timeout_seconds
        with output_widget:
            if timeout and not done[0]:
                raise ValueError("timed out, no image data returned")
    finally:
        with output_widget:
            fig.on_screenshot(screenshot_handler, remove=True)
    data = data[0]
    data = data[data.find(",") + 1:]
    return base64.b64decode(data)

def screenshot(width=None, height=None, format="png", fig=None, timeout_seconds=10, output_widget=None):
    """ Save the figure to a PIL.Image object
    
    :type width: int
    :param width: the width of the image in pixels
    :type height: int
    :param height: the height of the image in pixels
    :type format: str
    :param format: format of output data (png, jpeg or svg)
    :type fig: ipyvolume.widgets.Figure or None
    :param fig: if None use the current figure
    :type timeout_seconds: int
    :param timeout_seconds: maximum time to wait for image data to return
    :type output_widget: ipywidgets.Output
    :param output_widget: a widget to use as a context manager for capturing the data  
    :return:

    """
    assert format in ['png','jpeg','svg'], "image format must be png, jpeg or svg"
    data = _screenshot_data(timeout_seconds=timeout_seconds, output_widget=output_widget, 
    format=format, width=width, height=height, fig=fig)
    f = StringIO(data)
    return PIL.Image.open(f)

def savefig(filename, width=None, height=None, fig=None, timeout_seconds=10, output_widget=None):
    """ Save the figure to an image file
    
    :type filename: str
    :param filename: must have extension .png, .jpeg or .svg
    :type width: int
    :param width: the width of the image in pixels
    :type height: int
    :param height: the height of the image in pixels
    :type fig: ipyvolume.widgets.Figure or None
    :param fig: if None use the current figure    
    :type timeout_seconds: int
    :param timeout_seconds: maximum time to wait for image data to return
    :type output_widget: ipywidgets.Output
    :param output_widget: a widget to use as a context manager for capturing the data  
    :return:

    """
    __, ext = os.path.splitext(filename)
    format = ext[1:]
    assert format in ['png','jpeg','svg'], "image format must be png, jpeg or svg"
    with open(filename, "wb") as f:
        f.write(_screenshot_data(timeout_seconds=timeout_seconds, output_widget=output_widget, 
        format=format, width=width, height=height, fig=fig))


def xlabel(label):
    """Set the labels for the x-axis"""
    fig = gcf()
    fig.xlabel = label


def ylabel(label):
    """Set the labels for the y-axis"""
    fig = gcf()
    fig.ylabel = label


def zlabel(label):
    """Set the labels for the z-axis"""
    fig = gcf()
    fig.zlabel = label


def xyzlabel(labelx, labely, labelz):
    """Set all labels at once"""
    xlabel(labelx)
    ylabel(labely)
    zlabel(labelz)

def view(azimuth, elevation):
    """Sets camera angles

    :param azimuth: rotation around the axis pointing up in degrees
    :param elevation: rotation where +90 means 'up', -90 means 'down', in degrees
    :return:
    """
    fig = gcf()
    fig.anglex = np.radians(elevation)
    fig.angley = np.radians(azimuth)



# mimic matplotlib namesace
class style:
    """'Static class that mimics a matplotlib module.

    Example:
    >>> import ipyvolume.pylab as p3
    >>> p3.style.use('light'])
    >>> p3.style.use('seaborn-darkgrid'])
    >>> p3.style.use(['seaborn-darkgrid', {'axes.x.color':'orange'}])

    Possible style values:
     * figure.facecolor: background color
     * axes.color: color of the box around the volume/viewport
     * xaxis.color: color of xaxis
     * yaxis.color: color of xaxis
     * zaxis.color: color of xaxis

    """

    @staticmethod
    def use(style):
        """Set the style of the current figure/visualization

        :param style: matplotlib style name, or dict with values, or a sequence of these, where the last value overrides previous
        :return:
        """
        import six
        def valid(value):  # checks if json'able
            return isinstance(value, six.string_types)

        def translate(mplstyle):
            style = {}
            mapping = [
                ['figure.facecolor', 'background-color'],
                ['xtick.color', 'axes.x.color'],  # TODO: is this the right thing?
                ['xtick.color', 'axes.z.color'],  # map x to z as well
                ['ytick.color', 'axes.y.color'],
                ['axes.labelcolor', 'axes.label.color'],
                ['text.color', 'color'],
                ['axes.edgecolor', 'axes.color']
            ]
            for from_name, to_name in mapping:
                if from_name in mplstyle:
                    value = mplstyle[from_name]
                    if "color" in from_name:
                        try:  # threejs doesn't like a color like '.13', so try to convert to proper format
                            value = float(value) * 255
                            value = "rgb(%d, %d, %d)" % (value, value, value)
                        except:
                            pass

                    utils.nested_setitem(style, to_name, value)
            return style

        if isinstance(style, six.string_types):
            styles = [style]
        else:
            styles = style
        totalstyle = utils.dict_deep_update({}, ipyvolume.styles._defaults)
        for style in styles:
            if isinstance(style, six.string_types):
                if hasattr(ipyvolume.styles, style):
                    style = getattr(ipyvolume.styles, style)
                else:
                    # lets see if we can copy matplotlib's style
                    # we assume now it's a matplotlib style, get all properties that we understand
                    import matplotlib.style
                    cleaned_style = {key: value for key, value in dict(matplotlib.style.library[style]).items() if
                                     valid(value)}
                    style = translate(cleaned_style)
                    # totalstyle.update(cleaned_style)
            else:
                # otherwise assume it's a dict
                pass
            totalstyle = utils.dict_deep_update(totalstyle, style)

        fig = gcf()
        fig.style = totalstyle

def plot_square(where="back", texture=None, flip=False, color=None):
    fig = gcf()
    xmin, xmax = fig.xlim
    ymin, ymax = fig.ylim
    zmin, zmax = fig.ylim
    if where == "back":
        x = [xmin, xmax, xmax, xmin]
        y = [ymin, ymin, ymax, ymax]
        z = [zmin, zmin, zmin, zmin]
    if where == "front":
        x = [xmin, xmax, xmax, xmin][::-1]
        y = [ymin, ymin, ymax, ymax]
        z = [zmax, zmax, zmax, zmax]
    if where == "left":
        x = [xmin, xmin, xmin, zmin]
        y = [ymin, ymin, ymax, ymax]
        z = [zmin, zmax, zmax, zmin]
    if where == "right":
        x = [xmax, xmax, xmax, zmax]
        y = [ymin, ymin, ymax, ymax]
        z = [zmin, zmax, zmax, zmin][::-1]
    triangles = [(0, 1, 2), (0, 2, 3)]
    u = v = None
    if texture is not None:
        u = [0., 1., 1., 0.]
        v = [0., 0., 1., 1.]
    mesh = plot_trisurf(x, y, z, triangles, texture=texture, u=u, v=v)
    return mesh
def selector_lasso(output_widget=None):
    fig = gcf()
    if output_widget is None:
        output_widget = ipywidgets.Output()
        display(output_widget)
    def lasso(data, other=None, fig=fig):
        with output_widget:
            if data['device']:
                import shapely.geometry
                region = shapely.geometry.Polygon(data['device'])
                for scatter in fig.scatters:
                    xyz_projected = fig.project(scatter.x, scatter.y, scatter.z)
                    points = xyz_projected.T[:,:2]
                    selected = []
                    for i, p in enumerate(points):
                        #print(i, p)
                        if region.contains(shapely.geometry.Point(p)):
                            selected.append(i)
                    if selected:
                        scatter.selected = selected
    fig.on_lasso(lasso)
