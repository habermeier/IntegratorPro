import { Command } from '../commands/Command';

export class CommandManager {
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];
    private maxStackSize: number = 50;

    public execute(command: Command): void {
        console.log(`CommandManager: Executing ${command.type} - ${command.description}`);
        command.execute();
        this.undoStack.push(command);
        this.redoStack = []; // Clear redo stack on new command

        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }
    }

    public undo(): void {
        const command = this.undoStack.pop();
        if (command) {
            console.log(`CommandManager: Undoing ${command.type}`);
            command.undo();
            this.redoStack.push(command);
        }
    }

    public redo(): void {
        const command = this.redoStack.pop();
        if (command) {
            console.log(`CommandManager: Redoing ${command.type}`);
            if (command.redo) {
                command.redo();
            } else {
                command.execute();
            }
            this.undoStack.push(command);
        }
    }

    public canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    public canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    public clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }
}
