import _ from 'underscore';

// Options:
//
// 1) create a list of trees which comprise all of the logic in the file,
//    then once that list is finished, turn it over to another cog in the
//    compiler to do more transformations (AST/intermediate/JS/whatever)
//
// 2) build trees one by one; when one is finished, instantly turn that
//    into... javascript? another intermediate? evaluate it? (this option
//    being lazy computation so it's not huge memory [side note: is this
//    _actually_ big on memory? or do I just think an obj/array of objs
//    is that large?])
//
// With #2, might have to run through and do the function definitions
// first (because they'd be hoisted).
//
// I'll go with #1 for now.


// We'll start with operators...
// - need to determine whether it's a binary or unary operator
// - then for binary, it becomes:
// createNodeFn(operatorToken);
// //=> leftToken  == (value) group, identifier, literal, called function
// //=> rightToken == (value) group, identifier, literal, called function
// //=> {
//   action: "operatorName",
//   left:   createNodeFn(leftToken),
//   right:  createNodeFn(rightToken),
// }

// OPERATIONAL_

// Operational Rules
//
// Order:
// 1) find the first block of code; a block of code being...
//  - full lines at the current indentation level, contiguously (or, when not
//    contiguous, separated only by newlines)
//  - (fill in rest of rules later)
// 2) extract first expression from the block of code, an expression being...
//  - eh, fill this in as you figure it out

// ACTIONS = {
//   operator: {
//     equals: (tokenIndex, tokens) => {
//       const leftToken  = tokens[tokenIndex - 1];
//       const rightToken = tokens[tokenIndex + 1];
//       return {
//         action: 'assignment',
//         leftToken: leftToken,
//         rightToken: rightToken, // this isn't right...
//       };
//     },
//   },
// };

// PRECEDENCE: [
//   'plus',
//   'equals',
// ];

const VALIDATE = {
  errorFor(operationName, lineNum, colNum) {
    return () => {
      throw `Invalid ${operationName} at L${lineNum}/C${colNum}`;
    };
  },

  assignment(token, leftToken, rightToken) {
    const throwError = this.errorFor('assignment', token.line, token.column);

    if (token.name     !== 'equals')     throwError();
    if (leftToken.name !== 'identifier') throwError();

    const validRightTokenNames = [
      'identifier',
      'literal',
      'if',
      'false',
      'minus', // need to define unary operators someplace
      'not',
      'null',
      'this',
      'true',
      'super',
      'openBrace',
      'openBracket',
      'openParen',
      'Boolean',
      'Null',
      'Number',
      'Object',
      'String',
    ];

    if (!_.contains(validRightTokenNames, rightToken.name)) throwError()
  },

  addition(token, leftToken, rightToken) {
    const throwError = this.errorFor('addition', token.line, token.column);

    if (token.name !== 'plus') throwError();

    const validLeftTokenNames = [
      'identifier',
      'literal',
      'closeBrace',
      'closeBracket',
      'closeParen',
    ];

    const validRightTokenNames = [
      'identifier',
      'literal',
      'minus', // unary
      'plus',  // unary
      'openBrace',
      'openBracket',
      'openParen',
    ];

    if (!_.contains(validLeftTokenNames,  leftToken.name))  throwError();
    if (!_.contains(validRightTokenNames, rightToken.name)) throwError();
  },
};

const NODE = {
  new(operation, token, leftNode, rightNode) {
    return { operation, token, leftNode, rightNode };
  },

  identity(token) {
    return this.new('identity', token, null, null);
  },

  // unary operations

  unaryPlus(token, rightNode) {
    return this.new('substantiation', token, null, rightNode);
  },

  unaryMinus(token, rightNode) {
    return this.new('negation', token, null, rightNode);
  },

  // binary operations

  assignment(token, leftNode, rightNode) {
    return this.new('assignment', token, leftNode, rightNode);
  },

  addition(token, leftNode, rightNode) {
    return this.new('addition', token, leftNode, rightNode);
  },

  subtraction(token, leftNode, rightNode) {
    return this.new('subtraction', token, leftNode, rightNode);
  },

  multiplication(token, leftNode, rightNode) {
    return this.new('multiplication', token, leftNode, rightNode);
  },

  division(token, leftNode, rightNode) {
    return this.new('division', token, leftNode, rightNode);
  },

  exponent(token, leftNode, rightNode) {
    return this.new('exponent', token, leftNode, rightNode);
  },

  modulo(token, leftNode, rightNode) {
    return this.new('modulo', token, leftNode, rightNode);
  },

  dispatch(token, leftNode, rightNode) {
    return this.new('dispatch', token, leftNode, rightNode);
  },

  comparison(token, leftNode, rightNode) {
    return this.new('comparison', token, leftNode, rightNode);
  },

  and(token, leftNode, rightNode) {
    return this.new('and', token, leftNode, rightNode);
  },

  or(token, leftNode, rightNode) {
    return this.new('or', token, leftNode, rightNode);
  },
};

export default class Syntaxer {
  constructor(options) {
    this.tokenList      = options.tokenList;
    this.syntaxTree     = {};
    this.currentLineNum = 0;
    this.currentColNum  = 0;
  }

  currentLine() {
    return _.where(this.tokenList, { line: this.currentLineNum });
  }

  nodeFromTokens(tokens = this.tokenList) {
    if (tokens.length === 0) return null;
    if (tokens.length === 1) return NODE.identity(tokens[0]);

    const firstToken = tokens[0];

    // if the first token is a unary operator...
    if (firstToken.type === 'operator') {
      const restOfTokens = _.where(tokens.slice(1), { line: firstToken.line });
      switch (firstToken.name) {
        case 'minus': return NODE.unaryMinus(firstToken, this.nodeFromTokens(restOfTokens));
        case 'plus':  return NODE.unaryPlus(firstToken,  this.nodeFromTokens(restOfTokens));
        case 'not':   return NODE.unaryNot(firstToken,   this.nodeFromTokens(restOfTokens));
        default: debugger;
      }
    }

    // if the first token is an open grouping symbol...
    if (firstToken.type === 'grouping') {
      const restOfTokens = tokens.slice(1);
      switch (firstToken.name) {
        // case 'openBrace':   return NODE.object(firstToken, this.nodeFromTokens(restOfTokens));
        // case 'openBracket': return NODE.array(firstToken,  this.nodeFromTokens(restOfTokens));
        case 'openParen': return NODE.openParen(firstToken, this.nodeFromTokens(restOfTokens));
        default: debugger;
      }
    }

    // // if the first token is a key word with unary declarative meaning...
    // if (firstToken.type === 'word' && firstToken.name !== 'identifier') {
    //   const restOfTokens = tokens.slice(1);
    //   switch (firstToken.name) {
    //     case 'def':   return NODE.functionDef(firstToken, this.nodeFromTokens(restOfTokens));
    //     case 'proto': return NODE.protoDef(firstToken,    this.nodeFromTokens(restOfTokens));
    //     case 'set':   return NODE.propSet(firstToken,     this.nodeFromTokens(restOfTokens));
    //     default: break;
    //   }
    // }

    const secondToken  = tokens[1];
    const leftNode     = NODE.identity(firstToken);

    // if the second token is a binary operator...
    if (secondToken.type === 'operator') {
      const restOfTokens = _.where(tokens.slice(2), { line: secondToken.line });
      let builderFn;

      switch (secondToken.name) {
        // math
        case 'equals':   builderFn = NODE.assignment;     break;
        case 'plus':     builderFn = NODE.addition;       break;
        case 'minus':    builderFn = NODE.subtraction;    break;
        case 'star':     builderFn = NODE.multiplication; break;
        case 'slash':    builderFn = NODE.division;       break;
        case 'starStar': builderFn = NODE.exponent;       break;
        case 'modulo':   builderFn = NODE.modulo;         break;

        // dispatch
        case 'dot': builderFn = NODE.dispatch; break;

        // comparison
        case 'equalTo':
        case 'notEqualTo':
        case 'greaterThan':
        case 'greaterThanOrEqualTo':
        case 'lessThan':
        case 'lessThanOrEqualTo':
          builderFn = NODE.comparison; break;

        // boolean
        case 'and': builderFn = NODE.and; break;
        case 'or':  builderFn = NODE.or;  break;

        default: debugger;
      }

      return builderFn.call(NODE, secondToken, leftNode, this.nodeFromTokens(restOfTokens));
    }

    debugger;
  }

  newNode(nodeType, leftNode, rightNode) {
    return {
      type:  nodeType,
      left:  leftNode,
      right: rightNode,
    };
  }

  traverse(currentNode, currentTokenIndex = 0) {
    // const currentToken = this.tokenList[currentTokenIndex];
    // this.actionForToken(currentToken)
  }
}
