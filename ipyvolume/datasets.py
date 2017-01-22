import os
import numpy as np
import bz2
data_dir = os.path.expanduser("~/.ipyvolume/datasets")
if not os.path.exists(data_dir):
	os.makedirs(data_dir)


class Dataset(object):
	def __init__(self, name):
		self.name = name
		self.url = "https://github.com/maartenbreddels/ipyvolume/raw/master/datasets/%s.npy.bz2" % name
		self.path = os.path.join(data_dir, name+".npy.bz2")

	def download(self, force=False):
		if not os.path.exists(self.path) or force:
			print("Downloading %s to %s" % (self.url, self.path))
			code = os.system(self.wget_command())

	def fetch(self):
		self.download()
		if os.path.exists(self.path):
			f = bz2.BZ2File(self.path)
			self.data = np.load(f)
		else:
			raise Exception("file not found and/or download failed")
		return self

	def wget_command(self):
		return "wget --progress=bar:force -c -P %s %s" % (data_dir, self.url)

hdz2000 = Dataset("hdz2000")
aquariusA2 =  Dataset("aquarius-A2")