widgets = require("@jupyter-widgets/base")
_ = require("underscore")


var MediaStreamModel = widgets.DOMWidgetModel.extend({
    defaults: _.extend({}, widgets.DOMWidgetModel.prototype.defaults, {
        _model_name: 'MediaStreamModel',
        _view_name: 'MediaStreamView',
        _model_module: 'media',
        _view_module: 'media',
    }),
    initialize: function() {
        // we don't have any stream
        this.stream = Promise.resolve(null)
    }
});

var MediaStreamView = widgets.DOMWidgetView.extend({

    initialize: function() {
        var el = document.createElement('video')
        window.last_media_view = this;
        this.setElement(el);
        MediaStreamView.__super__.initialize.apply(this, arguments);
    },

    render: function() {
        var that = this;
        that.model.stream.then(function(stream) {
            that.el.src = window.URL.createObjectURL(stream);
            that.el.play()
        })
    }

});

var CameraStreamModel = MediaStreamModel.extend({
    defaults: _.extend({}, MediaStreamModel.defaults, {
        _model_name: 'CameraStreamModel',
        audio: false,
        video: true
    }),
    initialize: function() {
        this.stream = navigator.mediaDevices.getUserMedia({audio: false, video: true});
    }
});

var VideoStreamModel = MediaStreamModel.extend({
    defaults: _.extend({}, MediaStreamModel.defaults, {
        _model_name: 'VideoStreamModel',
        //_view_name: 'VideoView',
        url: 'movie.mp4',
        //controls: true,
        play: true,
        loop: true
    }),
    initialize: function() {
        // Get the camera permissions
        window.last_video = this
        this.video = document.createElement('video')
        this.source = document.createElement('source')
        this.source.setAttribute('src', this.get('url'))
        this.video.appendChild(this.source)
        this.video
        if(!this.video.captureStream) {
            console.log('captureStream not supported for this browser')
        } else {
            this.stream = Promise.resolve(this.video.captureStream())
            this.update_play()
            this.update_loop()
        }
        this.on('change:play', this.update_play, this)
        this.on('change:loop', this.update_loop, this)
    },
    update_play: function() {
        if(this.get('play'))
            this.video.play()
        else
            this.video.pause()
        console.log('play/pause', this.get('play'))
    },
    update_loop: function() {
        this.video.loop = this.get('loop')
        console.log('loop', this.get('loop'))
    }
});

module.exports = {
    MediaStreamModel: MediaStreamModel,
    MediaStreamView: MediaStreamView,
    CameraStreamModel: CameraStreamModel,
    VideoStreamModel:VideoStreamModel,
}
