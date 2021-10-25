<template>
    <div class="ipyvolume-container-root">
        <jupyter-widget ref="figure" :widget="figure"></jupyter-widget>
        <div class=ipyvolume-container-controls>
            <v-expansion-panels accordion multiple :value="[0, 1]" flat>
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