from __future__ import print_function
import collections
import requests
import io
import os
import numpy as np
import functools
import collections
import time


# https://stackoverflow.com/questions/14267555/find-the-smallest-power-of-2-greater-than-n-in-python
def next_power_of_2(x):
    return 1 if x == 0 else 2**(x - 1).bit_length()

# original from http://stackoverflow.com/questions/3232943/update-value-of-a-nested-dictionary-of-varying-depth
def dict_deep_update(d, u):
    for k, v in u.items():
        if isinstance(v, collections.Mapping):
            r = dict_deep_update(d.get(k, {}), v)
            d[k] = r
        else:
            d[k] = u[k]
    return d

def nested_setitem(obj, dotted_name, value):
    items = dotted_name.split(".")
    for item in items[:-1]:
        if item not in obj:
            obj[item] = {}
        obj = obj[item]
    obj[items[-1]] = value


def download_to_bytes(url, chunk_size=1024*1024*10, loadbar_length=10):
    """ download a url to bytes

    if chunk_size is not None, prints a simple loading bar [=*loadbar_length] to show progress (in console and notebook)

    :param url: str or url
    :param chunk_size: None or int in bytes
    :param loadbar_length: int length of load bar
    :return: (bytes, encoding)
    """

    stream = False if chunk_size is None else True

    print("Downloading {0:s}: ".format(url), end="")

    response = requests.get(url, stream=stream)
    # raise error if download was unsuccessful
    response.raise_for_status()

    encoding = response.encoding
    total_length = response.headers.get('content-length')
    if total_length is not None:
        total_length = float(total_length)
        if stream:
            print("{0:.2f}Mb/{1:} ".format(total_length / (1024 * 1024), loadbar_length), end="")
        else:
            print("{0:.2f}Mb ".format(total_length / (1024 * 1024)), end="")

    if stream:
        print("[", end="")
        chunks = []
        loaded = 0
        loaded_size = 0
        for chunk in response.iter_content(chunk_size=chunk_size):
            if chunk:  # filter out keep-alive new chunks
                # print our progress bar
                if total_length is not None:
                    while loaded < loadbar_length * loaded_size / total_length:
                        print("=", end='')
                        loaded += 1
                    loaded_size += chunk_size
                chunks.append(chunk)
        if total_length is None:
            print("=" * loadbar_length, end='')
        else:
            while loaded < loadbar_length:
                print("=", end='')
                loaded += 1
        content = b"".join(chunks)
        print("] ", end="")
    else:
        content = response.content
    print("Finished")

    response.close()

    return content, encoding


def download_yield_bytes(url, chunk_size=1024*1024*10):
    """ yield a downloaded url as byte chunks

    :param url: str or url
    :param chunk_size: None or int in bytes
    :yield: byte chunks
    """

    response = requests.get(url, stream=True)
    # raise error if download was unsuccessful
    response.raise_for_status()

    total_length = response.headers.get('content-length')
    if total_length is not None:
        total_length = float(total_length)
        length_str = "{0:.2f}Mb ".format(total_length / (1024 * 1024))
    else:
        length_str = ""

    print("Yielding {0:s} {1:s}".format(url, length_str))
    for chunk in response.iter_content(chunk_size=chunk_size):
        yield chunk
    response.close()


def download_to_file(url, filepath, resume=False, overwrite=False, chunk_size=1024*1024*10, loadbar_length=10):
    """ download a url

    prints a simple loading bar [=*loadbar_length] to show progress (in console and notebook)

    :type url: str
    :type filepath: str
    :param filepath: path to download to
    :param resume: if True resume download from existing file chunk
    :param overwrite: if True remove any existing filepath
    :param chunk_size: None or int in bytes
    :param loadbar_length: int length of load bar
    :return:
    """

    resume_header = None
    loaded_size = 0
    write_mode = 'wb'

    if os.path.exists(filepath):
        if overwrite:
            os.remove(filepath)
        elif resume:
            # if we want to resume, first try and see if the file is already complete
            loaded_size = os.path.getsize(filepath)
            clength = requests.head(url).headers.get('content-length')
            if clength is not None:
                if int(clength) == loaded_size:
                    return None
            # give the point to resume at
            resume_header = {'Range': 'bytes=%s-' % loaded_size}
            write_mode = 'ab'
        else:
            return None

    stream = False if chunk_size is None else True

    # start printing with no return character, so that we can have everything on one line
    print("Downloading {0:s}: ".format(url), end="")

    response = requests.get(url, stream=stream, headers=resume_header)
    # raise error if download was unsuccessful
    response.raise_for_status()

    # get the size of the file if available
    total_length = response.headers.get('content-length')
    if total_length is not None:
        total_length = float(total_length) + loaded_size
        print("{0:.2f}Mb/{1:} ".format(total_length / (1024 * 1024), loadbar_length), end="")
    print("[", end="")

    parent = os.path.dirname(filepath)
    if not os.path.exists(parent) and parent:
        os.makedirs(parent)

    with io.open(filepath, write_mode) as f:
        loaded = 0
        for chunk in response.iter_content(chunk_size=chunk_size):
            if chunk:  # filter out keep-alive new chunks
                # print our progress bar
                if total_length is not None and chunk_size is not None:
                    while loaded < loadbar_length*loaded_size/total_length:
                        print("=", end='')
                        loaded += 1
                    loaded_size += chunk_size
                f.write(chunk)
        if total_length is None:
            print("=" * loadbar_length, end='')
        else:
            while loaded < loadbar_length:
                print("=", end='')
                loaded += 1
    print("] Finished")

def reduce_size(data, max_size, extent):
    new_extent = []
    for axis in range(3):
        shape = data.shape
        xmin, xmax = extent[2-axis]
        while shape[axis] > max_size:
            slices1 = [slice(None, None, None)] * 3
            slices1[axis] = slice(0, -1, 2)
            slices2 = [slice(None, None, None)] * 3
            slices2[axis] = slice(1, None, 2)
            #print(data.shape, data.__getitem__(slices1).shape, data.__getitem__(slices2).shape)
            data = (data[slices1] + data[slices2])/2
            if shape[axis] % 2:
                width = xmax - xmin
                xmax = xmin + width / shape[axis] * (shape[axis]-1)
            shape = data.shape
        new_extent.append((xmin, xmax))
    return data, new_extent[::-1]

def grid_slice(amin, amax, shape, bmin, bmax):
    '''Given a grid with shape, and begin and end coordinates amin, amax, what slice
    do we need to take such that it minimally covers bmin, bmax.
    amin, amax = 0, 1; shape = 4
    0  0.25  0.5  0.75  1
    |    |    |    |    |
    bmin, bmax = 0.5, 1.0 should give 2,4, 0.5, 1.0
    bmin, bmax = 0.4, 1.0 should give 1,4, 0.25, 1.0

    bmin, bmax = -1, 1.0 should give 0,4, 0, 1.0

    what about negative bmin and bmax ?
    It will just flip bmin and bmax
    bmin, bmax = 1.0, 0.5 should give 2,4, 0.5, 1.5

    amin, amax = 1, 0; shape = 4
    1  0.75  0.5  0.25  0
    |    |    |    |    |
    bmin, bmax = 0.5, 1.0 should give 0,2, 1.0, 0.5
    bmin, bmax = 0.4, 1.0 should give 0,3, 1.0, 0.25
    '''
    width = (amax - amin)
    bmin, bmax = min(bmin, bmax), max(bmin, bmax)
    # normalize the coordinates
    nmin = (bmin - amin) / width
    nmax = (bmax - amin) / width
    # grid indices
    if width < 0:
        imin = max(0, int(np.floor(nmax * shape)))
        imax = min(shape, int(np.ceil(nmin * shape)))
    else:
        imin = max(0, int(np.floor(nmin * shape)))
        imax = min(shape, int(np.ceil(nmax * shape)))
    # transform back to the coordinate system of x
    nmin = imin / shape
    nmax = imax / shape
#     if width < 0:
#         return imin, imax, amin + nmax * width, amin + nmin * width
#     else:
    return (imin, imax), (amin + nmin * width, amin + nmax * width)

def get_ioloop():
    import IPython
    import zmq
    ipython = IPython.get_ipython()
    if ipython and hasattr(ipython, 'kernel'):
        return zmq.eventloop.ioloop.IOLoop.instance()

def debounced(delay_seconds=0.5, method=False):
    def wrapped(f):
        counters = collections.defaultdict(int)

        @functools.wraps(f)
        def execute(*args, **kwargs):
            if method:  # if it is a method, we want to have a counter per instance
                key = args[0]
            else:
                key = None
            counters[key] += 1

            def debounced_execute(counter=counters[key]):
                if counter == counters[key]:  # only execute if the counter wasn't changed in the meantime
                    f(*args, **kwargs)
            ioloop = get_ioloop()

            def thread_safe():
                ioloop.add_timeout(time.time() + delay_seconds, debounced_execute)

            if ioloop is None:  # we live outside of IPython (e.g. unittest), so execute directly
                debounced_execute()
            else:
                ioloop.add_callback(thread_safe)
        return execute
    return wrapped
