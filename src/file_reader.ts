import fs from "fs";

export default class FileReader {
    lines: Array<string>;
    lineNum: number;

    constructor() {
        this.lines = [];
        this.lineNum = 0;
    }

    load(filename: string): boolean {
        if (!fs.existsSync(filename)) {
            return false;
        }
        const text = fs.readFileSync(filename, "utf-8");
        this.lines = text.split("\n");
        this.lineNum = 0;
        return true;
    }

    read(): string {
        if (this.lines.length == this.lineNum) {
            return undefined;
        }
        return this.lines[this.lineNum++];
    }

    seekTop() {
        this.lineNum = 0;
    }

    clear() {
        this.lines = [];
        this.lineNum = 0;
    }
}
