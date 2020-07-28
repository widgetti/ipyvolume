"""py3 light object wrapper to make them more usable from notebooks"""

import pythreejs as py3
    
class Light(py3.Light):
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

class AmbientLight(Light, py3.AmbientLight):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)


class HemiphereLight(Light, py3.HemisphereLight):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    @property
    def light_color2(self):
        return self.groundColor
    
    @light_color2.setter
    def light_color2(self, value):
        self.groundColor = value


class DirectionalLight(Light, py3.DirectionalLight):
    def __init__(self, container, target_pos, **kwargs):
        target = py3.Object3D(position=target_pos)
        
        super().__init__(target=target, **kwargs)
        self.container = container

        if self.castShadow:
            self._enable_shadows()

    def _enable_shadows(self):
        # Prepare shadow camera
        self.shadow = py3.DirectionalLightShadow() if type(self.shadow) is py3.Uninitialized else self.shadow
        self.shadow.camera = py3.OrthographicCamera() if type(self.shadow.camera) is py3.Uninitialized else self.shadow.camera

    @property
    def cast_shadow(self):
        return self.castShadow
    
    @cast_shadow.setter
    def cast_shadow(self, value):
        self.castShadow = value
        if self.castShadow:
            self._enable_shadows()

    @property
    def shadow_map_type(self):
        return self.container.shadow_map_type
    
    @shadow_map_type.setter
    def shadow_map_type(self, value):
        self.container.shadow_map_type = value

    @property
    def shadow_map_size(self):
        return self.shadow.mapSize.width

    @shadow_map_size.setter
    def shadow_map_size(self, value):
        self.shadow.mapSize = (value, value)

    @property
    def target_x(self):
        return self.target.position[0]

    @target_x.setter
    def target_x(self, value):
        position = (value, self.target.position[1], self.target.position[2])
        self.target.position = position

    @property
    def shadow_bias(self):
        return self.shadow.bias
    
    @shadow_bias.setter
    def shadow_bias(self, value):
        self.shadow.bias = value
    
    @property
    def shadow_camera_near(self):
        return self.shadow.camera.near

    @shadow_camera_near.setter
    def shadow_camera_near(self, value):
        self.shadow.camera.near = value

    @property
    def shadow_camera_far(self):
        return self.shadow.camera.far

    @shadow_camera_far.setter
    def shadow_camera_far(self, value):
        self.shadow.camera.far = value

    @property
    def shadow_camera_orthographic_size(self):
        return self.shadow.camera.right

    @shadow_camera_orthographic_size.setter
    def shadow_camera_orthographic_size(self, value):
        self.shadow.camera.left = -value/2
        self.shadow.camera.right = value/2
        self.shadow.camera.top =  value/2
        self.shadow.camera.bottom = -value/2

    @property
    def target_y(self):
        return self.target.position[1]

    @target_y.setter
    def target_y(self, value):
        position = (self.target.position[0], value, self.target.position[2])
        self.target.position = position

    @property
    def target_z(self):
        return self.target.position[2]
    
    @target_z.setter
    def target_z(self, value):
        position = (self.target.position[0], self.target.position[1], value)
        self.target.position = position


class SpotLight(Light, py3.SpotLight):
    def __init__(self, container, target, **kwargs):
        targetObj = py3.Object3D(position=target)
        
        super().__init__(target=targetObj, **kwargs)
        self.container = container

        if self.castShadow:
            self._enable_shadows()

    def _enable_shadows(self):
        # Prepare shadow camera
        self.shadow = py3.SpotLightShadow() if type(self.shadow) is py3.Uninitialized else self.shadow
        self.shadow.camera = py3.PerspectiveCamera() if type(self.shadow.camera) is py3.Uninitialized else self.shadow.camera

    @property
    def cast_shadow(self):
        return self.castShadow
    
    @cast_shadow.setter
    def cast_shadow(self, value):
        self.castShadow = value
        if self.castShadow:
            self._enable_shadows()

    @property
    def shadow_map_type(self):
        return self.container.shadow_map_type
    
    @shadow_map_type.setter
    def shadow_map_type(self, value):
        self.container.shadow_map_type = value

    @property
    def shadow_map_size(self):
        return self.shadow.mapSize.width

    @shadow_map_size.setter
    def shadow_map_size(self, value):
        self.shadow.mapSize = (value, value)

    @property
    def target_x(self):
        return self.target.position[0]

    @target_x.setter
    def target_x(self, value):
        position = (value, self.target.position[1], self.target.position[2])
        self.target.position = position

    @property
    def shadow_bias(self):
        return self.shadow.bias
    
    @shadow_bias.setter
    def shadow_bias(self, value):
        self.shadow.bias = value
    
    @property
    def shadow_camera_near(self):
        return self.shadow.camera.near

    @shadow_camera_near.setter
    def shadow_camera_near(self, value):
        self.shadow.camera.near = value

    @property
    def shadow_camera_far(self):
        return self.shadow.camera.far

    @shadow_camera_far.setter
    def shadow_camera_far(self, value):
        self.shadow.camera.far = value

    @property
    def shadow_camera_fov(self):
        return self.shadow.camera.fov

    @shadow_camera_fov.setter
    def shadow_camera_fov(self, value):
        self.shadow.camera.fov = value
    
    @property
    def shadow_camera_aspect(self):
        return self.shadow.camera.fov

    @shadow_camera_aspect.setter
    def shadow_camera_aspect(self, value):
        self.shadow.camera.aspect = value


class PointLight(Light, py3.PointLight):
    def __init__(self, container, target, **kwargs):
        targetObj = py3.Object3D(position=target)
        
        super().__init__(target=targetObj, **kwargs)
        self.container = container

        if self.castShadow:
            self._enable_shadows()

    def _enable_shadows(self):
        # Prepare shadow camera
        self.shadow = py3.LightShadow() if type(self.shadow) is py3.Uninitialized else self.shadow
        self.shadow.camera = py3.PerspectiveCamera() if type(self.shadow.camera) is py3.Uninitialized else self.shadow.camera

    @property
    def shadow_map_type(self):
        return self.container.shadow_map_type
    
    @shadow_map_type.setter
    def shadow_map_type(self, value):
        self.container.shadow_map_type = value

    @property
    def shadow_bias(self):
        return self.shadow.bias
    
    @shadow_bias.setter
    def shadow_bias(self, value):
        self.shadow.bias = value
    
    @property
    def shadow_camera_near(self):
        return self.shadow.camera.near

    @shadow_camera_near.setter
    def shadow_camera_near(self, value):
        self.shadow.camera.near = value

    @property
    def shadow_camera_far(self):
        return self.shadow.camera.far