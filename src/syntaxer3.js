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

  assignmentNodeAndRest(tokens) {
    const [firstToken, token, ...restOfTokens] = tokens;
    const leftNode = new Identity(firstToken);
    const [rightNode, ...restOfNodes] = this.nodesForTokens(restOfTokens);

    return [
      new BinaryOperation({ token, leftNode, rightNode }),
      restOfNodes,
    ];
  }

  pemdasNodeAndRest(tokens) {
    const firstStatement = this.firstStatementFrom(tokens);
    const parensBounds   = this.boundsOfFirstGroupInTokens(firstStatement, 'parens');
    if (!_.isEmpty(parensBounds)) return this.parenGroupNodeAndRest(tokens);
    const 
  }

  // Might want to pass in the previous node along with the rest of the tokens.
  // Then you could just pass that straight through as `leftNode`
  additionNodeAndRest(tokens) { //     `rest` to avoid unary +
    const plusIndex   = _.findIndex(_.rest(tokens), token => token.name === 'plus');
    const token       = tokens[plusIndex];
    const leftTokens  = _.first(tokens, plusIndex);
    const rightTokens = _.rest(tokens, plusIndex + 1);
    const leftNode    = this.nodeForTokensAndRest(leftTokens);
    const rightNode   = this.nodeForTokensAndRest(rightTokens);
    return new BinaryOperation({ token, leftNode, rightNode });
  }

  // see comment above `nodeForAddition`
  subtractionNodeAndRest(tokens) { //  `rest` to avoid unary -
    const minusIndex  = _.findIndex(_.rest(tokens), token => token.name === 'minus');
    const token       = tokens[minusIndex];
    const leftTokens  = _.first(tokens, minusIndex);
    const rightTokens = _.rest(tokens, minusIndex + 1);
    const leftNode    = this.nodeForTokensAndRest(leftTokens);
    const rightNode   = this.nodeForTokensAndRest(rightTokens);
    return new BinaryOperation({ token, leftNode, rightNode });
  }

  unaryPlusNodeAndRest(tokens) {
    const token       = _.first(tokens);
    const rightTokens = _.rest(tokens);
    const rightNode   = this.nodeForTokensAndRest(rightTokens);
    return new UnaryOperation({ token, rightNode });
  }

  unaryMinusNodeAndRest(tokens) {
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

    if (openIndex === -1) return [];

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

    if (closeIndex === -1) throw `Unmatched group symbol at ${openIndex}`;
    return [openIndex, closeIndex];
  }

  parenGroupNodeAndRest(tokens) {
    const [leftParenIndex, rightParenIndex] = this.boundsOfFirstGroupInTokens(tokens, 'parens');
    const token       = tokens[leftParenIndex];
    const groupTokens = tokens.slice(leftParenIndex + 1, rightParenIndex);
    // wrong; should either be the tokens within, or a node representing the expression/statement
    // within since IINM it should only be _one_ within parens.
    const groupNode   = this.nodeForTokensAndRest(groupTokens);
    return new ParenGroup({ token, groupNode });
  }

  nodesForTokens(tokens) {
    const operation = this.detectOperation(tokens);
    let nodeAndRest;
    switch (operation) {
      case 'assignment':  nodeAndRest = this.assignmentNodeAndRest(tokens);  break;
      case 'addition':    nodeAndRest = this.additionNodeAndRest(tokens);    break;
      case 'subtraction': nodeAndRest = this.subtractionNodeAndRest(tokens); break;
      case 'unaryPlus':   nodeAndRest = this.unaryPlusNodeAndRest(tokens);   break;
      case 'unaryMinus':  nodeAndRest = this.unaryMinusNodeAndRest(tokens);  break;
      case 'parenGroup':  nodeAndRest = this.parenGroupNodeAndRest(tokens);  break;
      default: debugger;
    }
    const [node, restOfTokens] = nodeAndRest;
    return [node, ...this.nodesForTokens(restOfTokens)];
  }

  traverse(tokens = this.tokenList, currentBlock = []) {
    if (_.isEmpty(tokens)) return currentBlock;
    const [node, restOfTokens] = this.nodeForTokensAndRest(tokens);
    currentBlock.push(node);
    return this.traverse(restOfTokens, currentBlock);
  }
}
