"""Generate images from ipyvolume using chrome headless

Assuming osx, define the following aliases for convenience, and start in headless mode::

     $ alias chrome="/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome"
     $ chrome --remote-debugging-port=9222 --headless

Make sure you have `PyChromeDevTools` installed::
    
    $ pip install PyChromeDevTools

Now run the following snippet (doesn't have to be from the Jupyter notebook) ::
    
    import ipyvolume as ipv
    ipv.examples.klein_bottle()
    ipv.view(10,30)
    ipv.savefig('headless.png', headless=True)


"""

import os
import subprocess

import PyChromeDevTools
from . import pylab

def _get_browser():
    options = []
    executable = os.environ.get('IPYVOLUME_HEADLESS_BROWSER')
    if executable:
        options.append(executable)
    options.append(r"/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary")
    options.append(r"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
    for path in options:
        if os.path.exists(path):
            return path
    raise ValueError("no browser found, try setting the IPYVOLUME_HEADLESS_BROWSER environmental variable")

def _screenshot_data(html_filename, timeout_seconds=10, output_widget=None, format="png", width=None, height=None, fig=None):
    # browser = _get_browser()
    # if fig is None:
    #     fig = gcf()
    # else:
    #     assert isinstance(fig, ipv.Figure)

    chrome = PyChromeDevTools.ChromeInterface()
    chrome.Network.enable()
    chrome.Page.enable()
    chrome.Page.navigate(url=html_filename)
    import time
    #time.sleep(2)
    # loadEventFired
    chrome.wait_event("Page.frameStoppedLoading", timeout=60)
    chrome.wait_event("Page.loadEventFired", timeout=60)
    time.sleep(0.5)
    result = chrome.Runtime.evaluate(expression='ipvss()')
    tries = 0
    while tries < 10:
        try:
            url = result['result']['result']['value']
            return url
        except:
            if 'ipvss' in result['result']['result']['description']:
                tries += 1
                time.sleep(0.5)
            else:
                print('error getting result, return value was:', result)
                raise

def _main():
    import numpy as np
    print(_get_browser())
    pylab.figure()
    pylab.scatter(*np.random.random((3,100)))
    pylab.savefig('test.png', headless=True)

if __name__ == "__main__":
    _main()