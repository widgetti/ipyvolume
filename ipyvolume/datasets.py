import os
import numpy as np
import bz2
import gzip
import platform
data_dir = os.path.expanduser("~/.ipyvolume/datasets")
if not os.path.exists(data_dir):
	os.makedirs(data_dir)

try:
    from urllib import urlretrieve # py2
except ImportError:
    from urllib.request import urlretrieve # py3


osname = dict(darwin="osx", linux="linux", windows="windows")[platform.system().lower()]



class UrlCached(object):
	def __init__(self, url):
		self.url = url
		self.path = os.path.join(data_dir, os.path.split(url)[1])

	def download(self, force=False):
		if not os.path.exists(self.path) or force:
			print("Downloading %s to %s" % (self.url, self.path))
			code = os.system(self.download_command_wget())
			if not os.path.exists(self.path):
				print("Download failed, exit code was: " +str(code) +" will try with curl")
				code = os.system(self.download_command_curl())
				if not os.path.exists(self.path):
					print("Download failed again, exit code was: " +str(code) +" using urlretrieve")
					self.download_urlretrieve()

	def fetch(self):
		self.download()
		if os.path.exists(self.path):
			return self.path
		else:
			raise Exception("file not found and/or download failed")

	def download_command_wget(self):
		return "wget --progress=bar:force -c -P %s %s" % (data_dir, self.url)

	def download_command_curl(self):
		return "cd %s; curl -O -L %s" % (data_dir, self.url)

	def download_urlretrieve(self):
		urlretrieve(self.url, self.path)


class Dataset(object):
	def __init__(self, name, density=True, numpy=False, raw=False, shape=None, dtype=None):
		self.name = name
		self.density = density
		self.numpy = numpy
		self.raw = raw
		self.shape = shape
		self.dtype = dtype
		if density:
			if raw:
				self.url = "https://github.com/maartenbreddels/ipyvolume/raw/master/datasets/%s.raw.bz2" % name
				self.path = os.path.join(data_dir, name+".raw.bz2")
			else:
				self.url = "https://github.com/maartenbreddels/ipyvolume/raw/master/datasets/%s.npy.bz2" % name
				self.path = os.path.join(data_dir, name+".npy.bz2")
		else:
			if numpy:
				self.url = "https://github.com/maartenbreddels/ipyvolume/raw/master/datasets/%s.npy.bz2" % name
				self.path = os.path.join(data_dir, name+".npy.bz2")
			else:
				self.url = "https://github.com/maartenbreddels/ipyvolume/raw/master/datasets/%s.csv.gz" % name
				self.path = os.path.join(data_dir, name+".csv.gz")

	def download(self, force=False):
		if not os.path.exists(self.path) or force:
			print("Downloading %s to %s" % (self.url, self.path))
			code = os.system(self.download_command_wget())
			if not os.path.exists(self.path):
				print("Download failed, exit code was: " +str(code) +" will try with curl")
				code = os.system(self.download_command_curl())
				if not os.path.exists(self.path):
					print("Download failed again, exit code was: " +str(code) +" using urlretrieve")
					self.download_urlretrieve()

	def fetch(self):
		self.download()
		if os.path.exists(self.path):
			if self.density:
				with bz2.BZ2File(self.path) as f:
					if self.raw:
						self.data = np.fromstring(f.read(), self.dtype).reshape(self.shape)
					else:
						self.data = np.load(f)
			else:
				if self.numpy:
					with bz2.BZ2File(self.path) as f:
						self.data = np.load(f)
				else:
					f = gzip.GzipFile(self.path)
					header = f.readline().decode("utf-8")[1:].strip()
					data = np.loadtxt(f, delimiter=",", unpack=False)
					for i, name in enumerate(header.split(",")):
						setattr(self, name, data[i])
		else:
			raise Exception("file not found and/or download failed")
		return self

	def download_command_wget(self):
		return "wget --progress=bar:force -c -P %s %s" % (data_dir, self.url)

	def download_command_curl(self):
		return "cd %s; curl -O -L %s" % (data_dir, self.url)

	def download_urlretrieve(self):
		urlretrieve(self.url, self.path)

hdz2000    = Dataset("hdz2000")
aquariusA2 = Dataset("aquarius-A2")
egpbosLCDM  = Dataset("egpbos-LCDM")
zeldovich  = Dataset("zeldovich", density=False)
animated_stream = Dataset("stream-animation", density=False, numpy=True)
head = Dataset('male', raw=True, shape=(256, 256, 128), dtype=np.uint8)

# low poly cat from: https://sketchfab.com/models/1e7143dfafd04ff4891efcb06949a0b4#
