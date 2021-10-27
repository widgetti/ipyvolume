import { WidgetModel, WidgetView } from "@jupyter-widgets/base";

export
class Object3DView extends WidgetView {
    uniforms: any;
    length: number;
    popupView: WidgetView;
    id_offset: number = 0;

    onHover(id: number) {
        const offset = this.uniforms.id_offset.value;
        const index = id - offset;
        if( (index >= 0) && (index < this.length)) {
            this.model.set('hovered_index', index);
            this.model.set('hovered', true);
        } else {
            this.model.set('hovered_index', null);
            this.model.set('hovered', false);
        }
        this.model.save_changes();
    }

    onClick(id: number) {
        const offset = this.uniforms.id_offset.value;
        const index = id - offset;
        if( (index >= 0) && (index < this.length)) {
            this.model.set('clicked_index', index);
            this.model.set('clicked', true);
        } else {
            this.model.set('clicked_index', null);
            this.model.set('clicked', false);
        }
        this.model.save_changes();
    }

    async popup(id: number, mouseX, mouseY, el : HTMLDivElement) {
        const offset = this.uniforms.id_offset.value;
        const index = id - offset;
        if( (index >= 0) && (index < this.length)) {
            const popupModel = this.model.get('popup') as WidgetModel;
            if(popupModel) {
                if(!this.popupView) {
                    this.popupView = await this.options.parent.create_child_view(popupModel);
                }
                if(!el.contains(this.popupView.el)) {
                    el.innerHTML = '';
                    el.appendChild(this.popupView.el);
                }
                this.popupView.trigger('displayed');
                popupModel.set('description', this.model.get('description'));
                popupModel.set('value', index);

                // TODO: we could get the color for this specific index
                popupModel.set('color', this.model.get('description_color'));
                popupModel.set('icon', this.model.get('icon'));
                popupModel.save_changes();
            }
        } else {
            // while debugging, comment out the bottom lines so the popup stays
            if(this.popupView && el.contains(this.popupView.el)) {
                el.innerHTML = '';
            }
        }
    }    
}