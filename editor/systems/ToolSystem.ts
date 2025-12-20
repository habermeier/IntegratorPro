import { ToolType } from '../models/types';

export interface Tool {
    type: ToolType;
    onMouseDown?(x: number, y: number, event: MouseEvent): void;
    onMouseMove?(x: number, y: number, event: MouseEvent): void;
    onMouseUp?(x: number, y: number, event: MouseEvent): void;
    onDoubleClick?(x: number, y: number, event: MouseEvent): void;
    onKeyDown?(key: string, event: KeyboardEvent): void;
    activate?(): void;
    deactivate?(): void;
}

export class ToolSystem {
    private activeTool: Tool | null = null;
    private tools: Map<ToolType, Tool> = new Map();

    public registerTool(tool: Tool): void {
        this.tools.set(tool.type, tool);
    }

    public getTool<T extends Tool>(type: ToolType): T | undefined {
        return this.tools.get(type) as T;
    }

    public setActiveTool(type: ToolType): void {
        if (this.activeTool?.type === type) return;

        this.activeTool?.deactivate?.();
        const newTool = this.tools.get(type);
        if (newTool) {
            this.activeTool = newTool;
            this.activeTool.activate?.();
        } else {
            this.activeTool = null;
        }
    }

    public getActiveToolType(): ToolType | undefined {
        return this.activeTool?.type;
    }

    public handleMouseDown(x: number, y: number, event: MouseEvent): void {
        this.activeTool?.onMouseDown?.(x, y, event);
    }

    public handleMouseMove(x: number, y: number, event: MouseEvent): void {
        this.activeTool?.onMouseMove?.(x, y, event);
    }

    public handleMouseUp(x: number, y: number, event: MouseEvent): void {
        this.activeTool?.onMouseUp?.(x, y, event);
    }

    public handleDoubleClick(x: number, y: number, event: MouseEvent): void {
        this.activeTool?.onDoubleClick?.(x, y, event);
    }

    public handleKeyDown(key: string, event: KeyboardEvent): void {
        this.activeTool?.onKeyDown?.(key, event);
    }
}
