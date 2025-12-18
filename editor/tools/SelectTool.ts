import { Tool } from '../systems/ToolSystem';
import { ToolType } from '../models/types';
import { FloorPlanEditor } from '../FloorPlanEditor';

export class SelectTool implements Tool {
    public type: ToolType = 'select';
    private editor: FloorPlanEditor;

    constructor(editor: FloorPlanEditor) {
        this.editor = editor;
    }

    public onMouseDown(x: number, y: number, event: MouseEvent): void {
        if (event.button !== 0) return; // Left click only

        const isMulti = event.shiftKey || event.ctrlKey || event.metaKey;
        const selectedIds = this.editor.selectionSystem.selectAt(x, y, isMulti);

        console.log('SelectTool: Selected IDs', selectedIds);
        this.editor.emit('selection-changed', selectedIds);
    }

    public onKeyDown(key: string, event: KeyboardEvent): void {
        if (key === 'Escape') {
            this.editor.selectionSystem.clearSelection();
            this.editor.emit('selection-changed', []);
        }
    }
}
