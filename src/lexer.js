import _ from 'underscore';

const TOKEN = {
  types: [
    'whitespace',
    'comment',
    'word',
    'string',
    'number',
    'operator',
    'grouping',
    'delimiter',
  ],

  ignorableTypes: [
    'whitespace',
    'comment',
  ],

  names: {
    word: {
      // primitive types
      Bool:    'Boolean',
      Boolean: 'Boolean',
      Null:    'Null',
      Num:     'Number',
      Number:  'Number',
      Obj:     'Object',
      Object:  'Object',
      Str:     'String',
      String:  'String',

      // special values
      false: 'false',
      null:  'null',
      this:  'this',
      true:  'true',
      super: 'super',

      // logical flow
      else:   'else',
      for:    'for',
      if:     'if',
      raise:  'raise',
      return: 'return',
      while:  'while',

      // declaration
      extends: 'extends',
      def:     'def',
      proto:   'proto',
      set:     'set',
      shaped:  'shaped',

      // anything else is 'identifier'
    },

    operator: {
      // dispatch
      '.': 'dot',
      ':': 'colon', // not sure if this is more dispatch or assignment

      // assignment
      '=':  'equals',

      // math
      '/':  'slash',
      '%':  'modulo',
      '-':  'minus',
      '+':  'plus',
      '*':  'star',
      '**': 'doubleStar',

      // comparison
      '==': 'equalTo',
      '>':  'greaterThan',
      '>=': 'greaterThanOrEqualTo',
      '<':  'lessThan',
      '<=': 'lessThanOrEqualTo',
      '!=': 'notEqualTo',

      // boolean
      '&&': 'and',
      '!':  'not',
      '||': 'or',
    },

    grouping: {
      '{':  'openBrace',
      '}':  'closeBrace',
      '[':  'openBracket',
      ']':  'closeBracket',
      '(':  'openParen',
      ')':  'closeParen',
    },

    delimiter: {
      ',':  'comma',
    },
  },

  firstCharMatches: {
    whitespace: /\s/,
    comment:    /#/,
    word:       /[_A-Za-z]/,
    string:     /['"]/,
    number:     /[\d.]/, // no negative; leading "-" will be unary operator
    operator:   /[-+*/=<>!&|%~$^:.]/,
    grouping:   /[[\](){}]/,
    delimiter:  /,/,
  },

  fullMatches: {
    // (whitespace)+
    // => literal as-is; to be ignored
    whitespace: /^\s+/,

    // octothorpe, (anything)*, end of line
    // => literal as-is; to be ignored
    comment: /^#.*?[\n$]/,

    // (underscore || letter), (word character)*
    // => match predefined set of key words, or variable as-is
    word: /^[_A-Za-z]\w*/,

    // a quote, (any escaped char || anything but the quote)*, the quote
    // => literal as-is
    string: /^'(\\.|[^'])*?'|^"(\\.|[^"])*?"/,

    // (digit)*, (decimal point)?, (digit)+
    // => literal as-is
    number: /^\d*\.?\d+/,

    // (operator)+
    // => match a set of predefined operators
    operator: /^[-+*/=<>!&|%~$^:.]+/,

    // (opening symbol || closing symbol)
    // can't do nested grouping with JS regexes easily; so handle
    // groups with code
    grouping: /^[[\](){}]/,

    // (comma || colon)
    // literal as-is
    delimiter: /^,/,
  },

  typeIsSignificant(tokenType) {
    return !_.contains(this.ignorableTypes, tokenType);
  },

  firstCharRegexForType(type) {
    return this.firstCharMatches[type];
  },

  fullRegexForType(type) {
    return this.fullMatches[type];
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

  nameForLexemeByType(lexeme, type) {
    const names = this.names[type];
    if (_.isUndefined(names)) return 'literal';

    const name  = names[lexeme];
    if (type === 'word' && _.isUndefined(name)) return 'identifier';

    return name;
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
    // replace tabs with spaces, then match leading single spaces
    const tabSpaces  = ' '.repeat(this.spacesPerTab);
    const spacedLine = this.lineAt(charIndex).replace(/\t/g, tabSpaces);
    const indent     = spacedLine.match(/^ +/);
    return indent ? indent[0].length : 0;
  }

  tokenError(tokenProp, problemDesc, charIndex) {
    const lineNum = this.lineNumAt(charIndex);
    const colNum  = this.colNumAt(charIndex);
    const line    = this.lineAt(charIndex);
    const errorDesc = `Token ${tokenProp} at L${lineNum}/C${colNum} is ${problemDesc}!`;
    const errorLine = `\n  ${line}...`;
    const errorMark = ` ${' '.repeat(line.length)}^`;
    throw [errorDesc, errorLine, errorMark].join("\n");
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
    if (currentCharIndex = 400) debugger;
    return this.traverse(tokenList, nextCharIndex);
  }
}
