<template>
    <div class="ipyvolume-container-root">
        <jupyter-widget ref="figure" :widget="figure"></jupyter-widget>
        <div class=ipyvolume-container-controls>
            <v-expansion-panels accordion multiple v-model="panels" flat>
                <v-expansion-panel>
                    <v-expansion-panel-header>Legend</v-expansion-panel-header>
                    <v-expansion-panel-content>
                        <jupyter-widget ref="legend" :widget="legend"></jupyter-widget>
                    </v-expansion-panel-content>
                </v-expansion-panel>
                <v-expansion-panel>
                    <v-expansion-panel-header>Misc</v-expansion-panel-header>
                    <v-expansion-panel-content>
                        <jupyter-widget v-for="child in children" :key="child" :widget="child"></jupyter-widget>
                    </v-expansion-panel-content>
                </v-expansion-panel>
                <v-expansion-panel>
                    <v-expansion-panel-header>Debug</v-expansion-panel-header>
                    <v-expansion-panel-content>
                        <p>Show render pass:</p>
                        <v-btn-toggle v-model="models.figure.show" tile group>
                            <v-btn value="render">Render</v-btn>
                            <v-btn value="front">Front</v-btn>
                            <v-btn value="back">Back</v-btn>
                            <v-btn value="id">ID</v-btn>
                            <v-btn value="coordinate">Coordinate</v-btn>
                        </v-btn-toggle>
                    </v-expansion-panel-content>
                </v-expansion-panel>
            </v-expansion-panels>
        </div>
    </div>
</template>
<style id="ipyvolume-container">
    .ipyvolume-container-root {
        display: flex;
    }
    .ipyvolume-container-controls {
        display: flex;
        flex-direction: column;
    }
</style>

<script>
    module.export = {
        created() {
            console.log('created', this.$refs)
        },
        mounted() {
            const figureComponent = this.$refs.figure;
            (async () => {
                const figure = await this.viewCtx.getModelById(this.figure.substr(10));
                function bbproxy(model, attrs, widgetAttrs) {
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
                                listValueProxy = listValue.map((k) => bbproxy(k, widgetAttrs[attr]));
                            }
                            proxy[attr] = listValueProxy;
                            model.on('change:' + attr, (_widget, value) => {
                                console.log('changed list', attr, value)
                                if(value) {
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
                this.$set(this.models, 'figure', bbproxy(figure, ["show"]));
            })();
        },
        methods: {
        }
    }

</script>
