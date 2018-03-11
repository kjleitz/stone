import _ from 'underscore';

class Node {
  constructor(options) {
    this.token = options.token;
  }
}

class Identity extends Node {
  constructor(token) {
    super({ token });
  }
}

class Block extends Node {
  constructor(options) {
    super(options);
    this.nodes = options.nodes;
  }
}

class UnaryOperation extends Node {
  constructor(options) {
    super(options);
    this.leftNode  = null;
    this.rightNode = options.rightNode;
  }
}

class BinaryOperation extends Node {
  constructor(options) {
    super(options);
    this.leftNode  = options.leftNode;
    this.rightNode = options.rightNode;
  }

  // evaluate() {
  // }
}

class Assignment extends BinaryOperation {
  constructor(options) {
    super(options);
    this.leftNode  = new Identity(options.leftToken);
    this.rightNode = nodeForTokens(options.rightTokens);
  }
}

class Addition extends BinaryOperation {
  constructor(options) {
    super(options);
    foo = this.placeholder;
  }
}

class Subtraction extends BinaryOperation {
  constructor(options) {
    super(options);
    foo = this.placeholder;
  }
}

class ParenGroup extends Node {
  constructor(options) {
    super(options);
    this.groupNode = options.groupNode;
  }
}

class Syntaxer2 {
  constructor(options) {
    this.tokenList = options.tokenList;
  }

  detectOperation(tokens) {
    const firstToken  = tokens[0];
    const secondToken = tokens[1];

    switch (firstToken.name) {
      case 'unaryPlus':   return 'substantiation';
      case 'unaryMinus':  return 'negation';
      case 'openParen':   return 'parenGroup';
      case 'openBracket': return 'bracketGroup';
      case 'openBrace':   return 'braceGroup';
      default: break;
    }

    // need to search through the tokens for operators in PEMDAS order... this
    // doesn't, and it also assumes the left-hand side of the operation is a single
    // token. Needs to divide them at the operator. Maybe could make a "one line"
    // assumption for the left-hand set? What would happen then if you did, e.g.,
    //   [
    //     1,
    //     2
    //   ].sum() + 7

    switch (secondToken.name) {
      case 'equals':      return 'assignment';
      case 'plus':        return 'addition';
      case 'minus':       return 'subtraction';
      case 'openParen':   return 'functionCall';
      case 'openBracket': return 'arrayAccess';
      default: debugger;
    }

    return 'noOp'; // shouldn't happen... just here to satisfy ESLint for now.
  }

  nodeForAssignment(tokens) {
    const firstToken   = tokens[0];
    const token        = tokens[1];
    const restOfTokens = tokens.slice(2);
    const leftNode     = new Identity(firstToken);
    const rightNode    = this.nodeForTokensAndRest(restOfTokens);
    return new BinaryOperation({ token, leftNode, rightNode });
  }

  // Might want to pass in the previous node along with the rest of the tokens.
  // Then you could just pass that straight through as `leftNode`
  nodeForAddition(tokens) { //     `rest` to avoid unary +
    const plusIndex   = _.findIndex(_.rest(tokens), token => token.name === 'plus');
    const token       = tokens[plusIndex];
    const leftTokens  = _.first(tokens, plusIndex);
    const rightTokens = _.rest(tokens, plusIndex + 1);
    const leftNode    = this.nodeForTokensAndRest(leftTokens);
    const rightNode   = this.nodeForTokensAndRest(rightTokens);
    return new BinaryOperation({ token, leftNode, rightNode });
  }

  // see comment above `nodeForAddition`
  nodeForSubtraction(tokens) { //  `rest` to avoid unary -
    const minusIndex  = _.findIndex(_.rest(tokens), token => token.name === 'minus');
    const token       = tokens[minusIndex];
    const leftTokens  = _.first(tokens, minusIndex);
    const rightTokens = _.rest(tokens, minusIndex + 1);
    const leftNode    = this.nodeForTokensAndRest(leftTokens);
    const rightNode   = this.nodeForTokensAndRest(rightTokens);
    return new BinaryOperation({ token, leftNode, rightNode });
  }

  nodeForUnaryPlus(tokens) {
    const token       = _.first(tokens);
    const rightTokens = _.rest(tokens);
    const rightNode   = this.nodeForTokensAndRest(rightTokens);
    return new UnaryOperation({ token, rightNode });
  }

  nodeForUnaryMinus(tokens) {
    const token       = _.first(tokens);
    const rightTokens = _.rest(tokens);
    const rightNode   = this.nodeForTokensAndRest(rightTokens);
    return new UnaryOperation({ token, rightNode });
  }

  boundsOfFirstGroupInTokens(tokens, groupType) {
    const openIndex = _.findIndex(tokens, (token) => {
      switch (groupType) {
        case 'parens':   return token.name === 'openParen';
        case 'brackets': return token.name === 'openBracket';
        case 'braces':   return token.name === 'openBrace';
        default: throw 'Invalid group type given for bounds.'
      }
    });

    const openSymbolClosers = { '(': ')', '[': ']', '{': '}' };
    const openSymbols       = _.keys(openSymbolClosers);
    const openStack         = [];

    const closeIndex = _.findIndex(tokens.slice(openIndex), (token) => {
      if (token.type !== 'grouping') return false;

      if (_.contains(openSymbols, token.lexeme)) {
        openStack.push(token.lexeme);
      } else {
        const lastOpenSymbol = _.last(openStack);
        const correctCloser  = openSymbolClosers[lastOpenSymbol];
        if (token.lexeme !== correctCloser) throw `Grouping mismatch at L${token.line}/C${token.column}`;
        openStack.pop();
      }

      return openStack.length === 0;
    });

    return [openIndex, closeIndex];
  }

  nodeForParenGroup(tokens) {
    const [leftParenIndex, rightParenIndex] = this.boundsOfFirstGroupInTokens(tokens, 'parens');
    const token       = tokens[leftParenIndex];
    const groupTokens = tokens.slice(leftParenIndex + 1, rightParenIndex);
    // wrong; should either be the tokens within, or a node representing the expression/statement
    // within since IINM it should only be _one_ within parens.
    const groupNode   = this.nodeForTokensAndRest(groupTokens);
    return new ParenGroup({ token, groupNode });
  }

  nodeForTokensAndRest(tokens) {
    const operation = this.detectOperation(tokens);
    let node;
    switch (operation) {
      case 'assignment':  node = this.nodeForAssignment(tokens);  break;
      case 'addition':    node = this.nodeForAddition(tokens);    break;
      case 'subtraction': node = this.nodeForSubtraction(tokens); break;
      case 'unaryPlus':   node = this.nodeForUnaryPlus(tokens);   break;
      case 'unaryMinus':  node = this.nodeForUnaryMinus(tokens);  break;
      case 'parenGroup':  node = this.nodeForParenGroup(tokens);  break;
      default: debugger;
    }
    const restOfTokens = tokens.slice(node.tokenCount);
    return [node, restOfTokens];
  }

  traverse(tokens = this.tokenList, currentBlock = []) {
    if (_.isEmpty(tokens)) return currentBlock;
    const [node, restOfTokens] = this.nodeForTokensAndRest(tokens);
    currentBlock.push(node);
    return this.traverse(restOfTokens, currentBlock);
  }

  // traverse() {
  //   const mainBlock = new Block();
  //   _.each(this.tokenList, (token) => {

  //   });
  // }
}


// function nodeAndRestForTokens(tokens) {
//   if (tokens.length === 0) return [ null, [] ];
//   if (tokens.length === 1) return [ NODE.identity(tokens[0]), [] ];

//   const firstToken = tokens[0];

//   // if the first token is a unary operator...
//   if (firstToken.type === 'operator') {
//     const restOfTokens = tokens.slice(1);
//     switch (firstToken.name) {
//       case 'minus': return nodeAndRestForUnaryMinus(restOfTokens);
//       case 'plus':  return nodeAndRestForUnaryPlus(restOfTokens);
//       case 'not':   return nodeAndRestForUnaryNot(restOfTokens);
//       default: debugger;
//     }
//   }

//   // if the first token is an open grouping symbol...
//   if (firstToken.type === 'grouping') {
//     const restOfTokens = tokens.slice(1);
//     switch (firstToken.name) {
//       // case 'openBrace':   return NODE.object(firstToken, this.nodeFromTokens(restOfTokens));
//       // case 'openBracket': return NODE.array(firstToken,  this.nodeFromTokens(restOfTokens));
//       case 'openParen': return NODE.openParen(firstToken, this.nodeFromTokens(restOfTokens));
//       default: debugger;
//     }
//   }

//   // // if the first token is a key word with unary declarative meaning...
//   // if (firstToken.type === 'word' && firstToken.name !== 'identifier') {
//   //   const restOfTokens = tokens.slice(1);
//   //   switch (firstToken.name) {
//   //     case 'def':   return NODE.functionDef(firstToken, this.nodeFromTokens(restOfTokens));
//   //     case 'proto': return NODE.protoDef(firstToken,    this.nodeFromTokens(restOfTokens));
//   //     case 'set':   return NODE.propSet(firstToken,     this.nodeFromTokens(restOfTokens));
//   //     default: break;
//   //   }
//   // }

//   const secondToken  = tokens[1];
//   const leftNode     = NODE.identity(firstToken);

//   // if the second token is a binary operator...
//   if (secondToken.type === 'operator') {
//     const restOfTokens = _.where(tokens.slice(2), { line: secondToken.line });
//     let builderFn;

//     switch (secondToken.name) {
//       // math
//       case 'equals':   builderFn = NODE.assignment;     break;
//       case 'plus':     builderFn = NODE.addition;       break;
//       case 'minus':    builderFn = NODE.subtraction;    break;
//       case 'star':     builderFn = NODE.multiplication; break;
//       case 'slash':    builderFn = NODE.division;       break;
//       case 'starStar': builderFn = NODE.exponent;       break;
//       case 'modulo':   builderFn = NODE.modulo;         break;

//       // dispatch
//       case 'dot': builderFn = NODE.dispatch; break;

//       // comparison
//       case 'equalTo':
//       case 'notEqualTo':
//       case 'greaterThan':
//       case 'greaterThanOrEqualTo':
//       case 'lessThan':
//       case 'lessThanOrEqualTo':
//         builderFn = NODE.comparison; break;

//       // boolean
//       case 'and': builderFn = NODE.and; break;
//       case 'or':  builderFn = NODE.or;  break;

//       default: debugger;
//     }

//     return builderFn.call(NODE, secondToken, leftNode, this.nodeFromTokens(restOfTokens));
//   }

//   debugger;
// }

// function nodeForAssignment(leftToken, restOfTokens) {
//   let openParens  = 0;
//   let currentLine = leftToken.line;

//   const rightBound = _.findIndex(restOfTokens, (token) => {
//     // if there are open groups, keep going
//     if (token.name === 'openParen')  openParens++;
//     if (token.name === 'closeParen') openParens--;
//     if (openParens > 0) {
//       currentLine = token.line;
//       return false;
//     }

//     // groups are now closed... have we left the current line yet?
//     // if not, keep going.
//     if (token.line === currentLine) return false;

//     return true;
//   });

//   const rightTokens = _.first(restOfTokens, rightBound);

//   return new Assignment({ leftToken, rightTokens });
// }










// const VALIDATE = {
//   errorFor(operationName, lineNum, colNum) {
//     return () => {
//       throw `Invalid ${operationName} at L${lineNum}/C${colNum}`;
//     };
//   },

//   assignment(token, leftToken, rightToken) {
//     const throwError = this.errorFor('assignment', token.line, token.column);

//     if (token.name     !== 'equals')     throwError();
//     if (leftToken.name !== 'identifier') throwError();

//     const validRightTokenNames = [
//       'identifier',
//       'literal',
//       'if',
//       'false',
//       'minus', // need to define unary operators someplace
//       'not',
//       'null',
//       'this',
//       'true',
//       'super',
//       'openBrace',
//       'openBracket',
//       'openParen',
//       'Boolean',
//       'Null',
//       'Number',
//       'Object',
//       'String',
//     ];

//     if (!_.contains(validRightTokenNames, rightToken.name)) throwError()
//   },

//   addition(token, leftToken, rightToken) {
//     const throwError = this.errorFor('addition', token.line, token.column);

//     if (token.name !== 'plus') throwError();

//     const validLeftTokenNames = [
//       'identifier',
//       'literal',
//       'closeBrace',
//       'closeBracket',
//       'closeParen',
//     ];

//     const validRightTokenNames = [
//       'identifier',
//       'literal',
//       'minus', // unary
//       'plus',  // unary
//       'openBrace',
//       'openBracket',
//       'openParen',
//     ];

//     if (!_.contains(validLeftTokenNames,  leftToken.name))  throwError();
//     if (!_.contains(validRightTokenNames, rightToken.name)) throwError();
//   },
// };

// const NODE = {
//   new(operation, token, leftNode, rightNode) {
//     return { operation, token, leftNode, rightNode };
//   },

//   identity(token) {
//     return this.new('identity', token, null, null);
//   },

//   // unary operations

//   unaryPlus(token, rightNode) {
//     return this.new('substantiation', token, null, rightNode);
//   },

//   unaryMinus(token, rightNode) {
//     return this.new('negation', token, null, rightNode);
//   },

//   // binary operations

//   assignment(token, leftNode, rightNode) {
//     return this.new('assignment', token, leftNode, rightNode);
//   },

//   addition(token, leftNode, rightNode) {
//     return this.new('addition', token, leftNode, rightNode);
//   },

//   subtraction(token, leftNode, rightNode) {
//     return this.new('subtraction', token, leftNode, rightNode);
//   },

//   multiplication(token, leftNode, rightNode) {
//     return this.new('multiplication', token, leftNode, rightNode);
//   },

//   division(token, leftNode, rightNode) {
//     return this.new('division', token, leftNode, rightNode);
//   },

//   exponent(token, leftNode, rightNode) {
//     return this.new('exponent', token, leftNode, rightNode);
//   },

//   modulo(token, leftNode, rightNode) {
//     return this.new('modulo', token, leftNode, rightNode);
//   },

//   dispatch(token, leftNode, rightNode) {
//     return this.new('dispatch', token, leftNode, rightNode);
//   },

//   comparison(token, leftNode, rightNode) {
//     return this.new('comparison', token, leftNode, rightNode);
//   },

//   and(token, leftNode, rightNode) {
//     return this.new('and', token, leftNode, rightNode);
//   },

//   or(token, leftNode, rightNode) {
//     return this.new('or', token, leftNode, rightNode);
//   },
// };

// export default class Syntaxer {
//   constructor(options) {
//     this.tokenList      = options.tokenList;
//     this.syntaxTree     = {};
//     this.currentLineNum = 0;
//     this.currentColNum  = 0;
//   }

//   currentLine() {
//     return _.where(this.tokenList, { line: this.currentLineNum });
//   }

//   nodeFromTokens(tokens = this.tokenList) {
//     if (tokens.length === 0) return null;
//     if (tokens.length === 1) return NODE.identity(tokens[0]);

//     const firstToken = tokens[0];

//     // if the first token is a unary operator...
//     if (firstToken.type === 'operator') {
//       const restOfTokens = _.where(tokens.slice(1), { line: firstToken.line });
//       switch (firstToken.name) {
//         case 'minus': return NODE.unaryMinus(firstToken, this.nodeFromTokens(restOfTokens));
//         case 'plus':  return NODE.unaryPlus(firstToken,  this.nodeFromTokens(restOfTokens));
//         case 'not':   return NODE.unaryNot(firstToken,   this.nodeFromTokens(restOfTokens));
//         default: debugger;
//       }
//     }

//     // if the first token is an open grouping symbol...
//     if (firstToken.type === 'grouping') {
//       const restOfTokens = tokens.slice(1);
//       switch (firstToken.name) {
//         // case 'openBrace':   return NODE.object(firstToken, this.nodeFromTokens(restOfTokens));
//         // case 'openBracket': return NODE.array(firstToken,  this.nodeFromTokens(restOfTokens));
//         case 'openParen': return NODE.openParen(firstToken, this.nodeFromTokens(restOfTokens));
//         default: debugger;
//       }
//     }

//     // // if the first token is a key word with unary declarative meaning...
//     // if (firstToken.type === 'word' && firstToken.name !== 'identifier') {
//     //   const restOfTokens = tokens.slice(1);
//     //   switch (firstToken.name) {
//     //     case 'def':   return NODE.functionDef(firstToken, this.nodeFromTokens(restOfTokens));
//     //     case 'proto': return NODE.protoDef(firstToken,    this.nodeFromTokens(restOfTokens));
//     //     case 'set':   return NODE.propSet(firstToken,     this.nodeFromTokens(restOfTokens));
//     //     default: break;
//     //   }
//     // }

//     const secondToken  = tokens[1];
//     const leftNode     = NODE.identity(firstToken);
    
//     // if the second token is a binary operator...
//     if (secondToken.type === 'operator') {
//       const restOfTokens = _.where(tokens.slice(2), { line: secondToken.line });
//       let builderFn;

//       switch (secondToken.name) {
//         // math
//         case 'equals':   builderFn = NODE.assignment;     break;
//         case 'plus':     builderFn = NODE.addition;       break;
//         case 'minus':    builderFn = NODE.subtraction;    break;
//         case 'star':     builderFn = NODE.multiplication; break;
//         case 'slash':    builderFn = NODE.division;       break;
//         case 'starStar': builderFn = NODE.exponent;       break;
//         case 'modulo':   builderFn = NODE.modulo;         break;

//         // dispatch
//         case 'dot': builderFn = NODE.dispatch; break;

//         // comparison
//         case 'equalTo':
//         case 'notEqualTo':
//         case 'greaterThan':
//         case 'greaterThanOrEqualTo':
//         case 'lessThan':
//         case 'lessThanOrEqualTo':
//           builderFn = NODE.comparison; break;

//         // boolean
//         case 'and': builderFn = NODE.and; break;
//         case 'or':  builderFn = NODE.or;  break;

//         default: debugger;
//       }

//       return builderFn.call(NODE, secondToken, leftNode, this.nodeFromTokens(restOfTokens));
//     }

//     debugger;
//   }

//   newNode(nodeType, leftNode, rightNode) {
//     return {
//       type:  nodeType,
//       left:  leftNode,
//       right: rightNode,
//     };
//   }

//   traverse(currentNode, currentTokenIndex = 0) {
//     // const currentToken = this.tokenList[currentTokenIndex];
//     // this.actionForToken(currentToken)
//   }
// }
