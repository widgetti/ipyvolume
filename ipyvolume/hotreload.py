from pathlib import Path
import logging

logger = logging.getLogger('ipyvolume')

HERE = Path(__file__).parent
_figures = []
_watching = set()


def _update_shaders(path=None, file_changed=None):
    names = ['volr-fragment', 'volr-vertex', 'mesh-vertex', 'mesh-fragment', 'scatter-vertex', 'scatter-fragment', 'shadow-vertex', 'shadow-fragment']
    for figure in _figures:
        shaders = {}
        # TODO: only read the ones we change
        for name in names:
            shader_path = path / (name + ".glsl")
            with shader_path.open() as f:
                shaders[name] = f.read()
        figure._shaders = shaders


def watch(figure, path=None):
    _figures.append(figure)
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler

    if path is None:
        # this assues a editable install (pip install -e .)
        path = HERE / '../js/glsl/'

    class ShaderEventHandler(FileSystemEventHandler):
        def on_modified(self, event):
            super(ShaderEventHandler, self).on_modified(event)
            if not event.is_directory:
                logger.info(f'updating: {event.src_path}')
                _update_shaders(path, event.src_path)

    observer = Observer()
    if path not in _watching:
        logger.info(f'watching {path}')
        observer.schedule(ShaderEventHandler(), path, recursive=True)
        observer.start()
        _watching.add(path)
    _update_shaders(path)
