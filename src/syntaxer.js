import _ from 'underscore';

export default class Syntaxer {
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

  // Given a set of tokens, returns the indices of the first open grouping symbol and its
  // matching closing symbol... essentially the beginning and end of the first group. Returns
  // an array: [] if there are no groups, or [openSymbolIndex, closeSymbolIndex] otherwise.
  // It will throw an error if there is no matching closing symbol for an open group.
  boundsOfFirstGroupInTokens(tokens) {
    const openIndex = _.findIndex(tokens, token => this.isOpenGroupToken(token));
    if (openIndex < 0) return [];

    const openStack = [];
    const closeIndex = openIndex + _.findIndex(tokens.slice(openIndex), (token) => {
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

  boundsOfAllGroupsInTokens(tokens, boundsPairs = []) {
    if (_.isEmpty(tokens)) return boundsPairs;

    const boundsOfFirstGroup = this.boundsOfFirstGroupInTokens(tokens);
    if (_.isEmpty(boundsOfFirstGroup)) return boundsPairs;

    boundsPairs.push(boundsOfFirstGroup);
    const closeIndex   = boundsOfFirstGroup[1];
    const restOfTokens = tokens.slice(closeIndex + 1);
    return this.boundsOfAllGroupsInTokens(restOfTokens, boundsPairs);
  }

  indexOfFirstFunctionColon(tokens) {
    return _.findIndex(tokens, (token, index) => {
      if (token.name !== 'colon')          return false;

      // regular function definitions MUST provide an argument group to the left
      // of the colon, and prop setter functions MUST provide a prop name to the
      // left of the colon, so if nothing's to the left, it's not a function
      const leftToken = tokens[index - 1];
      if (_.isUndefined(leftToken))        return false;

      // for regular function definitions, e.g.,
      //   def foo(a, b):Str "#{a} foos #{b}!"   # hoisted, returns a string
      //   foo = (a, b):Str "#{a}#{b}"           # not hoisted, returns a string
      //   foo = (a, b): console.log(a, b)       # not hoisted, returns null
      //   foo = (a, b):                         # not hoisted, returns null, no-op is valid

      // if it provides an argument group before the colon, it's valid, and it
      // allows anything to follow (no-op is also valid)
      if (leftToken.name === 'closeParen') return true;

      // for prop setter definitions within proto shape body, e.g.,
      //   breed:Str set "#{breed} is da best!"  # explicit setter; prop name is passed as implicit argument
      //   breed:Str "husky"                     # defaults to 'husky'; short for breed:Str set breed || "husky"
      //   breed:Str                             # defaults to ''; short for breed:Str set breed

      // prop setter definitions MUST provide a non-null return type to the
      // right of the colon
      const rightToken = tokens[index + 1];
      if (_.isUndefined(rightToken))      return false;
      if (rightToken.type !== 'word')     return false;

      // the return type must be DIRECTLY after the colon (in hashes there MUST
      // be a space after the colon, to differentiate them from return types)
      const spacesAfterColon = rightToken.column - token.column - 1;
      return spacesAfterColon === 0;
    });
  }

  boundsOfFirstFunctionDefinitionInTokens(tokens) {
    const colonIndex = this.indexOfFirstFunctionColon(tokens);
    if (colonIndex < 0) return [];

    const colonToken        = tokens[colonIndex];
    const tokensBeforeColon = _.first(tokens, colonIndex);
    const functionIsRegular = _.last(tokensBeforeColon).name === 'closeParen';
    const argGroupOpenIndex = _.findLastIndex(tokensBeforeColon, (token, index) => {
      if (!functionIsRegular)         return true;
      if (token.name !== 'openParen') return false;

      const currentTokens = tokensBeforeColon.slice(index, colonIndex);
      return this.hasBalancedGrouping(currentTokens);
    });

    const tokensBeforeArgs     = _.first(tokensBeforeColon, argGroupOpenIndex);
    const tokenRightBeforeArgs = _.last(tokensBeforeArgs);
    const functionIsAnonymous  = _.isUndefined(tokenRightBeforeArgs) || tokenRightBeforeArgs.name !== 'identifier';

    if (functionIsAnonymous && !functionIsRegular) {
      const position   = `L${colonToken.line}/C${colonToken.column}`;
      throw `Prop setter functions cannot be anonymous; error at ${position}`;
    }

    if (functionIsAnonymous && tokenRightBeforeArgs && tokenRightBeforeArgs.name === 'def') {
      const position   = `L${colonToken.line}/C${colonToken.column}`;
      throw `Function declarations must be named; error at ${position}`;
    }

    const nameIndex     = argGroupOpenIndex - 1;
    const defIndex      = argGroupOpenIndex - 2;
    const defToken      = tokens[defIndex];
    const isDeclaration = defToken && defToken.name === 'def';

    const startIndex    = functionIsAnonymous ? argGroupOpenIndex : isDeclaration ? defIndex : nameIndex;
    const endIndex      = _.findIndex(tokens, (currentToken, index) => {
      if (index <= colonIndex)                      return false;

      const nextToken = tokens[index + 1];
      if (_.isUndefined(nextToken))                 return true;
      if (nextToken.line === currentToken.line)     return false;

      const currentTokens = _.first(tokens, index + 1);
      if (!this.hasBalancedGrouping(currentTokens)) return false;
      if (nextToken.indent > colonToken.indent)     return false;

      return true;
    });

    if (endIndex < 0) {
      const startToken = tokens[startIndex];
      const position   = `L${startToken.line}/C${startToken.column}`;
      throw `Could not close function starting at ${position}`;
    }

    return [startIndex, endIndex];
  }

  boundsOfAllFunctionDefinitionsInTokens(tokens, boundsPairs = []) {
    if (_.isEmpty(tokens)) return boundsPairs;

    const boundsOfFirstFn = this.boundsOfFirstFunctionDefinitionInTokens(tokens);
    if (_.isEmpty(boundsOfFirstFn)) return boundsPairs;

    boundsPairs.push(boundsOfFirstFn);
    const closeIndex   = boundsOfFirstFn[1];
    const restOfTokens = tokens.slice(closeIndex + 1);
    return this.boundsOfAllGroupsInTokens(restOfTokens, boundsPairs);
  }

  indexOfBinaryOperation(operationName, tokens, { validLeftTypes, validRightTypes }) {
    const operatorNames = {
      assignment:             ['equals'],
      sequence:               ['comma'],
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
    const fnDefBoundsPairs = this.boundsOfAllFunctionDefinitionsInTokens(tokens);
    const groupsArePresent = !_.isEmpty(groupBoundsPairs);
    const fnDefsArePresent = !_.isEmpty(fnDefBoundsPairs);

    return _.findIndex(tokens, (token, index) => {
      if (!_.contains(operatorNames, token.name)) return false;

      const isInsideGroup = groupsArePresent && _.any(groupBoundsPairs, (bounds) => {
        return index > bounds[0] && index < bounds[1];
      });
      if (isInsideGroup)                          return false;

      const isInsideFunctionDefinition = fnDefsArePresent && _.any(fnDefBoundsPairs, (bounds) => {
        return index > bounds[0] && index < bounds[1];
      });
      if (isInsideFunctionDefinition)             return false;

      const leftToken = tokens[index - 1];
      if (_.isUndefined(leftToken))               return false;

      const rightToken = tokens[index + 1];
      if (_.isUndefined(rightToken))              return false;

      const leftIsValid = (
        _.contains(validLeftTypes, leftToken.type) ||
        leftToken.name === 'identifier'            ||
        this.isCloseGroupToken(leftToken)
      );
      if (!leftIsValid)                           return false;

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
    return this.indexOfBinaryOperation(operationName, tokens, { validLeftTypes, validRightTypes });
  }

  indexOfAssignment(tokens) {
    const validLeftTypes  = ['word'];
    const validRightTypes = ['word', 'number', 'string', 'operator'];
    return this.indexOfBinaryOperation('assignment', tokens, { validLeftTypes, validRightTypes });
  }

  indexOfSequence(tokens) {
    const validLeftTypes  = ['word', 'string', 'number'];
    const validRightTypes = ['word', 'string', 'number', 'operator'];
    return this.indexOfBinaryOperation('sequence', tokens, { validLeftTypes, validRightTypes });
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

  // Given a set of tokens, returns the tokens up to the end of the first line (or spanning
  // multiple lines if there are grouping symbols), to the end of the contiguous "statement".
  // Does not include the block of a function/proto definition, etc., as blocks are multiple
  // statements, so I'm just gonna treat the definition statement as a single entity for now
  // and validate/construct the definition block somewhere else.
  // EDIT: ...SLASH TODO: CONSIDER SURROUNDING FUNCTION DEFS W/ CURLY BRACES MAYBE
  firstStatementFromTokens(tokens) {
    if (_.isEmpty(tokens)) return [];

    const groupBoundsPairs = this.boundsOfAllGroupsInTokens(tokens);
    const fnDefBoundsPairs = this.boundsOfAllFunctionDefinitionsInTokens(tokens);
    const groupsArePresent = !_.isEmpty(groupBoundsPairs);
    const fnDefsArePresent = !_.isEmpty(fnDefBoundsPairs);

    const statementEndPos = _.findIndex(tokens, (currentToken, index) => {
      const nextToken = tokens[index + 1];
      if (_.isUndefined(nextToken))             return true;

      const isInsideGroup = groupsArePresent && _.any(groupBoundsPairs, (bounds) => {
        return index > bounds[0] && index < bounds[1];
      });
      if (isInsideGroup)                        return false;

      const isInsideFunctionDefinition = fnDefsArePresent && _.any(fnDefBoundsPairs, (bounds) => {
        return index > bounds[0] && index < bounds[1];
      });
      if (isInsideFunctionDefinition)           return false;

      if (nextToken.line === currentToken.line) return false;

      const currentTokens = _.first(tokens, index + 1);
      return this.hasBalancedGrouping(currentTokens);
    });

    return _.first(tokens, statementEndPos + 1);
  }

  identityNode(token) {
    const validIdentityTypes = ['word', 'string', 'number'];
    if (!_.contains(validIdentityTypes, token.type)) {
      const position = `L${token.line}/C${token.column}`;
      throw `Expected to find valid identity token at ${position}`;
    }

    return {
      operation: 'identity',
      token:     token,
    };
  }

  unaryOperationNode(operationName, tokens) {
    const operatorToken = _.first(tokens);
    const rightTokens   = _.rest(tokens);

    const validUnaryOperatorNames = ['plus', 'minus', 'not'];
    if (!_.contains(validUnaryOperatorNames, operatorToken.name)) {
      const position = `L${operatorToken.line}/C${operatorToken.column}`;
      throw `Expected to find ${operationName} at ${position}`;
    }

    return {
      operation: operationName,
      token:     operatorToken,
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

  sequenceNode(firstCommaIndex, tokens) {
    const firstComma = tokens[firstCommaIndex];
    if (firstComma.name !== 'comma') {
      const position = `L${firstComma.line}/C${firstComma.column}`;
      throw `Expected to find comma at ${position}`;
    }

    const sequenceSets = _.reduce(tokens, (sets, token) => {
      if (token.name === 'comma') {
        sets.push([]);
      } else {
        _.last(sets).push(token);
      }

      return sets;
    }, [[]]);

    const sequenceNodes = _.map(sequenceSets, set => this.pemdasTreeFromStatement(set));

    return {
      operation:     'sequence',
      startToken:    _.first(tokens),
      endToken:      _.last(tokens),
      sequenceNodes: sequenceNodes,
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

  functionDefinitionNode(boundsOfDef, tokens) {
    const firstToken  = tokens[0];
    const secondToken = tokens[1];

    if (boundsOfDef[0] !== 0) {
      const position = `L${firstToken.line}/C${firstToken.column}`;
      throw `Expected function definition at ${position}`;
    }

    const colonIndex          = this.indexOfFirstFunctionColon(tokens);
    const colonToken          = tokens[colonIndex];
    const twoTokensToTheLeft  = tokens[colonIndex - 2];
    const oneTokenToTheLeft   = tokens[colonIndex - 1];
    const oneTokenToTheRight  = tokens[colonIndex + 1];
    const twoTokensToTheRight = tokens[colonIndex + 2];

    const hasArguments  = oneTokenToTheLeft.name === 'closeParen';
    const isPropSetter  = oneTokenToTheLeft.name === 'identifier' && twoTokensToTheRight.name === 'set';
    const isPropDefault = oneTokenToTheLeft.name === 'identifier' && twoTokensToTheRight.name !== 'set';
    const isDeclaration = firstToken.name        === 'def';
    const isAnonymous   = firstToken.name        === 'openParen';

    const spacesAfterColon = oneTokenToTheRight ? oneTokenToTheRight.column - colonToken.column - 1 : 999;
    const isTyped          = oneTokenToTheRight.type === 'word' && spacesAfterColon === 0;
    const typeToken        = isTyped ? oneTokenToTheRight : null;
    const nameToken        = isDeclaration ? secondToken : isPropSetter ? firstToken : null;

    const boundsOfArgs    = hasArguments ? this.boundsOfFirstGroupInTokens(tokens) : [];
    const argumentsTokens = _.isEmpty(boundsOfArgs) ? [] : tokens.slice(boundsOfArgs[0] + 1, boundsOfArgs[1]);

    const blockStartIndex = colonIndex + _.filter([isTyped, isPropSetter]).length + 1;
    const blockTokens     = tokens.slice(blockStartIndex);

    return {
      operationName: 'functionDefinition',
      isDeclaration,
      isPropSetter,
      isPropDefault,
      nameToken,
      typeToken,
      argumentsNode: this.pemdasTreeFromStatement(argumentsTokens),
      blockNodes:    this.traverse(blockTokens),
    };
  }

  pemdasTreeFromStatement(statementTokens) {
    if (_.isEmpty(statementTokens)) {
      return null;
    }

    if (statementTokens.length === 1) {
      return this.identityNode(statementTokens[0]);
    }

    const indexOfSequence = this.indexOfSequence(statementTokens);
    if (indexOfSequence !== -1) {
      return this.sequenceNode(indexOfSequence, statementTokens);
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

    const boundsOfFirstFn = this.boundsOfFirstFunctionDefinitionInTokens(statementTokens);
    if (boundsOfFirstFn[0] === 0) {
      return this.functionDefinitionNode(boundsOfFirstFn, statementTokens);
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
