import _     from 'underscore';
import TOKEN from './token';
import { LexError } from '../errors/errors';

class Lexer {
  constructor(options) {
    this.fileText     = options.fileText;
    this.spacesPerTab = options.spacesPerTab || 2;
  }

  textUpTo(charIndex) {
    return this.fileText.slice(0, charIndex + 1);
  }

  linesUpTo(charIndex) {
    return this.textUpTo(charIndex).split(/\n/);
  }

  textAfter(charIndex) {
    return this.fileText.slice(charIndex);
  }

  lineAt(charIndex) {
    return _.last(this.linesUpTo(charIndex));
  }

  lineNumAt(charIndex) {
    return this.linesUpTo(charIndex).length;
  }

  colNumAt(charIndex) {
    return this.lineAt(charIndex).length;
  }

  indentLevelAt(charIndex) {
    // replace tabs with spaces, then match leading single spaces
    const tabSpaces  = ' '.repeat(this.spacesPerTab);
    const spacedLine = this.lineAt(charIndex).replace(/\t/g, tabSpaces);
    const indent     = spacedLine.match(/^ +/);
    return indent ? indent[0].length : 0;
  }

  tokenError(tokenProp, problemDesc, charIndex) {
    return new LexError(this).at(charIndex, `Token ${tokenProp} is ${problemDesc}`);
  }

  tokenStartingAt(charIndex) {
    const line   = this.lineNumAt(charIndex);
    const column = this.colNumAt(charIndex);
    const text   = this.textAfter(charIndex);

    const type   = TOKEN.typeForString(text);
    if (_.isUndefined(type)) throw this.tokenError('type',   'undefined', charIndex);

    const lexeme = TOKEN.matchStringByType(text, type);
    if (_.isEmpty(lexeme))   throw this.tokenError('lexeme', 'empty',     charIndex);

    const name   = TOKEN.nameForLexemeByType(lexeme, type);
    if (_.isUndefined(name)) throw this.tokenError('name',   'undefined', charIndex);

    const indent = this.indentLevelAt(charIndex);
    return { type, lexeme, name, line, column, indent };
  }

  traverse(tokenList = [], currentCharIndex = 0) {
    if (currentCharIndex >= this.fileText.length) return tokenList;
    const token = this.tokenStartingAt(currentCharIndex);
    if (TOKEN.typeIsSignificant(token.type)) tokenList.push(token);
    const nextCharIndex = currentCharIndex + token.lexeme.length;
    return this.traverse(tokenList, nextCharIndex);
  }
}

export default Lexer;
