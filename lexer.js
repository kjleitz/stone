import _ from 'underscore';

const TOKEN = {
  types: [
    'whitespace',
    'identifier',
    'string',
    'number',
    'operator',
    'group',
  ],

  firstCharMatches: {
    whitespace: '\s',
    identifier: '[_A-Za-z]',
    string:     '[\'"]',
    number:     '[\d.]', // no negative; leading "-" will be unary operator
    operator:   '[-+*/=<>!&%~$^:]',
    group:      '[[({]',
  },

  fullMatches: {
    // (whitespace)+
    //=> literal as-is; to be ignored
    whitespace: '\s+',

    // (underscore || letter), (word character)*
    //=> match predefined set of key words, or variable as-is
    identifier: '^[_A-Za-z]\w*',
  
    // a quote, (any escaped char || anything but the quote)*, the quote
    //=> literal as-is
    string: '^([\'"])(\\.|[^\1])*\1',
  
    // (digit)*, (decimal point)?, (digit)+
    //=> literal as-is
    number: '^\d*\.?\d+',
  
    // (operator)+
    //=> match a set of predefined operators
    operator: '^[-+*/=<>!&%~$^:]+',
    
    // (opening symbol || closing symbol)
    // can't do nested grouping with JS regexes easily; so handle
    // groups with code
    group: '^[[\](){}]',
  },

  firstCharRegexForType: function(type) {
    return new Regexp(this.firstCharMatches[type]);
  },

  fullRegexForType: function(type) {
    return new Regexp(this.fullMatches[type]);
  },

  // returns an array of token types
  typesForFirstChar: function(firstChar) {
    return _.filter(this.types, (type) => {
      const firstCharRegex = this.firstCharRegexForType(type);
      return firstChar.match(firstCharRegex);
    });
  },

  // returns a token type for a string STARTING with a token
  typeForString: function(stringStartingWithToken) {
    const firstChar     = stringStartingWithToken[0];
    const possibleTypes = this.typesForFirstChar(firstChar);
    _.find(possibleTypes, (type) => this.matchStringByType(type));
  },

  // returns a leading substring that matches the type given
  matchStringByType: function(stringStartingWithToken, type) {
    const fullRegex = this.fullRegexForType(type);
    return stringStartingWithToken.match(fullRegex);
  },
}

class Lexer {
  constructor(fileText) {
    this.fileText         = fileText;
    this.currentCharIndex = 0;
    this.tokenList        = [];
    this.listBuilt        = false;
  }

  textUpToCurrent() {
    return this.fileText.slice(0, this.currentCharIndex);
  }

  linesUpToCurrent() {
    return this.textUpToCurrent().split(/\n/);
  }

  textFromCurrentToEnd() {
    return this.fileText.slice(this.currentCharIndex);
  }

  currentChar() {
    return this.fileText[this.currentCharIndex];
  }

  currentLine() {
    return _.last(this.linesUpToCurrent());
  }

  currentLineNum() {
    return this.linesUpToCurrent().length;
  }

  currentColNum() {
    return this.currentLine().length;
  }

  currentIndentLevel() {
    // replace tabs with two spaces each, then match leading single spaces
    return this.currentLine().replace(/\t/g, '  ').match(/^ +/)[0].length
  }

  currentToken() {
    const type   = TOKEN.typeForString(this.textFromCurrentToEnd());
    const lexeme = TOKEN.matchStringByType(this.textFromCurrentToEnd(), type);
    const line   = this.currentLineNum();
    const column = this.currentColNum();
    const indent = this.currentIndentLevel();
    return { type, lexeme, line, column, indent };
  }

  // Running `traverse` multiple times in a row will double the token list
  // each time... just a warning. Use `getTokens` instead.
  traverse() {
    if (this.charIndex >= this.fileText.length) return;
    const token = this.currentToken();
    if (token.type !== 'whitespace') this.tokenList.push(token);
    this.charIndex += token.lexeme.length;
    return this.traverse();
  }

  getTokens() {
    if (this.listBuilt) return this.tokenList;
    this.traverse();
    this.listBuilt = true;
    return this.tokenList;
  }
}

// const charUnits = {
//   // wordy
//   underscore:  '_',

//   // stringy
//   singleQuote: "'",
//   doubleQuote: '"',

//   // operators
//   plus:         '+',
//   minus:        '-',
//   multiply:     '*',
//   divide:       '/',
//   equals:       '=',
//   lessThan:     '<',
//   greaterThan:  '>',
//   bang:         '!',
//   ampersand:    '&',
//   modulo:       '%',
//   twiddle:      '~',
//   dollar:       '$',
//   caret:        '^',
//   colon:        ':',

//   // groupy
//   slash:        '/', // aliases: divide
//   openParen:    '(',
//   closeParen:   ')',
//   openBracket:  '[',
//   closeBracket: ']',
//   openBrace:    '{',
//   closeBrace:   '}',
// };

// const operators = {
//   firstChar:    '[-+*/=<>!&%~$^:]',
//   fullOperator: '[-+*/=<>!&%~$^:]+',
// };

// const regexUnits = {
//   // wordy
//   letter:      '[A-Za-z]',
//   lowerLetter: '[a-z]',
//   upperLetter: '[A-Z]',
//   underscore:  '_',
//   digit:       '\d',
//   wordChar:    '\w',

//   // stringy
//   singleQuote: "'",
//   doubleQuote: '"',
//   quote:       '[\'"]',

//   // operators
//   plus:         '+',
//   minus:        '-',
//   multiply:     '*',
//   divide:       '/',
//   equals:       '=',
//   lessThan:     '<',
//   greaterThan:  '>',
//   bang:         '!',
//   ampersand:    '&',
//   modulo:       '%',
//   twiddle:      '~',
//   dollar:       '$',
//   caret:        '^',
//   colon:        ':',
//   specialChar:  '[-+*/=<>!&%~$^]',

//   // grouping
//   slash:        '/', // aliases: divide
//   openParen:    '(',
//   closeParen:   ')',
//   openBracket:  '[',
//   closeBracket: ']',
//   openBrace:    '{',
//   closeBrace:   '}',
// };

// const keyWords = {
//   // primitive types
//   String: 'Str',
//   Number: 'Num',
//   Object: 'Obj',

//   // functions
//   def: 'def',
// };
