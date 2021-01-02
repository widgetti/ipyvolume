r"""Generate images from ipyvolume using chrome headless.

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
import time

import numpy as np
import PyChromeDevTools

import ipyvolume as ipv


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


def _screenshot_data(
    html_filename, timeout_seconds=10, output_widget=None, format="png", width=None, height=None, fig=None, **headless_kwargs):
    # browser = _get_browser()
    # if fig is None:
    #     fig = gcf()
    # else:
    #     assert isinstance(fig, ipv.Figure)


    try:
        host = "localhost"
        port = 9222

        if headless_kwargs.get("host"):
            host = headless_kwargs.get("host")

        chrome = PyChromeDevTools.ChromeInterface(host=host, port=port)
        #chrome = PyChromeDevTools.ChromeInterface(host="localhost")
    except:
        print("Falied to connect to headless chrome, please make sure it's running on host={} and port={}".format(host, port))
        raise 

    chrome.Network.enable()
    chrome.Page.enable()
    chrome.Page.navigate(url=html_filename)
    chrome.wait_event("Page.frameStoppedLoading", timeout=60)
    chrome.wait_event("Page.loadEventFired", timeout=60)
    time.sleep(0.5)
    result = chrome.Runtime.evaluate(expression='ipvss()')
    tries = 0
    while tries < 10:
        #print(str(result))
        try:
            url = result[0]['result']['result']['value']
            return url
        except Exception as ex:
            #print(str(ex))
            #raise ex
            if 'ipvss' in result[0]['result']['result']['description']:
                tries += 1
                time.sleep(0.5)
            else:
                print('error getting result, return value was:', result)
                raise ex


def _main():
    print(_get_browser())
    ipv.figure()
    ipv.scatter(*np.random.random((3, 100)))
    ipv.savefig('test.png', headless=True)


if __name__ == "__main__":
    _main()
