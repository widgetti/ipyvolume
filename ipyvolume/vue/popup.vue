<template>
    <v-sheet elevation="5" tile style="margin: 5px; padding-right: 4px" ref="sheet" rounded>
        <div :style="{padding: '4px', color: color}">
            <v-icon :color="color">{{icon}}</v-icon>
            {{description}}(#<i>{{value}}</i>) <span v-if="extra_html" v-html="extra_html"></span>
            <ul v-if="record" style="margin-top: 0">
                <li v-for="(value, name) in record">{{name}}={{value}}</li>
            </ul>
        </div>
    </v-sheet>
</template>

<style id="ipyvolume-popup">
</style>

<script>
    module.export = {
    }
</script>
