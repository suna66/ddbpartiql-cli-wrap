import * as readline from "readline/promises";

const readInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

export async function keyInput(prompt: string): Promise<string> {
    const result = await readInterface.question(prompt);

    return result;
}
