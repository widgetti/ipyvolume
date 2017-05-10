from traitlets import TraitType
import PIL.Image

class Image(TraitType):
    """A trait for PIL images."""

    default_value = None
    info_text = 'a PIL Image object'

    def validate(self, obj, value):
        if isinstance(value, PIL.Image.Image):
            return value
        self.error(obj, value)
