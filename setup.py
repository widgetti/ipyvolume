from __future__ import print_function

from setuptools import setup, find_packages, Command

from jupyter_packaging import (
    create_cmdclass,
    install_npm,
    ensure_targets,
    combine_commands,
    get_version,
)

import os
from os.path import join as pjoin
from pathlib import Path
from distutils import log

here = os.path.dirname(os.path.abspath(__file__))

def skip_if_exists(paths, CommandClass):
    """Skip a command if list of paths exists."""
    def should_skip():
        return any(not Path(path).exist() for path in paths)
    class SkipIfExistCommand(Command):
        def initialize_options(self):
            if not should_skip:
                self.command = CommandClass(self.distribution)
                self.command.initialize_options()
            else:
                self.command = None

        def finalize_options(self):
            if self.command is not None:
                self.command.finalize_options()

        def run(self):
            if self.command is not None:
                self.command.run()

    return SkipIfExistCommand

# jupyter lab install will fail it we print out info
# log.set_verbosity(log.DEBUG)
# log.info('setup.py entered')
# log.info('$PATH=%s' % os.environ['PATH'])


def read(fname):
    return open(os.path.join(os.path.dirname(__file__), fname)).read()

name = 'ipyvolume'
LONG_DESCRIPTION = read("README.rst")
version = get_version(pjoin(name, '_version.py'))
js_dir = pjoin(here, 'js')
jstargets = [
    pjoin(js_dir, 'lib', 'index.js'),
    pjoin('share', 'jupyter', 'nbextensions', 'ipyvolume', 'index.js'),
]
data_files_spec = [
    ('share/jupyter/nbextensions/ipyvolume', 'share/jupyter/nbextensions/ipyvolume', '*.js'),
    ('share/jupyter/labextensions/ipyvolume', 'share/jupyter/labextensions/ipyvolume', '*'),
    ('share/jupyter/labextensions/ipyvolume/static', 'share/jupyter/labextensions/ipyvolume/static', '*'),
    ('etc/jupyter/nbconfig/notebook.d', 'etc/jupyter/nbconfig/notebook.d', 'ipyvolume.json'),
]

js_command = combine_commands(
    install_npm(js_dir, build_cmd='build'), ensure_targets(jstargets),
)

cmdclass = create_cmdclass('jsdeps', data_files_spec=data_files_spec)
is_repo = os.path.exists(os.path.join(here, '.git'))
if is_repo:
    cmdclass['jsdeps'] = js_command
else:
    cmdclass['jsdeps'] = skip_if_exists(jstargets, js_command)

setup(
    name=name,
    version=version,
    description='IPython widget for rendering 3d volumes',
    long_description=LONG_DESCRIPTION,
    include_package_data=True,
    cmdclass=cmdclass,
    install_requires=[
        'ipywidgets>=7.0.0',
        'bqplot',
        'numpy',
        'traittypes',
        'traitlets',
        'Pillow',
        'ipywebrtc',
        'requests',
        'pythreejs>=2.0.0',
        'matplotlib'
    ],
    license='MIT',
    packages=find_packages(),
    zip_safe=False,
    author='Maarten A. Breddels',
    author_email='maartenbreddels@gmail.com',
    url='https://github.com/maartenbreddels/ipyvolume',
    keywords=['ipython', 'jupyter', 'widgets', 'volume rendering'],
    classifiers=[
        'Development Status :: 4 - Beta',
        'Framework :: IPython',
        'Intended Audience :: Developers',
        'Intended Audience :: Science/Research',
        'Topic :: Multimedia :: Graphics',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.6',
        'Programming Language :: Python :: 3.7',
        'Programming Language :: Python :: 3.8',
    ],
)