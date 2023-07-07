<template>
    <div class="ipyvolume-tf-root">
        <v-select v-model="enabled" :items="items" label="Layers" multiple chips clearable>
        </v-select>
    </div>
</template>
<style id="ipyvolume-tf">
.ipyvolume-tf-root {
    display: flex;
}

.ipyvolume-container-controls {
    display: flex;
    flex-direction: column;
}
</style>

<script>
module.export = {
    data() {
        return {
            models: {
                tf: {
                }
            },
        }
    },
    computed: {
        items: {
            get: function () {
                if (!this.models.tf.colors) {
                    return [];
                }
                return this.models.tf.colors.map((k, index) => {
                    return { text: this.models.tf.labels[index], value: index }
                });
            }
        },
        enabled: {
            set: function (val) {
                const enabled = Array(this.models.tf.colors.length).fill(false);
                val.forEach((k) => {
                    enabled[k] = true;
                })
                console.log('enabled set', val, enabled);
                this.models.tf.enabled = enabled;
            },
            get: function () {
                const enabled = [];
                if (!this.models.tf.enabled) {
                    return enabled;
                }
                this.models.tf.enabled.forEach((k, index) => {
                    if (k) {
                        enabled.push(index);
                    }
                });
                console.log('enabled get', enabled);
                return enabled;
                // console.log('enabled get', this.models.tf.enabled)
                // return this.models.tf.enabled;
            }
        }
    },
    created() {
        console.log('create tf', this.$refs)
    },

    mounted() {
        const figureComponent = this.$refs.figure;
        (async () => {
            const tf = await this.viewCtx.getModelById(this.tf.substr(10));
            function bbproxy(model, attrs, widgetAttrs) {
                const proxy = {}

                attrs.forEach((attr) => {
                    console.log('tf setting', attr)
                    let valueCopy = model.get(attr);
                    model.on('change:' + attr, (_widget, value) => {
                        proxy[attr] = value
                    })
                    Object.defineProperty(proxy, attr, {
                        enumerable: true,
                        configurable: true,
                        get: () => {
                            console.log('tf getting', attr, valueCopy);
                            return valueCopy;
                        },
                        set: (value) => {
                            console.log('tf setting', attr, value);
                            valueCopy = value;
                            model.set(attr, value);
                            model.save_changes();
                        },
                    });
                })
                if (widgetAttrs) {
                    Object.keys(widgetAttrs).forEach((attr) => {
                        console.log('tf setting list', attr)
                        let listValue = model.get(attr);
                        let listValueProxy = [];
                        if (listValue) {
                            listValueProxy = listValue.map((k) => bbproxy(k, widgetAttrs[attr]));
                        }
                        proxy[attr] = listValueProxy;
                        model.on('change:' + attr, (_widget, value) => {
                            console.log('tf changed list', attr, value)
                            if (value) {
                                proxy[attr] = value.map((k) => bbproxy(k, widgetAttrs[attr]))
                            } else {
                                proxy[attr] = null;
                            }
                        });
                        Object.defineProperty(proxy, attr, {
                            enumerable: true,
                            configurable: true,
                            get: () => {
                                return listValueProxy;
                            },
                            set: (value) => {
                                listValueProxy = value;
                                console.log('ignore propagating set')
                            },
                        });
                    })
                }

                return proxy;
            }
            this.$set(this.models, 'tf', bbproxy(tf, ['colors', 'enabled', 'labels']));
        })();
    },
    methods: {
    }
}

</script>
