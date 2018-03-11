import _ from 'underscore';

class Syntaxer4 {
  constructor(options) {
    this.tokenList = options.tokenList;
  }

  hasGroupingSymbols(tokens) {
    return _.any(tokens, token => token.type === 'grouping');
  }

  isGroup(tokens) {
    const openToken  = _.first(tokens);
    const closeToken = _.last(tokens);
    return this.openTokenMatchesCloser(openToken, closeToken);
  }

  isOpenGroupToken(token) {
    if (token.type !== 'grouping') return false;
    return _.contains(['openParen', 'openBracket', 'openBrace'], token.name);
  }

  isCloseGroupToken(token) {
    if (token.type !== 'grouping') return false;
    return _.contains(['openParen', 'openBracket', 'openBrace'], token.name);
  }

  openTokenMatchesCloser(openToken, closeToken) {
    if (openToken.type !== 'grouping' || closeToken.type !== 'grouping') return false;
    const validCloserFor = { '(': ')', '[': ']', '{': '}' };
    const validOpeners   = _.keys(validCloserFor);
    const openerIsValid  = _.contains(validOpeners, openToken.lexeme);
    const closerIsValid  = closeToken.lexeme === validCloserFor[openToken.lexeme];
    return openerIsValid && closerIsValid;
  }

  // Given a set of tokens, returns true if the tokens follow valid grouping rules (all open
  // grouping symbols are properly matched with closing symbols, or there are no groups), or
  // false if a group is not closed properly. Throws an error for orphaned closing symbols.
  hasBalancedGrouping(tokens) {
    const openStack = [];
    _.each(tokens, (token) => {
      if (token.type !== 'grouping') return;

      if (this.isOpenGroupToken(token)) {
        return openStack.push(token);
      }

      if (this.openTokenMatchesCloser(_.last(openStack), token)) {
        return openStack.pop();
      }

      throw `Grouping mismatch at L${token.line}/C${token.column}`;
    });

    return _.isEmpty(openStack);
  }

  boundsOfAllGroupsInTokens(tokens, boundsPairs = []) {
    if (_.isEmpty(tokens)) return boundsPairs;

    const boundsOfFirstGroup = this.boundsOfFirstGroupInTokens(tokens);
    if (_.isEmpty(boundsOfFirstGroup)) return boundsPairs;

    boundsPairs.push(boundsOfFirstGroup);
    const closeIndex   = _.last(boundsOfFirstGroup);
    const restOfTokens = _.rest(tokens, closeIndex + 1);
    return this.boundsOfAllGroupsInTokens(tokens, boundsPairs)
  }

  indexOfBinaryOperation(operationName, tokens, { validLeftTypes, validRightTypes }) {
    const operatorNames = {
      assignment:             ['equals'],
      logicalOR:              ['or'],
      logicalAND:             ['and'],
      equalityComparison:     ['equalTo', 'notEqualTo'],
      differentialComparison: ['greaterThan', 'greaterThanOrEqualTo', 'lessThan', 'lessThanOrEqualTo'],
      subtraction:            ['minus'],
      addition:               ['plus'],
      division:               ['slash'],
      multiplication:         ['star'],
      exponentiation:         ['starStar'],
    }[operationName]

    if (_.isEmpty(operatorNames)) throw `Invalid operation type '${operationName}'`;

    const groupBoundsPairs = this.boundsOfAllGroupsInTokens(tokens);
    const groupsArePresent = !_.isEmpty(groupBoundsPairs);

    return _.findIndex(tokens, (token, index) => {
      const isInsideGroup = groupsArePresent && _.any(groupBoundsPairs, (bounds) => {
        return index > bounds[0] && index < bounds[1];
      });

      if (isInsideGroup || !_.contains(operatorNames, token.name)) return false;

      const leftToken = tokens[index - 1];
      if (_.isUndefined(leftToken)) return false;

      const rightToken = tokens[index + 1];
      if (_.isUndefined(rightToken)) return false;

      const leftIsValid = (
        _.contains(validLeftTypes, leftToken.type) ||
        leftToken.name === 'identifier'            ||
        this.isCloseGroupToken(leftToken)
      );
      if (!leftIsValid) return false;

      const rightIsValid = (
        _.contains(validRightTypes, rightToken.type) ||
        rightToken.name === 'identifier'             ||
        this.isOpenGroupToken(rightToken)
      );
      return leftIsValid && rightIsValid;
    });
  }

  indexOfComparisonOperation(operationName, tokens) {
    const validLeftTypes  = ['word', 'string', 'number'];
    const validRightTypes = ['word', 'string', 'number', 'operator'];
    return this.indexOfBinaryOperation(operatorName, tokens, { validLeftTypes, validRightTypes });
  }

  indexOfAssignment(tokens) {
    const validLeftTypes  = ['word'];
    const validRightTypes = ['word', 'number', 'string', 'operator'];
    return this.indexOfBinaryOperation('assignment', tokens, { validLeftTypes, validRightTypes });
  }

  indexOfLogicalOR(tokens) {
    return this.indexOfComparisonOperation('logicalOR', tokens);
  }

  indexOfLogicalAND(tokens) {
    return this.indexOfComparisonOperation('logicalAND', tokens);
  }

  indexOfEqualityComparison(tokens) {
    return this.indexOfComparisonOperation('equalityComparison', tokens);
  }

  indexOfDifferentialComparison(tokens) {
    return this.indexOfComparisonOperation('differentialComparison', tokens);
  }

  indexOfSubtraction(tokens) {
    const validLeftTypes  = ['word', 'number', 'string'];
    const validRightTypes = ['word', 'number', 'string', 'operator'];
    return this.indexOfBinaryOperation('subtraction', tokens, { validLeftTypes, validRightTypes });
  }

  indexOfAddition(tokens) {
    const validLeftTypes  = ['word', 'number', 'string'];
    const validRightTypes = ['word', 'number', 'string', 'operator'];
    return this.indexOfBinaryOperation('addition', tokens, { validLeftTypes, validRightTypes });
  }

  indexOfDivision(tokens) {
    const validLeftTypes  = ['word', 'number'];
    const validRightTypes = ['word', 'number', 'operator'];
    return this.indexOfBinaryOperation('division', tokens, { validLeftTypes, validRightTypes });
  }

  indexOfMultiplication(tokens) {
    const validLeftTypes  = ['word', 'number', 'string'];
    const validRightTypes = ['word', 'number', 'operator'];
    return this.indexOfBinaryOperation('multiplication', tokens, { validLeftTypes, validRightTypes });
  }

  indexOfExponentiation(tokens) {
    const validLeftTypes  = ['word', 'number'];
    const validRightTypes = ['word', 'number', 'operator'];
    return this.indexOfBinaryOperation('exponentiation', tokens, { validLeftTypes, validRightTypes });
  }

  // Given a set of tokens, returns the indices of the first open grouping symbol and its
  // matching closing symbol... essentially the beginning and end of the first group. Returns
  // an array: [] if there are no groups, or [openSymbolIndex, closeSymbolIndex] otherwise.
  // It will throw an error if there is no matching closing symbol for an open group.
  boundsOfFirstGroupInTokens(tokens) {
    const openIndex = _.findIndex(tokens, token => this.isOpenGroupToken(token));
    if (openIndex < 0) return [];

    const openStack = [];
    const closeIndex = _.findIndex(tokens.slice(openIndex), (token) => {
      if (token.type !== 'grouping') return false;

      if (this.isOpenGroupToken(token)) {
        openStack.push(token);
        return false;
      }

      if (this.openTokenMatchesCloser(_.last(openStack), token)) {
        openStack.pop();
        return _.isEmpty(openStack);
      }

      const position = `L${token.line}/C${token.column}`;
      throw `Unmatched ${token.name} at ${position}`;
    });

    if (closeIndex < 0) {
      const openToken = tokens[openIndex];
      const position  = `L${token.line}/C${token.column}`;
      throw `Unmatched ${openToken.name} at ${position}`;
    }

    return [openIndex, closeIndex];
  }

  // Given a set of tokens, returns the tokens up to the end of the first line (or spanning
  // multiple lines if there are grouping symbols), to the end of the contiguous "statement".
  // Does not include the block of a function/proto definition, etc., as blocks are multiple
  // statements, so I'm just gonna treat the definition statement as a single entity for now
  // and validate/construct the definition block somewhere else.
  // EDIT: ...SLASH TODO: CONSIDER SURROUNDING FUNCTION DEFS W/ CURLY BRACES MAYBE
  firstStatementFromTokens(tokens) {
    if (_.isEmpty(tokens)) return [];

    const statementEndPos = _.findIndex(tokens, (currentToken, index) => {
      const nextToken = tokens[index + 1];
      if (_.isUndefined(nextToken)) return true;

      if (nextToken.line !== currentToken.line) {
        const currentTokens = _.first(tokens, index + 1);
        return this.hasBalancedGrouping(currentTokens);
      }

      return false;
    });

    return _.first(tokens, statementEndPos + 1);
  }

  unaryOperationNode(operationName, tokens) {
    const operatorToken = _.first(tokens);
    const rightTokens   = _.rest(tokens);

    if (!_.contains(['plus', 'minus', 'not'], operatorToken.name)) {
      const position = `L${operatorToken.line}/C${operatorToken.column}`;
      throw `Expected to find ${operationName} at ${position}`;
    }

    return {
      operation: operationName,
      token:     token,
      rightNode: this.pemdasTreeFromStatement(rightTokens),
    };
  }

  binaryOperationNode(operationName, operatorIndex, tokens) {
    const tokenNames = {
      subtraction:    ['minus'],
      addition:       ['plus'],
      division:       ['slash'],
      multiplication: ['star'],
      exponentiation: ['starStar'],
      assignment:     ['equals'],
      comparison: [
        'equalTo',
        'greaterThan',
        'greaterThanOrEqualTo',
        'lessThan',
        'lessThanOrEqualTo',
        'notEqualTo',
      ],
      boolean: [
        'and',
        'or',
      ],
    }[operationName];

    const operatorToken = tokens[operatorIndex];
    const operatorPos   = `L${operatorToken.line}/C${operatorToken.column}`;
    if (!_.contains(tokenNames, operatorToken.name)) {
      throw `Expected to find ${operationName} at ${operatorPos}`;
    }

    const leftTokens = _.first(tokens, operatorIndex);
    if (_.isEmpty(leftTokens)) {
      throw `Found no left-hand-side for ${operationName} at ${operatorPos}`;
    }

    const rightTokens = tokens.slice(operatorIndex + 1);
    if (_.isEmpty(rightTokens)) {
      throw `Found no right-hand-side for ${operationName} at ${operatorPos}`;
    }

    return {
      operation: operationName,
      token:     operatorToken,
      leftNode:  this.pemdasTreeFromStatement(leftTokens),
      rightNode: this.pemdasTreeFromStatement(rightTokens),
    };
  }

  groupNode(operationName, tokens) {
    const correctOpenTokenName = {
      parenGroup:   'openParen',
      bracketGroup: 'openBracket',
      braceGroup:   'openBrace',
    }[operationName]

    const openToken = _.first(tokens);

    if (openToken.name !== correctOpenTokenName) {
      const position = `L${openToken.line}/C${openToken.column}`;
      throw `Expected to find ${operationName} opening symbol at ${position}`;
    }

    const closeToken = _.last(tokens);

    if (!this.openTokenMatchesCloser(openToken, closeToken)) {
      const position = `L${closeToken.line}/C${closeToken.column}`;
      throw `Expected to find ${operationName} closing symbol at ${position}`;
    }

    const innerTokens = tokens.slice(1, -1);

    return {
      operation:  operationName,
      openToken:  openToken,
      closeToken: closeToken,
      innerNode:  this.pemdasTreeFromStatement(innerTokens),
    };
  }

  pemdasTreeFromStatement(statementTokens) {
    if (_.isEmpty(statementTokens)) {
      return null;
    }

    const indexOfAssignment = this.indexOfAssignment(statementTokens);
    if (indexOfAssignment !== -1) {
      return this.binaryOperationNode('assignment', indexOfAssignment, statementTokens);
    }

    const indexOfLogicalOR = this.indexOfLogicalOR(statementTokens);
    if (indexOfLogicalOR !== -1) {
      return this.binaryOperationNode('boolean', indexOfLogicalOR, statementTokens);
    }

    const indexOfLogicalAND = this.indexOfLogicalAND(statementTokens);
    if (indexOfLogicalAND !== -1) {
      return this.binaryOperationNode('boolean', indexOfLogicalAND, statementTokens);
    }

    const indexOfEqualityComparison = this.indexOfEqualityComparison(statementTokens);
    if (indexOfEqualityComparison !== -1) {
      return this.binaryOperationNode('comparison', indexOfEqualityComparison, statementTokens);
    }

    const indexOfDifferentialComparison = this.indexOfDifferentialComparison(statementTokens);
    if (indexOfDifferentialComparison !== -1) {
      return this.binaryOperationNode('comparison', indexOfDifferentialComparison, statementTokens);
    }

    const indexOfSubtraction = this.indexOfSubtraction(statementTokens);
    if (indexOfSubtraction !== -1) {
      return this.binaryOperationNode('subtraction', indexOfSubtraction, statementTokens);
    }

    const indexOfAddition = this.indexOfAddition(statementTokens);
    if (indexOfAddition !== -1) {
      return this.binaryOperationNode('addition', indexOfAddition, statementTokens);
    }

    const indexOfDivision = this.indexOfDivision(statementTokens);
    if (indexOfDivision !== -1) {
      return this.binaryOperationNode('division', indexOfDivision, statementTokens);
    }

    const indexOfMultiplication = this.indexOfMultiplication(statementTokens);
    if (indexOfMultiplication !== -1) {
      return this.binaryOperationNode('multiplication', indexOfMultiplication, statementTokens);
    }

    const indexOfExponentiation = this.indexOfExponentiation(statementTokens);
    if (indexOfExponentiation !== -1) {
      return this.binaryOperationNode('exponentiation', indexOfExponentiation, statementTokens);
    }

    const firstToken = _.first(statementTokens);

    if (firstToken.name === 'minus') {
      return this.unaryOperationNode('negation', statementTokens);
    }

    if (firstToken.name === 'plus') {
      return this.unaryOperationNode('substantiation', statementTokens);
    }

    if (firstToken.name === 'not') {
      return this.unaryOperationNode('inversion', statementTokens);
    }

    if (this.isOpenGroupToken(firstToken)) {
      const groupOperation = {
        openParen:   'parenGroup',
        openBracket: 'bracketGroup',
        openBrace:   'braceGroup',
      }[firstToken.name];

      return this.groupNode(groupOperation, statementTokens);
    }

    const lastToken = _.last(statementTokens);
    const startPos  = `L${firstToken.line}/C${firstToken.column}`;
    const endPos    = `L${lastToken.line}/C${lastToken.column}`;
    throw `Unrecognized statement between ${startPos} and ${endPos}`;
  }

  traverse(tokens = this.tokenList, nodes = []) {
    if (_.isEmpty(tokens)) return nodes;
    const firstStatement = this.firstStatementFromTokens(tokens);
    const firstNode      = this.pemdasTreeFromStatement(firstStatement);
    nodes.push(firstNode);
    const restOfTokens   = tokens.slice(firstStatement.length);
    return this.traverse(restOfTokens, nodes);
  }
}
