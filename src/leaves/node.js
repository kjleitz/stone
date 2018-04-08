import _               from 'underscore';
import Syntaxer        from '../build/syntaxer';
import TokenParser     from '../parse/token_parser';
import TokenUtil       from '../utils/token_util';
import { SyntaxError } from '../errors/errors';

class Node {
  static identity(token) {
    const validTypes = ['word', 'string', 'number', 'regex'];
    if (!_.contains(validTypes, token.type)) {
      throw SyntaxError.at(token, 'Expected to find valid identity token');
    }

    return {
      operation: 'identity',
      token,
    };
  }

  static unaryOperation(operationName, tokens) {
    const operatorToken = _.first(tokens);
    const rightTokens   = _.rest(tokens);

    const validNames = ['plus', 'minus', 'not'];
    if (!_.contains(validNames, operatorToken.name)) {
      throw SyntaxError.at(operatorToken, `Expected to find ${operationName}`);
    }

    return {
      operation: operationName,
      token:     operatorToken,
      rightNode: this.fromStatement(rightTokens),
    };
  }

  static binaryOperation(operationName, operatorIndex, tokens) {
    const tokenNames = {
      subtraction:    ['minus'],
      addition:       ['plus'],
      division:       ['slash'],
      multiplication: ['star'],
      exponentiation: ['starStar'],
      assignment:     ['equals'],
      dispatch:       ['dot'],
      equalityComparison: [
        'equalTo',
        'notEqualTo',
      ],
      differentialComparison: [
        'greaterThan',
        'greaterThanOrEqualTo',
        'lessThan',
        'lessThanOrEqualTo',
      ],
      boolean: [
        'and',
        'or',
      ],
    }[operationName];

    const operatorToken = tokens[operatorIndex];
    if (!_.contains(tokenNames, operatorToken.name)) {
      throw SyntaxError.at(operatorToken, `Expected to find ${operationName}`);
    }

    const leftTokens = _.first(tokens, operatorIndex);
    if (_.isEmpty(leftTokens)) {
      throw SyntaxError.at(operatorToken, `Found no left-hand side for ${operationName}`);
    }

    const rightTokens = tokens.slice(operatorIndex + 1);
    if (_.isEmpty(rightTokens)) {
      throw SyntaxError.at(operatorToken, `Found no right-hand side for ${operationName}`);
    }

    return {
      operation: operationName,
      token:     operatorToken,
      leftNode:  this.fromStatement(leftTokens),
      rightNode: this.fromStatement(rightTokens),
    };
  }

  static sequence(firstCommaIndex, tokens) {
    const firstComma = tokens[firstCommaIndex];
    if (firstComma.name !== 'comma') {
      throw SyntaxError.at(firstComma, 'Expected to find comma');
    }

    const sequenceSets = _.reduce(tokens, (sets, token) => {
      if (token.name === 'comma') {
        sets.push([]);
      } else {
        _.last(sets).push(token);
      }

      return sets;
    }, [[]]);

    const sequenceNodes = _.map(sequenceSets, set => this.fromStatement(set));

    return {
      operation:  'sequence',
      startToken: _.first(tokens),
      endToken:   _.last(tokens),
      sequenceNodes,
    };
  }

  static group(operationName, tokens) {
    const correctOpenTokenName = {
      parenGroup:   'openParen',
      bracketGroup: 'openBracket',
      braceGroup:   'openBrace',
    }[operationName];

    const openToken = _.first(tokens);
    if (openToken.name !== correctOpenTokenName) {
      throw SyntaxError.at(openToken, `Expected ${operationName} opening symbol`);
    }

    const closeToken = _.last(tokens);
    if (!TokenUtil.openTokenMatchesCloser(openToken, closeToken)) {
      throw SyntaxError.at(closeToken, `Expected ${operationName} closing symbol`);
    }

    const innerTokens = tokens.slice(1, -1);

    return {
      operation: operationName,
      openToken,
      closeToken,
      innerNode: this.fromStatement(innerTokens),
    };
  }

  static anonFnDefinition(tokens) {
    const parser    = new TokenParser(tokens);
    const argBounds = parser.boundsOfFirstGroup();
    if (argBounds[0] !== 0) {
      throw SyntaxError.at(tokens[0], 'Expected arguments to begin the anonymous function');
    }

    const colonIndex = argBounds[1] + 1;
    const colonToken = tokens[colonIndex];
    if (_.isUndefined(colonToken) || colonToken.name !== 'colon') {
      throw SyntaxError.at(colonToken, 'Expected valid function definition');
    }

    const tokenAfterColon = tokens[colonIndex + 1];
    const linesAfterColon = TokenUtil.linesBetween(colonToken, tokenAfterColon);
    const colsAfterColon  = TokenUtil.columnsBetween(colonToken, tokenAfterColon);
    const typeToken       = (linesAfterColon === 0 && colsAfterColon === 0) ? tokenAfterColon : undefined;
    const argTokens       = tokens.slice(argBounds[0] + 1, argBounds[1])
    const blockStartIndex = colonIndex + (_.isUndefined(typeToken) ? 1 : 2);
    const blockTokens     = tokens.slice(blockStartIndex);
    const blockSyntaxer   = new Syntaxer(blockTokens);

    return {
      operation: 'anonFnDefinition',
      colonToken,
      typeToken,
      argumentsNode: this.fromStatement(argTokens),
      blockNodes:    blockSyntaxer.traverse(),
    };
  }

  static fnDeclaration(tokens) {
    const defToken = tokens[0];
    if (_.isUndefined(defToken) || defToken.name !== 'def') {
      throw SyntaxError.at(defToken, 'Expected "def" to start the function declaration');
    }

    const nameToken = tokens[1];
    if (_.isUndefined(nameToken) || nameToken.name !== 'identifier') {
      throw SyntaxError.at(nameToken, 'Expected the function declaration to have a valid name');
    }

    const parser    = new TokenParser(tokens);
    const argBounds = parser.boundsOfFirstGroup();
    if (argBounds[0] !== 2) {
      throw SyntaxError.at(nameToken, 'Expected arguments for function declaration after name');
    }

    const colonIndex = argBounds[1] + 1;
    const colonToken = tokens[colonIndex];
    if (_.isUndefined(colonToken) || colonToken.name !== 'colon') {
      throw SyntaxError.at(colonToken, 'Expected valid function declaration');
    }

    const tokenAfterColon = tokens[colonIndex + 1];
    const linesAfterColon = TokenUtil.linesBetween(colonToken, tokenAfterColon);
    const colsAfterColon  = TokenUtil.columnsBetween(colonToken, tokenAfterColon);
    const typeToken       = (linesAfterColon === 0 && colsAfterColon === 0) ? tokenAfterColon : undefined;
    const argTokens       = tokens.slice(argBounds[0] + 1, argBounds[1]);
    const blockStartIndex = colonIndex + (_.isUndefined(typeToken) ? 1 : 2);
    const blockTokens     = tokens.slice(blockStartIndex);
    const blockSyntaxer   = new Syntaxer(blockTokens);

    return {
      operation: 'fnDeclaration',
      nameToken,
      colonToken,
      typeToken,
      argumentsNode: this.fromStatement(argTokens),
      blockNodes:    blockSyntaxer.traverse(),
    };
  }

  static propDefault(tokens) {
    const nameToken = tokens[0];
    if (_.isUndefined(nameToken) || nameToken.name !== 'identifier') {
      throw SyntaxError.at(nameToken, 'Expected the prop default to have a valid name');
    }

    const colonToken = tokens[1];
    if (_.isUndefined(colonToken) || colonToken.name !== 'colon') {
      throw SyntaxError.at(colonToken, 'Expected valid prop default definition');
    }

    const typeToken       = tokens[2];
    const linesAfterColon = TokenUtil.linesBetween(colonToken, typeToken);
    const colsAfterColon  = TokenUtil.columnsBetween(colonToken, typeToken);
    const typePosIsValid  = linesAfterColon === 0 && colsAfterColon === 0;
    if (_.isUndefined(typeToken) || !typePosIsValid || typeToken.type !== 'word') {
      throw SyntaxError.at(colonToken, 'Prop must specify a type');
    }

    const blockTokens   = tokens.slice(3);
    const blockSyntaxer = new Syntaxer(blockTokens);

    return {
      operation: 'propDefault',
      nameToken,
      colonToken,
      typeToken,
      blockNodes: blockSyntaxer.traverse(),
    };
  }

  static propSetter(tokens) {
    const nameToken = tokens[0];
    if (_.isUndefined(nameToken) || nameToken.name !== 'identifier') {
      throw SyntaxError.at(nameToken, 'Expected the prop default to have a valid name');
    }

    const colonToken = tokens[1];
    if (_.isUndefined(colonToken) || colonToken.name !== 'colon') {
      throw SyntaxError.at(colonToken, 'Expected valid prop default definition');
    }

    const typeToken       = tokens[2];
    const linesAfterColon = TokenUtil.linesBetween(colonToken, typeToken);
    const colsAfterColon  = TokenUtil.columnsBetween(colonToken, typeToken);
    const typePosIsValid  = linesAfterColon === 0 && colsAfterColon === 0;
    if (_.isUndefined(typeToken) || !typePosIsValid || typeToken.type !== 'word') {
      throw SyntaxError.at(colonToken, 'Prop must specify a type');
    }

    const setToken       = tokens[3];
    const linesAfterType = TokenUtil.linesBetween(typeToken, setToken);
    if (_.isUndefined(setToken) || linesAfterType !== 0) {
      throw SyntaxError.at(typeToken, 'Expected prop setter "set" keyword after specifying type');
    }

    const blockTokens   = tokens.slice(4);
    const blockSyntaxer = new Syntaxer(blockTokens);

    return {
      operation: 'propSetter',
      nameToken,
      colonToken,
      typeToken,
      blockNodes: blockSyntaxer.traverse(),
    };
  }

  // Tokens must start with the `proto` keyword
  static protoDefinition(tokens) {
    const parser        = new TokenParser(tokens);
    const boundsOfProto = parser.boundsOfFirstProtoDefinition();
    if (_.isEmpty(boundsOfProto) || boundsOfProto[0] !== 0) {
      throw SyntaxError.at(tokens[0], 'Expected proto definition to begin');
    }

    const protoTokens = tokens.slice(boundsOfProto[0], boundsOfProto[1] + 1);
    const protoToken  = protoTokens[0];
    const protoParser = new TokenParser(protoTokens);

    const protoIndex   = 0;
    const fromIndex    = protoParser.indexOfFrom();
    const shapedIndex  = protoParser.indexOfShaped();
    const extendsIndex = protoParser.indexOfExtends();
    const endIndex     = protoTokens.length - 1;

    const keywordIndices = [fromIndex, shapedIndex, extendsIndex];
    const sortedIndices  = _.sortBy(keywordIndices);
    const orderIsValid   = _.every(sortedIndices, (n, m) => n === keywordIndices[m]);
    if (!orderIsValid) {
      throw SyntaxError.at(protoToken, `Proto sub-definitions ('from', 'shaped', 'extends') are out of order`)
    }

    // hacky bullshit so that these three indices are still -1 for "unfound"
    const firstKeywordIndex  = (fromIndex + 1 || shapedIndex + 1 || extendsIndex + 1) - 1;
    const secondKeywordIndex = (shapedIndex + 1 || extendsIndex + 1) - 1;

    const hasFirstKeyword  = firstKeywordIndex  !== -1;
    const hasSecondKeyword = secondKeywordIndex !== -1;
    const isDerived        = fromIndex          !== -1;
    const isShaped         = shapedIndex        !== -1;
    const isExtended       = extendsIndex       !== -1;

    const endOfName        = hasFirstKeyword ? firstKeywordIndex - 1 : endIndex;
    const nameTokens       = protoTokens.slice(protoIndex + 1, endOfName + 1);

    const endOfDerivation  = hasSecondKeyword ? secondKeywordIndex - 1 : endIndex;
    const derivationTokens = isDerived ? protoTokens.slice(fromIndex + 1, endOfDerivation + 1) : [];

    const endOfShape       = isExtended ? extendsIndex - 1 : endIndex;
    const shapeTokens      = isShaped ? protoTokens.slice(shapedIndex + 1, endOfShape + 1) : [];

    const endOfExtension   = endIndex;
    const extensionTokens  = isExtended ? protoTokens.slice(extendsIndex + 1, endOfExtension + 1) : [];

    const shapeSyntaxer     = new Syntaxer(shapeTokens);
    const extensionSyntaxer = new Syntaxer(extensionTokens);

    return {
      operation: 'protoDefinition',
      protoToken,
      nameNode:       this.fromStatement(nameTokens),
      derivationNode: this.fromStatement(derivationTokens),
      shapeNodes:     shapeSyntaxer.traverse(),
      extensionNodes: extensionSyntaxer.traverse(),
    };
  }

  static functionCall(indexOfOpenToken, tokens) {
    const openToken = tokens[indexOfOpenToken];
    const leftToken = tokens[indexOfOpenToken - 1];

    if (!openToken || !leftToken || openToken.name !== 'openParen') {
      throw SyntaxError.at(openToken, 'Expected function call');
    }

    const validLeftTypes = ['word', 'string', 'number'];
    const validLeftNames = ['closeParen', 'closeBracket', 'closeBrace'];
    if (!(_.contains(validLeftTypes, leftToken.type) || _.contains(validLeftNames, leftToken.name))) {
      throw SyntaxError.at(leftToken, 'Invalid function callee');
    }

    const calleeTokens = _.first(tokens, indexOfOpenToken);
    const restOfTokens = tokens.slice(indexOfOpenToken);
    const parser       = new TokenParser(restOfTokens);
    const boundsOfArgs = parser.boundsOfFirstGroup();

    if (_.isEmpty(boundsOfArgs)) {
      throw SyntaxError.at(openToken, 'Incomplete argument group for function call');
    }

    const closeToken      = restOfTokens[boundsOfArgs[1]];
    const argumentsTokens = restOfTokens.slice(boundsOfArgs[0] + 1, boundsOfArgs[1]);

    return {
      operation: 'functionCall',
      openToken,
      closeToken,
      calleeNode:    this.fromStatement(calleeTokens),
      argumentsNode: this.fromStatement(argumentsTokens),
    };
  }

  static hashPair(indexOfHashColon, tokens) {
    const colonToken = tokens[indexOfHashColon];
    if (colonToken.name !== 'colon') {
      throw SyntaxError.at(colonToken, 'Expected to find a hash pair colon');
    }

    const leftTokens = _.first(tokens, indexOfHashColon);
    if (_.isEmpty(leftTokens)) {
      throw SyntaxError.at(colonToken, 'Found no left-hand side (key) for the hash pair');
    }

    const rightTokens = tokens.slice(indexOfHashColon + 1);
    if (_.isEmpty(rightTokens)) {
      throw SyntaxError.at(colonToken, 'Found no right-hand side (value) for the hash pair');
    }

    return {
      operation: 'hashPair',
      token:     colonToken,
      keyNode:   this.fromStatement(leftTokens),
      valueNode: this.fromStatement(rightTokens),
    };
  }

  static rocketCondition(tokens) {
    const rocketIndex = indexOfRocket(tokens);
    if (rocketIndex === -1) {
      throw SyntaxError.at(tokens[0], 'Expected rocket condition to begin');
    }

    const boundsOfCondish = boundsOfFirstRocketConditionInTokens(tokens);
    const [startIndex, endIndex] = boundsOfCondish;
    if (startIndex !== 0) {
      throw SyntaxError.at(tokens[0], 'Expected rocket condition to begin');
    }

    const rocketToken = tokens[rocketIndex];
    const leftTokens  = _.first(tokens, rocketIndex);
    const rightTokens = tokens.slice(rocketIndex + 1, endIndex);
    const leftSyntaxer  = new Syntaxer(leftTokens);
    const rightSyntaxer = new Syntaxer(rightTokens);

    return {
      operation: 'rocketCondition',
      rocketToken,
      leftNodes:  leftSyntaxer.traverse(),
      rightNodes: rightSyntaxer.traverse(),
    };
  }

  static exhaustCondition(tokens) {
    const exhaustToken = tokens[0];
    if (exhaustToken.name !== 'exhaust') {
      throw SyntaxError.at(exhaustToken, 'Expected exhaust condition to begin');
    }

    const rightNodes  = tokens.slice(1);
    const rightSyntaxer = new Syntaxer(rightNodes);

    return {
      operation: 'exhaustCondition',
      exhaustToken,
      rightNodes: rightSyntaxer.traverse(),
    };
  }

  static conditionNodes(tokens, nodeList = []) {
    const indexOfRocket = indexOfRocket(tokens);
    if (indexOfRocket === -1) {
      if (firstToken.name === 'exhaust') {
        const exhaustNode = this.exhaustCondition(tokens);
        nodeList.push(exhaustNode);
      }
      return nodeList;
    }

    const boundsOfCondition = boundsOfFirstRocketConditionInTokens(tokens);
    if (_.isEmpty(boundsOfCondition)) {
      throw SyntaxError.at(tokens[indexOfRocket], 'Expected rocket condition');
    }

    const [conditionStartIndex, conditionEndIndex] = boundsOfCondition;
    const conditionTokens = tokens.slice(conditionStartIndex, conditionEndIndex + 1);
    const rocketNode      = this.rocketCondition(conditionTokens);
    const restOfTokens    = tokens.slice(conditionEndIndex + 1);
    nodeList.push(rocketNode);

    return this.conditionNodes(restOfTokens, nodeList);
  }

  static conditional(conditionalOperatorName, tokens) {
    const conditionalToken = tokens[0];
    if (conditionalToken.name !== conditionalOperatorName) {
      throw SyntaxError.at(conditionalToken, `Expected ${conditionalOperatorName} to begin`);
    }

    const tokenName       = `${conditionalOperatorName}Token`;
    const parser          = new TokenParser(tokens);
    const argBounds       = parser.boundsOfFirstGroup();
    const argOpenIndex    = argBounds[0];
    const argCloseIndex   = argBounds[1];
    const hasArgs         = argOpenIndex === 1 && tokens[1].name === 'openParen';
    const argsTokens      = hasArgs ? tokens.slice(argOpenIndex + 1, argCloseIndex) : [];
    const argumentsNode   = this.fromStatement(argsTokens);
    const boundsOfCondish = parser.boundsOfFirstConditional(conditionalOperatorName);
    const blockStartIndex = hasArgs ? argCloseIndex + 1 : 1;
    const blockEndIndex   = boundsOfCondish[1];
    const blockTokens     = tokens.slice(blockStartIndex, blockEndIndex + 1);

    return {
      operation:   conditionalOperatorName,
      [tokenName]: conditionalToken,
      argumentsNode,
      conditionNodes: this.conditionNodes(blockTokens),
    };
  }

  static check(tokens) {
    return this.conditional('check', tokens);
  }

  static guard(tokens) {
    return this.conditional('guard', tokens);
  }

  static slide(tokens) {
    return this.conditional('slide', tokens);
  }

  static identityIfValid(options = { tokens: [], parser: null }) {
    const tokens = options.parser ? options.parser.tokens : options.tokens;
    if (tokens.length !== 1) return null;
    return this.identity(tokens[0]);
  }

  static sequenceIfValid(options = { tokens: [], parser: null }) {
    const parser        = options.parser || new TokenParser(options.tokens);
    const tokens        = options.tokens || parser.tokens;
    const sequenceIndex = parser.indexOfSequence();
    if (sequenceIndex === -1) return null;
    return this.sequence(sequenceIndex, tokens);
  }

  static assignmentIfValid(options = { tokens: [], parser: null }) {
    const parser          = options.parser || new TokenParser(options.tokens);
    const tokens          = options.tokens || parser.tokens;
    const assignmentIndex = parser.indexOfAssignment();
    if (assignmentIndex === -1) return null;
    return this.binaryOperation('assignment', assignmentIndex, tokens);
  }

  static logicalORIfValid(options = { tokens: [], parser: null }) {
    const parser         = options.parser || new TokenParser(options.tokens);
    const tokens         = options.tokens || parser.tokens;
    const logicalORIndex = parser.indexOfLogicalOR(tokens);
    if (logicalORIndex === -1) return null;
    return this.binaryOperation('boolean', logicalORIndex, tokens);
  }

  static logicalANDIfValid(options = { tokens: [], parser: null }) {
    const parser          = options.parser || new TokenParser(options.tokens);
    const tokens          = options.tokens || parser.tokens;
    const logicalANDIndex = parser.indexOfLogicalAND(tokens);
    if (logicalANDIndex === -1) return null;
    return this.binaryOperation('boolean', logicalANDIndex, tokens);
  }

  static equalityComparisonIfValid(options = { tokens: [], parser: null }) {
    const parser                  = options.parser || new TokenParser(options.tokens);
    const tokens                  = options.tokens || parser.tokens;
    const equalityComparisonIndex = parser.indexOfEqualityComparison(tokens);
    if (equalityComparisonIndex === -1) return null;
    return this.binaryOperation('equalityComparison', equalityComparisonIndex, tokens);
  }

  static differentialComparisonIfValid(options = { tokens: [], parser: null }) {
    const parser                      = options.parser || new TokenParser(options.tokens);
    const tokens                      = options.tokens || parser.tokens;
    const differentialComparisonIndex = parser.indexOfDifferentialComparison(tokens);
    if (differentialComparisonIndex === -1) return null;
    return this.binaryOperation('differentialComparison', differentialComparisonIndex, tokens);
  }

  static linearMathIfValid(options = { tokens: [], parser: null }) {
    const parser               = options.parser || new TokenParser(options.tokens);
    const tokens               = options.tokens || parser.tokens;
    const additionIndex        = parser.indexOfAddition(tokens);
    const subtractionIndex     = parser.indexOfSubtraction(tokens);
    const firstLinearMathIndex = _.min(_.without([additionIndex, subtractionIndex], -1));
    switch (firstLinearMathIndex) {
      case additionIndex:    return this.binaryOperation('addition',    additionIndex,    tokens);
      case subtractionIndex: return this.binaryOperation('subtraction', subtractionIndex, tokens);
      default:               return null;
    }
  }

  static planarMathIfValid(options = { tokens: [], parser: null }) {
    const parser               = options.parser || new TokenParser(options.tokens);
    const tokens               = options.tokens || parser.tokens;
    const multiplicationIndex  = parser.indexOfAddition(tokens);
    const divisionIndex        = parser.indexOfSubtraction(tokens);
    const firstPlanarMathIndex = _.min(_.without([multiplicationIndex, divisionIndex], -1));
    switch (firstPlanarMathIndex) {
      case multiplicationIndex: return this.binaryOperation('multiplication', multiplicationIndex,    tokens);
      case divisionIndex:       return this.binaryOperation('division',       divisionIndex, tokens);
      default:                  return null;
    }
  }

  static exponentiationIfValid(options = { tokens: [], parser: null }) {
    const parser              = options.parser || new TokenParser(options.tokens);
    const tokens              = options.tokens || parser.tokens;
    const exponentiationIndex = parser.indexOfExponentiation(tokens);
    if (exponentiationIndex === -1) return null;
    return this.binaryOperation('exponentiation', exponentiationIndex, tokens);
  }

  static unaryOperationIfValid(options = { tokens: [], parser: null }) {
    const tokens = options.parser ? options.parser.tokens : options.tokens;
    const firstToken = _.first(tokens);
    switch (firstToken.name) {
      case 'minus': return this.unaryOperation('negation',       tokens);
      case 'plus':  return this.unaryOperation('substantiation', tokens);
      case 'not':   return this.unaryOperation('inversion',      tokens);
      default:      return null;
    }
  }

  static protoIfValid(options = { tokens: [], parser: null }) {
    const tokens = options.parser ? options.parser.tokens : options.tokens;
    const firstToken = _.first(tokens);
    if (firstToken.name !== 'proto') return null;
    return this.protoDefinition(tokens);
  }

  static conditionalIfValid(options = { tokens: [], parser: null }) {
    const tokens = options.parser ? options.parser.tokens : options.tokens;
    const firstToken = _.first(tokens);
    switch (firstToken.name) {
      case 'check': return this.check(tokens);
      case 'guard': return this.guard(tokens);
      default:      return null;
    }
  }

  static hashPairIfValid(options = { tokens: [], parser: null }) {
    const parser         = options.parser || new TokenParser(options.tokens);
    const tokens         = options.tokens || parser.tokens;
    const hashColonIndex = parser.indexOfHashColon(tokens);
    if (hashColonIndex === -1) return null;
    return this.hashPair(hashColonIndex, tokens);
  }

  static functionDefinitionIfValid(options = { tokens: [], parser: null }) {
    const parser          = options.parser || new TokenParser(options.tokens);
    const tokens          = options.tokens || parser.tokens;
    const isAnonymousFn   = parser.startsWithAnonFn(tokens);
    const isFnDeclaration = !isAnonymousFn && parser.startsWithFnDeclaration(tokens);
    const isPropDefault   = !isAnonymousFn && !isFnDeclaration && parser.startsWithPropDefault(tokens);
    const isPropSetter    = !isAnonymousFn && !isFnDeclaration && !isPropDefault && parser.startsWithPropSetter(tokens);
    switch (true) {
      case isAnonymousFn:   return this.anonFnDefinition(tokens);
      case isFnDeclaration: return this.fnDeclaration(tokens);
      case isPropDefault:   return this.propDefault(tokens);
      case isPropSetter:    return this.propSetter(tokens);
      default:              return null;
    }
  }

  static functionActionIfValid(options = { tokens: [], parser: null }) {
    const parser              = options.parser || new TokenParser(options.tokens);
    const tokens              = options.tokens || parser.tokens;
    const dispatchIndex       = parser.indexOfDispatch(tokens);
    const functionCallIndex   = parser.indexOfFunctionCall(tokens);
    const firstAccessionIndex = _.min(_.without([dispatchIndex, functionCallIndex], -1));
    switch (firstAccessionIndex) {
      case dispatchIndex:     return this.binaryOperation('dispatch', dispatchIndex, tokens);
      case functionCallIndex: return this.functionCall(functionCallIndex, tokens);
      default:                return null;
    }
  }

  static groupIfValid(options = { tokens: [], parser: null }) {
    const tokens = options.parser ? options.parser.tokens : options.tokens;
    const firstToken = _.first(tokens);
    switch (firstToken.name) {
      case 'openParen':   return this.group('parenGroup',   tokens);
      case 'openBracket': return this.group('bracketGroup', tokens);
      case 'openBrace':   return this.group('braceGroup',   tokens);
      default:            return null;
    }
  }

  static fromStatement(tokens) {
    if (_.isEmpty(tokens)) return null;
    const parser = new TokenParser(tokens);

    const identityNode = this.identityIfValid({ parser });
    if (identityNode) return identityNode;

    const sequenceNode = this.sequenceIfValid({ parser });
    if (sequenceNode) return sequenceNode;

    const assignmentNode = this.assignmentIfValid({ parser });
    if (assignmentNode) return assignmentNode;

    const logicalORNode = this.logicalORIfValid({ parser });
    if (logicalORNode) return logicalORNode;

    const logicalANDNode = this.logicalANDIfValid({ parser });
    if (logicalANDNode) return logicalANDNode;

    const equalityComparisonNode = this.equalityComparisonIfValid({ parser });
    if (equalityComparisonNode) return equalityComparisonNode;

    const differentialComparisonNode = this.differentialComparisonIfValid({ parser });
    if (differentialComparisonNode) return differentialComparisonNode;

    const linearMathNode = this.linearMathIfValid({ parser });
    if (linearMathNode) return linearMathNode;

    const planarMathNode = this.planarMathIfValid({ parser });
    if (planarMathNode) return planarMathNode;

    const exponentiationNode = this.exponentiationIfValid({ parser });
    if (exponentiationNode) return exponentiationNode;

    const unaryOperationNode = this.unaryOperationIfValid({ tokens });
    if (unaryOperationNode) return unaryOperationNode;

    const protoNode = this.protoIfValid({ tokens });
    if (protoNode) return protoNode;

    const conditionalNode = this.conditionalIfValid({ tokens });
    if (conditionalNode) return conditionalNode;

    const hashPairNode = this.hashPairIfValid({ parser });
    if (hashPairNode) return hashPairNode;

    const functionDefinitionNode = this.functionDefinitionIfValid({ parser });
    if (functionDefinitionNode) return functionDefinitionNode;

    const functionActionNode = this.functionActionIfValid({ parser });
    if (functionActionNode) return functionActionNode;

    const groupNode = this.groupIfValid({ tokens });
    if (groupNode) return groupNode;

    const firstToken = _.first(tokens);
    const lastToken  = _.last(tokens);
    throw SyntaxError.between(firstToken, lastToken, 'Unrecognized statement');
  }
}

export default Node;
