export
class Transition {
    time_start: number;
    duration: any;
    cancelled: boolean;
    called_on_done: boolean;
    on_done: any;
    animation_exponent: number;
    on_animation: any;
    constructor(on_animation, on_done, duration, animation_exponent= 1) {
        this.on_done = on_done;
        this.on_animation = on_animation;
        this.animation_exponent = animation_exponent;
        this.duration = duration;
        // this.objects = []
        this.time_start = (new Date()).getTime();
        this.cancelled = false;
        this.called_on_done = false;
    }

    // set(obj) {
    //     this.objects.push(obj);
    // }

    is_done() {
        const dt = (new Date()).getTime() - this.time_start;
        return (dt >= this.duration) || this.cancelled;
    }

    cancel() {
            this.cancelled = true;
    }

    update() {
        if (this.cancelled) {
            return;
        }
        const dt = ((new Date()).getTime() - this.time_start) / this.duration;

        let u = Math.min(1, dt);
        u = Math.pow(u, this.animation_exponent);
        this.on_animation(u);
        if (dt >= 1 && !this.called_on_done) {
            this.called_on_done = true;
            this.on_done();
        }
    }
}
