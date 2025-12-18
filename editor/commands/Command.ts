export interface Command {
    type: string;
    description: string;
    timestamp: number;
    execute(): void;
    undo(): void;
    redo?(): void;
}
