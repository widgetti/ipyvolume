import ipyvolume.pylab as p3
import ipyvolume.examples
import ipyvolume.datasets
import numpy as np
import os
if not os.path.exists("tmp"):
    os.makedirs("tmp")

def test_figure():
    f1 = p3.figure()
    f2 = p3.figure(2)
    f3 = p3.figure()
    f4 = p3.figure(2)

    assert f1 != f2
    assert f2 != f3
    assert f3 != f4
    assert f2 == f2


def test_scatter():
    x, y, z = np.random.random((3, 100))
    p3.scatter(x, y, z)
    p3.save("tmp/ipyolume_scatter.html")

def test_quiver():
    x, y, z, u, v, w = np.random.random((6, 100))
    p3.quiver(x, y, z, u, v, w)
    p3.save("tmp/ipyolume_quiver.html")


def test_volshow():
    x, y, z = ipyvolume.examples.xyz()
    p3.volshow(x*y*z)
    p3.save("tmp/ipyolume_volume.html")


# just cover and call
ipyvolume.examples.ball()
ipyvolume.examples.example_ylm()

ipyvolume.datasets.aquariusA2.fetch()
ipyvolume.datasets.hdz2000.fetch()
ipyvolume.datasets.zeldovich.fetch()
