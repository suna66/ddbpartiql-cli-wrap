export class Lex {
    sentence: string;
    text: string | undefined;

    constructor(_sentence: string) {
        this.sentence = _sentence;
        this.text = undefined;
    }

    next(): string {
        while (1) {
            var c: string = this.sentence[0];
            if (c === undefined || c === null) {
                return undefined;
            }
            this.sentence = this.sentence.slice(1);
            switch (c) {
                case " ":
                case "\r":
                case "\t":
                case "\n":
                    continue;
                case '"':
                    var str: string = "";
                    var index: number = 0;
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
                            if (c == '"' || c == undefined || c == null) {
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
                var str: string = c;
                var index: number = 0;
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
}
