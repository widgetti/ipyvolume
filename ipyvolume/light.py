"""Pythreejs light object wrapper to make them more usable from notebooks"""

import pythreejs as py3
    
class AmbientLight(py3.AmbientLight):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    @property
    def position_x(self):
        return self.position[0]

    @position_x.setter
    def position_x(self, value):
        position = (value, self.position[1], self.position[2])
        self.position = position
    
    @property
    def position_y(self):
        return self.position[1]

    @position_y.setter
    def position_y(self, value):
        position = (self.position[0], value, self.position[2])
        self.position = position
    
    @property
    def position_z(self):
        return self.position[2]

    @position_z.setter
    def position_z(self, value):
        position = (self.position[0], self.position[1], value)
        self.position = position

    @property
    def light_color(self):
        return self.color
    
    @light_color.setter
    def light_color(self, value):
        self.color = value