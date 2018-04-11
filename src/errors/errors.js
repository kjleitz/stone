import StringParser from '../parse/string_parser';

class LexError {
  constructor(text) {
    this.parser = new StringParser(text);
  }

  at(charIndex, message = "Lexer error") {
    const lineNum   = this.parser.lineNumAt(charIndex);
    const colNum    = this.parser.colNumAt(charIndex);
    const line      = this.parser.lineAt(charIndex);
    const errorDesc = `${message} at L${lineNum}/C${colNum}`;
    const errorLine = `\n  ${line}...`;
    const errorMark = ` ${' '.repeat(line.length)}^`;
    throw [errorDesc, errorLine, errorMark].join("\n");
  }
}

class SyntaxError {
  static at(token, message = "Syntax error") {
    const position = `L${token.line}/C${token.column}`;
    return `${message} at ${position}`;
  }

  static between(startToken, endToken, message = "Syntax error") {
    const startPos = `L${startToken.line}/C${startToken.column}`;
    const endPos   = `L${endToken.line}/C${endToken.column}`;
    return `${message} between ${startPos} and ${endPos}`;
  }
}

export { LexError, SyntaxError };
