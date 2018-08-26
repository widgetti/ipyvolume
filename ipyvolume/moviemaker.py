import json
import numpy as np
import os

import ipywidgets as widgets
import pythreejs
import ipywebrtc

class MovieMaker(object):
    def __init__(self, stream, camera, positions=None, quaternions=None, times=None,
                 filename_camera='moviemaker.json', filename_movie='movie.webm',
                 overwrite_video=False):
        self.stream = stream
        self.camera = camera
        self.recorder = ipywebrtc.VideoRecorder(stream=self.stream)
        self.filename_camera = filename_camera
        self.filename_movie = filename_movie
        self.overwrite_video = overwrite_video
        self.button_record = widgets.ToggleButton(description='Record', icon='circle', value=False)#, style={'font-color': 'red'})
        widgets.jslink((self.button_record, 'value'), (self.recorder, 'recording'))
        self.recorder.video.observe(lambda *x: self.write_movie(), 'value')
        self.button_add = widgets.Button(description='Add')
        self.button_add.on_click(lambda *x: self.add())
        self.button_replace = widgets.Button(description='Replace')
        self.button_replace.on_click(lambda *x: self.replace())
        self.button_remove = widgets.Button(description='Remove')
        self.button_remove.on_click(lambda *x: self.remove())
        self.button_save = widgets.Button(description='Save')
        self.button_save.on_click(lambda *x: self.save())
        self.button_load = widgets.Button(description='Load')
        self.button_load.on_click(lambda *x: self.load())
        self.select_keyframes = widgets.Select(description='Keyframes')
        self.positions = []
        self.quaternions = []
        self.times = []
        self.camera_action_box = widgets.HBox()
        self.output = widgets.Output()
        
        self.options_interpolation = [('discrete', 'InterpolateDiscrete'),
                                      ('linear','InterpolateLinear'),
                                      ('smooth','InterpolateSmooth')]
        self.select_interpolation = widgets.Dropdown(options=self.options_interpolation, index=1)
        
        
        self.select_interpolation.observe(lambda x: self.update_keyframes(), 'index')
        self.select_keyframes.observe(lambda x: self.sync_camera(), 'index')
        if positions is None and quaternions is None and times is None:
            if os.path.exists(self.filename_camera):
                self.load()
        else:
            self.positions = positions
            self.quaternions = quaternions
            self.times = times
            self.update_keyframes()

        box_io = widgets.HBox([self.button_save, self.button_load])
        box_control = widgets.HBox([self.button_add, self.button_replace, self.button_remove])
        self.widget_main = widgets.VBox([self.button_record, self.select_interpolation,box_io,
                              box_control, self.select_keyframes, self.camera_action_box,
                             self.output])

        
#         self.positon_track = pythreejs.VectorKeyframeTrack(name='.position', times=[0], values=[self.camera.position])
#         self.rotation_track = pythreejs.QuaternionKeyframeTrack(name='.quaternion', times=[0], values=[self.camera.quaternion])
        
    def sync_camera(self):
        with self.output:
            index = self.select_keyframes.index
            if index is not None:
                self.camera.position = self.positions[index]
                self.camera.quaternion = self.quaternions[index]
            
    def write_movie(self):
        with self.output:
            filename = self.filename_movie
            if not self.overwrite_video and os.path.exists(filename):
                name, ext = os.path.splitext(filename)
                i = 1
                filename = name + '_' + str(i) + ext
                while os.path.exists(filename):
                    i += 1
                    filename = name + '_' + str(i) + ext
            with open(filename, 'wb') as f:
                f.write(self.recorder.video.value)
            print('wrote', filename)

    def add(self):
        p = self.camera.position
        q = self.camera.quaternion
        index = self.select_keyframes.index
        if index is None:
            self.positions.append(p)
            self.quaternions.append(q)
            self.times.append(0)
            self.update_keyframes()
        else:
            self.positions.insert(index+1, p)
            self.quaternions.insert(index+1, q)
            self.times.insert(index+1, self.times[index]+5)
            self.update_keyframes()
            self.select_keyframes.index = index+1

    def replace(self):
        p = self.camera.position
        q = self.camera.quaternion
        index = self.select_keyframes.index
        if index is not None:
            self.positions[index] = p
            self.quaternions[index] = q
            self.update_keyframes()
        
    def remove(self):
        index = self.select_keyframes.index
        if index is not None:
            self.select_keyframes.index = None
            self.positions.pop(index)
            self.quaternions.pop(index)
            self.times.pop(index)
            self.update_keyframes()

    def save(self, filename=None):
        filename = filename or self.filename_camera
        with open(filename, 'w') as f:
            json.dump(dict(positions=self.positions, quaternions=self.quaternions,
                          times=self.times), f)
        print('wrote', filename)

    def load(self, filename=None):
        filename = filename or self.filename_camera
        with open(filename) as f:
            data = json.load(f)
            self.positions = data['positions']
            self.quaternions = data['quaternions']
            self.times = data['times']
        print('loaded', filename)
        self.update_keyframes()

    def format_keyframe(self, time, p, q):
        x, y, z = p
        r = np.sqrt(x**2 + y**2 + z**2)
        lon = np.arctan2(y, x) * 180/np.pi
        lat = (-np.arccos(z/r)+np.pi/2)*180/np.pi
        return "{:.1f}s-r={:.2f}, {:.0f}/{:.0f}".format(time, r, lon, lat)

    def update_keyframes(self):
        with self.output:
            fp = lambda x: "%f,%f,%f" % x
            fq = lambda x: "%f,%f,%f,%f" % x
            options = [(self.format_keyframe(t, p, q), i) for i, (t, p, q) in
                       enumerate(zip(self.times, self.positions, self.quaternions))]
            self.select_keyframes.options = options
            self.position_track = pythreejs.VectorKeyframeTrack(name='.position',
                                    times=self.times, values=self.positions,
                                    interpolation=self.select_interpolation.value)
            self.rotation_track = pythreejs.QuaternionKeyframeTrack(name='.quaternion',
                                    times=self.times, values=self.quaternions,
                                    interpolation=self.select_interpolation.value)

            if len(self.positions):
                self.camera_clip = pythreejs.AnimationClip(tracks=[self.position_track,self.rotation_track])
                self.mixer = pythreejs.AnimationMixer(self.camera)
                self.camera_action = pythreejs.AnimationAction(self.mixer, self.camera_clip, self.camera)
                self.camera_action_box.children = [self.camera_action]
            else:
                self.camera_action_box.children = []
    #         self.position_track.times = self.times
    #         self.position_track.values = self.positions
    #         self.rotation_track.times = self.times
    #         self.rotation_track.valeus = self.quaternions

        
        
    def show(self):
        box_io = widgets.HBox([self.button_save, self.button_load])
        box_control = widgets.HBox([self.button_add, self.button_replace, self.button_remove])
        display(widgets.VBox([self.button_record, self.select_interpolation,box_io,
                              box_control, self.select_keyframes, self.camera_action_box,
                             self.output]))
