import { after } from "node:test";
import { Lex } from "./lex";
import { removeChar, replaceCharAll, surroundChar } from "./utils";

export type QueryComplementResult = {
    sql: string;
    limit?: number;
};

function selectQueryComplement(lex: Lex): QueryComplementResult {
    lex.setIncSpace(true);
    let complementArray: Array<string> = [];
    let token = lex.getText();
    let limitSize = -1;

    complementArray.push(token);
    token = lex.next();
    while (token != undefined && token != "FROM" && token != "from") {
        complementArray.push(token);
        token = lex.next();
    }
    if (token == undefined) {
        return undefined;
    }

    complementArray.push(token);
    token = lex.next();
    if (token == undefined) {
        return undefined;
    }
    complementArray.push(token);
    token = lex.next();
    while (1) {
        let tableName = surroundChar(token, '"');
        complementArray.push(tableName);
        token = lex.next();
        if (token != ".") {
            break;
        }
        complementArray.push(token);
        token = lex.next();
    }
    if (token == undefined) {
        return {
            sql: complementArray.join(""),
            limit: limitSize,
        };
    }
    lex.setIncludeEnclose(true);
    complementArray.push(token);
    token = lex.next();
    while (token != undefined) {
        if (token == "limit" || token == "LIMIT") {
            lex.next();
            let limitValue = lex.next();
            limitSize = parseInt(limitValue, 10);
            if (isNaN(limitSize)) {
                return undefined;
            }
            token = lex.next();
            continue;
        }
        token = replaceCharAll(token, '"', "'");
        complementArray.push(token);
        token = lex.next();
    }

    return {
        sql: complementArray.join(""),
        limit: limitSize,
    };
}

function insertQueryComplement(lex: Lex): QueryComplementResult {
    lex.setIncSpace(true);
    let complementArray: Array<string> = [];
    let token = lex.getText();
    complementArray.push(token);

    token = lex.next();
    while (token != "into" && token != "INTO" && token != undefined) {
        complementArray.push(token);
        token = lex.next();
    }

    if (token == undefined) {
        return undefined;
    }
    complementArray.push(token);
    token = lex.next();
    if (token == undefined || token != " ") {
        return undefined;
    }
    complementArray.push(token);
    token = lex.next();
    let tableName = surroundChar(token, '"');
    complementArray.push(tableName);

    token = lex.next();
    if (token == undefined || token != " ") {
        return undefined;
    }
    complementArray.push(token);

    token = lex.next();
    if (token == "values" || token == "VALUES") {
        token = "VALUE";
    }
    if (token != "value" && token != "VALUE") {
        return undefined;
    }
    complementArray.push(token);

    // values phrase
    lex.setIncludeEnclose(true);
    token = lex.next();
    while (token != undefined) {
        token = replaceCharAll(token, '"', "'");
        complementArray.push(token);
        token = lex.next();
    }

    return {
        sql: complementArray.join(""),
        limit: -1,
    };
}

function updateQueryComplement(lex: Lex): QueryComplementResult {
    lex.setIncSpace(true);
    let complementArray: Array<string> = [];
    let token = lex.getText();
    complementArray.push(token);

    token = lex.next();
    if (token == undefined || token != " ") {
        return undefined;
    }
    complementArray.push(token);
    token = lex.next();
    let tableName = surroundChar(token, '"');
    complementArray.push(tableName);

    lex.setIncludeEnclose(true);
    token = lex.next();
    while (token != undefined) {
        token = replaceCharAll(token, '"', "'");
        complementArray.push(token);
        token = lex.next();
    }
    return {
        sql: complementArray.join(""),
        limit: -1,
    };
}

function deleteQueryComplement(lex: Lex): QueryComplementResult {
    lex.setIncSpace(true);
    let complementArray: Array<string> = [];
    let token = lex.getText();
    complementArray.push(token);

    token = lex.next();
    if (token == undefined || token != " ") {
        return undefined;
    }
    complementArray.push(token);
    token = lex.next();

    if (token != "from" && token != "FROM") {
        return undefined;
    }
    complementArray.push(token);
    token = lex.next();
    if (token == undefined || token != " ") {
        return undefined;
    }
    complementArray.push(token);
    token = lex.next();
    let tableName = surroundChar(token, '"');
    complementArray.push(tableName);

    lex.setIncludeEnclose(true);
    token = lex.next();
    while (token != undefined) {
        token = replaceCharAll(token, '"', "'");
        complementArray.push(token);
        token = lex.next();
    }

    return {
        sql: complementArray.join(""),
        limit: -1,
    };
}

export function paritqlComplement(sql: string): QueryComplementResult {
    let lex = new Lex(sql);
    let token = lex.next();

    let complementSQL: QueryComplementResult = undefined;
    token = token.toUpperCase();
    switch (token) {
        case "SELECT":
            complementSQL = selectQueryComplement(lex);
            break;
        case "UPDATE":
            complementSQL = updateQueryComplement(lex);
            break;
        case "INSERT":
            complementSQL = insertQueryComplement(lex);
            break;
        case "DELETE":
            complementSQL = deleteQueryComplement(lex);
            break;
        default:
            complementSQL = undefined;
    }

    return complementSQL;
}
