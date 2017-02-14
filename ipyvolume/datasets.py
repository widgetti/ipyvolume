import os
import numpy as np
import bz2
import gzip
import platform
data_dir = os.path.expanduser("~/.ipyvolume/datasets")
if not os.path.exists(data_dir):
	os.makedirs(data_dir)


osname = dict(darwin="osx", linux="linux", windows="windows")[platform.system().lower()]


class Dataset(object):
	def __init__(self, name, density=True):
		self.name = name
		self.density = density
		if density:
			self.url = "https://github.com/maartenbreddels/ipyvolume/raw/master/datasets/%s.npy.bz2" % name
			self.path = os.path.join(data_dir, name+".npy.bz2")
		else:
			self.url = "https://github.com/maartenbreddels/ipyvolume/raw/master/datasets/%s.csv.gz" % name
			self.path = os.path.join(data_dir, name+".csv.gz")

	def download(self, force=False):
		if not os.path.exists(self.path) or force:
			print("Downloading %s to %s" % (self.url, self.path))
			code = os.system(self.download_command())

	def fetch(self):
		self.download()
		if os.path.exists(self.path):
			if self.density:
				f = bz2.BZ2File(self.path)
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

	def download_command(self):
		if os == "osx":
			return "cd %s; curl -O -L %s" % (data_dir, self.url)
		else:
			return "wget --progress=bar:force -c -P %s %s" % (data_dir, self.url)


hdz2000    = Dataset("hdz2000")
aquariusA2 = Dataset("aquarius-A2")
egpbosLCDM  = Dataset("egpbos-LCDM")
zeldovich  = Dataset("zeldovich", density=False)
