import _ from 'underscore';

const TOKEN = {
  types: [
    'whitespace',
    'identifier',
    'string',
    'number',
    'operator',
    'grouping',
  ],

  firstCharMatches: {
    whitespace: "\\s",
    identifier: '[_A-Za-z]',
    string:     '[\'"]',
    number:     '[\\d.]', // no negative; leading "-" will be unary operator
    operator:   '[-+*/=<>!&%~$^:]',
    grouping:      '[[\\](){}]',
  },

  fullMatches: {
    // (whitespace)+
    // => literal as-is; to be ignored
    whitespace: '\\s+',

    // (underscore || letter), (word character)*
    // => match predefined set of key words, or variable as-is
    identifier: '^[_A-Za-z]\\w*',

    // a quote, (any escaped char || anything but the quote)*, the quote
    // => literal as-is
    string: '^([\'"])(\\.|[^\\1])*\\1',

    // (digit)*, (decimal point)?, (digit)+
    // => literal as-is
    number: '^\\d*\\.?\\d+',

    // (operator)+
    // => match a set of predefined operators
    operator: '^[-+*/=<>!&%~$^:]+',

    // (opening symbol || closing symbol)
    // can't do nested grouping with JS regexes easily; so handle
    // groups with code
    grouping: '^[[\\](){}]',
  },

  firstCharRegexForType(type) {
    return new RegExp(this.firstCharMatches[type]);
  },

  fullRegexForType(type) {
    return new RegExp(this.fullMatches[type]);
  },

  // returns an array of token types
  typesForFirstChar(firstChar) {
    return _.filter(this.types, (type) => {
      const firstCharRegex = this.firstCharRegexForType(type);
      return !!firstChar.match(firstCharRegex);
    });
  },

  // returns a token type for a string STARTING with a token
  typeForString(stringStartingWithToken) {
    const firstChar     = stringStartingWithToken[0];
    const possibleTypes = this.typesForFirstChar(firstChar);
    return _.find(possibleTypes, (type) => {
      const matchedStr = this.matchStringByType(stringStartingWithToken, type);
      return !!matchedStr;
    });
  },

  // returns a leading substring that matches the type given
  matchStringByType(stringStartingWithToken, type) {
    const fullRegex = this.fullRegexForType(type);
    const matched   = stringStartingWithToken.match(fullRegex);
    return matched ? matched[0] : '';
  },
};

export default class Lexer {
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
    // replace tabs with space each, then match leading single spaces
    const tabSpaces  = ' '.repeat(this.spacesPerTab);
    const spacedLine = this.lineAt(charIndex).replace(/\t/g, tabSpaces);
    const indent     = spacedLine.match(/^ +/);
    return indent ? indent[0].length : 0;
  }

  tokenStartingAt(charIndex) {
    const text   = this.textAfter(charIndex);
    const type   = TOKEN.typeForString(text);
    const lexeme = TOKEN.matchStringByType(text, type);
    const line   = this.lineNumAt(charIndex);
    const column = this.colNumAt(charIndex);
    const indent = this.indentLevelAt(charIndex);
    return { type, lexeme, line, column, indent };
  }

  traverse(tokenList = [], currentCharIndex = 0) {
    if (currentCharIndex >= this.fileText.length) return tokenList;
    const token = this.tokenStartingAt(currentCharIndex);
    if (token.type !== 'whitespace') tokenList.push(token);
    const nextCharIndex = currentCharIndex + token.lexeme.length;
    return this.traverse(tokenList, nextCharIndex);
  }
}
