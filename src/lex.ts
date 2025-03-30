export class Lex {
    sentence: string;
    text: string | undefined;
    incEnclose: boolean;
    incSpace: boolean;

    constructor(_sentence: string) {
        this.sentence = _sentence;
        this.text = undefined;
        this.incEnclose = false;
        this.incSpace = false;
    }

    next(): string {
        while (1) {
            let c: string = this.sentence[0];
            if (c === undefined || c === null) {
                return undefined;
            }
            this.sentence = this.sentence.slice(1);
            switch (c) {
                case " ":
                    if (this.incSpace) {
                        this.text = c;
                        let index: number = 0;
                        while (1) {
                            c = this.sentence[index++];
                            if (c != " ") {
                                break;
                            }
                        }
                        index--;
                        if (index > 0)
                            this.sentence = this.sentence.slice(index);
                        return this.text;
                        break;
                    }
                case "\r":
                case "\t":
                case "\n":
                    continue;
                case "'":
                case '"':
                    let enclose = c;
                    let str: string = "";
                    if (this.incEnclose) {
                        str = c;
                    }
                    let index: number = 0;
                    while (1) {
                        c = this.sentence[index++];
                        if (c == "\\") {
                            c = this.sentence[index++];
                            switch (c) {
                                case "n":
                                    c = "\n";
                                    break;
                                case "r":
                                    c = "\r";
                                    break;
                                case "t":
                                    c = "\t";
                                    break;
                                default:
                                    break;
                            }
                        } else {
                            if (c == enclose || c == undefined || c == null) {
                                if (this.incEnclose && c == enclose) {
                                    str += enclose;
                                }
                                break;
                            }
                        }
                        str += c;
                    }
                    this.sentence = this.sentence.slice(index);
                    this.text = str;
                    return this.text;
                default:
                    break;
            }
            if (
                (c >= "a" && c <= "z") ||
                (c >= "A" && c <= "Z") ||
                (c >= "0" && c <= "9") ||
                c == "_" ||
                c == "-"
            ) {
                let str: string = c;
                let index: number = 0;
                while (1) {
                    c = this.sentence[index++];
                    if (
                        !(
                            (c >= "a" && c <= "z") ||
                            (c >= "A" && c <= "Z") ||
                            (c >= "0" && c <= "9") ||
                            c == "_" ||
                            c == "-"
                        )
                    ) {
                        break;
                    }
                    str += c;
                }
                this.sentence = this.sentence.slice(index - 1);
                this.text = str;
                return this.text;
            }
            this.text = c;
            return c;
        }
        return undefined;
    }

    getText(): string | undefined {
        return this.text;
    }

    setIncludeEnclose(flag: boolean) {
        this.incEnclose = flag;
    }

    setIncSpace(flag: boolean) {
        this.incSpace = flag;
    }
}
