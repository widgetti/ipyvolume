<template>
    <div style="padding: 5px;">
        <div v-for="(mark, index) in marks" :key="index">
            <v-checkbox hide-details dense style="margin-top: 0px; padding-top 0px"
                v-model="mark.visible"
                off-icon="mdi-eye-off"
                :on-icon="mark.icon"
                :color="mark.description_color"
                :background-color="mark.hovered ? '#ccc' : 'unset'"
                :label="mark.description"></v-checkbox>
        </div>
    </div>
</template>
<style id="fruit-selector-style-file">
    .fruit-selector-file td {
        border: 1px solid #999;
        padding: 5px 10px ;
    }
    .fruit-selector-file {
        border-collapse: collapse;
    }
    .fruit-selector-file td.selected {
        width: 50px;
    }
    .ipv-main-container {
        background-color: white;
    }
    .ipv-main-container:fullscreen {
        display: flex;
        justify-content: center;
        align-items: center;
        align-items: center;
    }
</style>
<script>
    module.export = {
        mounted() {
            (async () => {
                const figureWidgetModel = await this.viewCtx.getModelById(this.figure.substr(10));
                console.log('figure', figureWidgetModel);
                this.$set(this.models, 'figure', this.bbproxy(figureWidgetModel, ["stereo"], {
                    "scatters": ["visible", "description", "icon", "description_color", "hovered"],
                    "meshes": ["visible", "description", "icon", "description_color", "hovered"],
                    "volumes": ["visible", "description", "icon", "description_color", "hovered"],
                }));
            })();
        },
        computed: {
            marks() {
                return [...this.models.figure.scatters, ...this.models.figure.meshes, ...this.models.figure.volumes]
            },
            // anyhover() {
            //     if(this.models.scatters) {

            //     }
            //     return this.models.scatters && !this.models.scatters.every((s) => !s.hovered)
            // }
        },
        methods: {
            bbproxy(model, attrs, widgetAttrs) {
                const proxy = {}

                attrs.forEach((attr) => {
                    console.log('setting', attr)
                    let valueCopy = model.get(attr);
                    model.on('change:' + attr, (_widget, value) => {
                        proxy[attr] = value
                    })
                    Object.defineProperty(proxy, attr, {
                        enumerable: true,
                        configurable: true,                            
                        get: () => {
                            return valueCopy;
                        },
                        set: (value) => {
                            valueCopy = value;
                            model.set(attr, value);
                            model.save_changes();
                        },
                    });
                })
                if(widgetAttrs) {
                    Object.keys(widgetAttrs).forEach((attr) => {
                        console.log('setting list', attr)
                        let listValue = model.get(attr);
                        let listValueProxy = [];
                        if(listValue) {
                            listValueProxy = listValue.map((k) => this.bbproxy(k, widgetAttrs[attr]));
                        }
                        model.on('change:' + attr, (_widget, value) => {
                            console.log('changed list', attr, value)
                            if(value) {
                                proxy[attr] = value.map((k) => this.bbproxy(k, widgetAttrs[attr]))
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
            },
        }
    }

</script>
