import _         from 'underscore';
import TokenUtil from '../utils/token_util';

class StringParser {
  constructor(string, options = {}) {
    this.string       = string; // please don't mutate this.
    this.spacesPerTab = options.spacesPerTab || 2;
  }

  textUpTo(charIndex) {
    return this.string.slice(0, charIndex + 1);
  }

  linesUpTo(charIndex) {
    return this.textUpTo(charIndex).split(/\n/);
  }

  textAfter(charIndex) {
    return this.string.slice(charIndex);
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

  tokenTypesForFirstChar() {
    this._firstCharTypes = this._firstCharTypes || TokenUtil.typesForFirstChar(this.string);
    return this._firstCharTypes;
  }

  leadingType() {
    this._leadingType = this._leadingType || TokenUtil.firstTypeForString(this.string);
    return this._leadingType;
  }

  leadingLexeme() {
    const type = this.leadingType();
    this._leadingLexeme = this._leadingLexeme || TokenUtil.firstSubstringMatchForType(this.string, type);
    return this._leadingLexeme;
  }

  leadingName() {
    const type   = this.leadingType();
    const lexeme = this.leadingLexeme();
    this._leadingName = this._leadingName || TokenUtil.nameForLexemeByType(lexeme, type);
    return this._leadingName;
  }
}

export default StringParser;
