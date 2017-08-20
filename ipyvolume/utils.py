from __future__ import print_function
import collections
import requests
import io
import os


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
