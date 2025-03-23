import { Lex } from "./lex";
import { removeChar, replaceCharAll, surroundChar } from "./utils";

export function paritqlComplement(sql: string): string {
    let lex = new Lex(sql);
    lex.setIncludeEnclose(true);
    let complementArray: Array<string> = [];
    let valueAreaFlag = false;

    let token = lex.next();
    while (token != undefined) {
        token = lex.getText();
        let key = token.toUpperCase();
        switch (key) {
            case "UPDATE":
            case "FROM":
            case "INTO":
                complementArray.push(token);
                let tableName = lex.next();
                tableName = removeChar(tableName, "'");
                tableName = surroundChar(tableName, '"');
                token = lex.next();
                if (token == ".") {
                    let indexName = lex.next();
                    indexName = removeChar(indexName, "'");
                    indexName = surroundChar(indexName, '"');
                    tableName += "." + indexName;
                    token = lex.next();
                }
                complementArray.push(tableName);
                break;
            case "VALUE":
            case "WHERE":
                valueAreaFlag = true;
            default:
                if (valueAreaFlag) {
                    token = replaceCharAll(token, '"', "'");
                }
                complementArray.push(token);
                token = lex.next();
                break;
        }
    }
    let complementSQL = complementArray.join(" ");
    return complementSQL;
}
