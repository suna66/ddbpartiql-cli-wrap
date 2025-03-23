export var DEBUG = false;
export function setDebug(flag: boolean) {
    DEBUG = flag;
}

export function getUUID(): string {
    return crypto.randomUUID();
}

export function epochTime(): number {
    return Math.trunc(Date.now() / 100);
}

export function trimStr(src: string): string {
    if (src == undefined) {
        return "";
    }
    return src.trim();
}

export function semicolonToBlank(src: string): string {
    const res = src.replace(";", "");
    return res;
}

export function convertVariables(
    src: string,
    variables: { [key: string]: string | undefined }
): string {
    let rs: string = "";
    let index = 0;

    if (src == undefined) {
        return undefined;
    }

    while (1) {
        let c = src[index++];
        if (c == undefined) {
            break;
        }
        if (c == "$" && src[index] == "{") {
            index++;
            var numEnclose = 1;
            var key = "";
            while (1) {
                c = src[index++];
                if (c == undefined) {
                    break;
                }
                if (c == "{") {
                    numEnclose++;
                }
                if (c == "}") {
                    numEnclose--;
                }
                if (numEnclose == 0) {
                    break;
                }
                key += c;
            }
            if (key.length > 0) {
                if (key == "UUID") {
                    c = getUUID();
                } else if (key == "NOW") {
                    c = epochTime().toString();
                } else {
                    c = variables[key];
                    if (c == undefined) {
                        c = "";
                    }
                }
            }
        }
        rs += c;
    }
    return rs;
}

export function removeChar(src: string, removeCh: string): string {
    if (src == undefined) return undefined;

    let result = "";
    for (let c of src) {
        if (c != removeCh) {
            result += c;
        }
    }
    return result;
}

export function surroundChar(str: string, surround: string): string {
    let result = str;
    let len = str.length;
    let first = str[0];
    let last = str[len - 1];
    if (first != surround) {
        result = surround + result;
    }
    if (last != surround) {
        result += surround;
    }
    return result;
}

export function replaceCharAll(
    src: string,
    pattern: string,
    replacement: string
): string {
    let buf = "";

    for (let c of src) {
        if (c == pattern) {
            buf += replacement;
        } else {
            buf += c;
        }
    }

    return buf;
}
