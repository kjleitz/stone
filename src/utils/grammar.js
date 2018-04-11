const GRAMMAR = {
  types: [
    'whitespace',
    'comment',
    'string',
    'number',
    'regex',
    'operator',
    'word',
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

      // flow control
      check:  'check',
      guard:  'guard',
      raise:  'raise',
      return: 'return',
      slide:  'slide',

      // declaration
      extends: 'extends',
      from:    'from',
      def:     'def',
      proto:   'proto',
      set:     'set',
      shaped:  'shaped',

      // anything else is 'identifier'
    },

    operator: {
      // dispatch
      '.': 'dot',

      // pairing
      ':':  'colon',
      '=>': 'rocket',
      '_>': 'exhaust',

      // assignment
      '=':  'equals',

      // math
      '/':  'slash',
      '%':  'modulo',
      '-':  'minus',
      '+':  'plus',
      '*':  'star',
      '**': 'starStar',

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
    regex:      /\//,
    operator:   /[-+*/=<>!&|%~$^:._]/,
    grouping:   /[[\](){}]/,
    delimiter:  /,/,
  },

  fullMatches: {
    // (whitespace)+
    // => literal as-is; to be ignored
    whitespace: /^\s+/,

    // octothorpe, (anything)*, end of line
    // => literal as-is; to be ignored
    comment: /^#.*?(\n|$)/,

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
    operator: /^[-+*/=<>!&|%~$^:._]+/,

    // (opening symbol || closing symbol)
    // can't do nested grouping with JS regexes easily; so handle
    // groups with code
    grouping: /^[[\](){}]/,

    // (comma || colon)
    // literal as-is
    delimiter: /^,/,

    // I apologize in advance for this monstrosity:
    // (adapted from https://stackoverflow.com/questions/17843691/javascript-regex-to-match-a-regex/17843773#17843773)
    // 1. \/           -- starting slash
    // 2. (?:          -- a group of...
    //   a. [^[/\\]      -- anything but (open bracket || slash || backslash), OR
    //   b. \\.          -- any escaped char, OR
    //   c. \[(?:        -- within brackets...
    //     i.  [^\]\\]     -- anything but (closing bracket || backslash), OR
    //     ii. \\.         -- any escaped char
    //   )*\]            -- ...any number of times before the closing bracket
    // )*              -- ...any number of times
    // 3. \/           -- closing slash
    // 4. [gimuy]{0,5} -- 0-5 flags
    regex: /^\/(?:[^[/\\]|\\.|\[(?:[^\]\\]|\\.)*\])*\/[gimuy]{0,5}/,
  },
};

export default GRAMMAR;
