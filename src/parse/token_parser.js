import _               from 'underscore';
import TokenUtil       from '../utils/token_util';
import { SyntaxError } from '../errors/errors';

function tokensHaveBalancedGrouping(tokens) {
  const openStack = [];
  _.each(tokens, (token) => {
    if (token.type !== 'grouping') return;

    if (TokenUtil.isOpenGroupToken(token)) {
      openStack.push(token);
      return;
    }

    if (TokenUtil.openTokenMatchesCloser(_.last(openStack), token)) {
      openStack.pop();
    }
  });

  return _.isEmpty(openStack);
}

function indexIsInsideBoundsPairs(index, boundsPairs) {
  if (_.isEmpty(boundsPairs)) return false;
  return _.any(boundsPairs, bounds => bounds[0] < index && index < bounds[1]);
}


// ---------------------------------- //
// INDEX FINDERS FOR STARTING CLAUSES //
// ---------------------------------- //


function lastIndexOfRocketCondition(tokens) {
  const rocketIndex = indexOfRocketInTokens(tokens);
  if (rocketIndex === -1) return -1;

  const rocketAndRest         = tokens.slice(rocketIndex);
  const maxIndexOfCondition   = lastIndexOfIndentedBlock(rocketAndRest);
  const rocketTilMax          = _.first(rocketAndRest, maxIndexOfCondition + 1);
  const nestedStructureBounds = boundsOfAllStructuresInTokens(rocketTilMax);

  const exhaustIndex = _.findIndex(rocketTilMax, (token, index) => {
    if (token.name !== 'exhaust') return false;

    const isInsideStructure = indexIsInsideBoundsPairs(index, nestedStructureBounds);
    if (isInsideStructure)        return false;

    return true;
  });

  if (exhaustIndex === -1) return maxIndexOfCondition;

  return rocketIndex + (exhaustIndex - 1);
}

function lastIndexOfExhaustCondition(tokens) {
  const exhaustIndex = indexOfExhaustInTokens(tokens);
  if (exhaustIndex === -1) return -1;

  const exhaustAndRest = tokens.slice(exhaustIndex);
  return lastIndexOfIndentedBlock(exhaustAndRest);
}

// Tokens must start with the line that constructs the indented block, e.g.,
//
// if tokens consist of...
//
//   def foo():Str 'bar'
//                   ^-- it would return the index at this point in the tokens
//
// if tokens consist of...
//
//   def foo():Str
//     bar = 'bar'
//     bar + 'ista'
//                ^-- it would return the index at this point in the tokens
//
// if tokens consist of...
//
//   def foo():Str 'bar'
//   check (foo())   ^-- it would return the index at this point in the tokens...
//     'bar' => console.log('foo returns bar')
//     _> console.log('foo returned something else')
//                                                 ^-- NOT here like you might expect
// if tokens consist of...
//
//   def foo(
//     arg1,
//     arg2,
//     arg3
//   ):Str
//     "#{arg1}, #{arg2}, and #{arg3}"
//                                   ^-- it would return the index at this point in the tokens
function lastIndexOfIndentedBlock(tokens) {
  const firstToken = tokens[0];

  const lastIndexBeforeIndent = _.findIndex(tokens, (currentToken, index) => {
    const nextToken = tokens[index + 1];
    if (_.isUndefined(nextToken)) return true;

    const tokensTilNow = _.first(tokens, index + 1);
    if (!tokensHaveBalancedGrouping(tokensTilNow)) return false;

    return nextToken.line !== currentToken.line;
  });

  const firstIndentedTokenIndex = lastIndexBeforeIndent + 1;
  const indentedTokensAndRest   = tokens.slice(firstIndentedTokenIndex);
  if (_.isEmpty(indentedTokensAndRest)) return lastIndexBeforeIndent;

  const firstIndentedToken = tokens[firstIndentedTokenIndex];
  if (firstIndentedToken.indent <= firstToken.indent) return lastIndexBeforeIndent;

  const lastIndentedTokenIndex = firstIndentedTokenIndex + _.findIndex(indentedTokensAndRest, (currentToken, index) => {
    const nextToken = indentedTokensAndRest[index + 1];
    if (_.isUndefined(nextToken)) return true;

    const tokensTilNow = _.first(indentedTokensAndRest, index + 1);
    if (!tokensHaveBalancedGrouping(tokensTilNow)) return false; // doesn't need to know about
                                                                 // other structures, because
    return nextToken.indent < firstIndentedToken.indent;         // those other structures can't
  });                                                            // break the indentation rules.

  return lastIndentedTokenIndex;
}


// ----------------------- //
// ARBITRARY INDEX FINDERS //
// ----------------------- //


function indexOfBinaryOperation(operationName, tokens, { validLeftTypes, validRightTypes }) {
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
    hashPair:               ['colon'],
    rocketCondition:        ['rocket'],
    dispatch:               ['dot'],
    protoDerivation:        ['from'],
    shapeDefinition:        ['shaped'],
    extensionDefinition:    ['extends'],
  }[operationName];

  if (_.isEmpty(operatorNames)) throw `Invalid binary operation '${operationName}'`;

  const allowProto  = _.contains(['protoDerivation', 'shapeDefinition', 'extensionDefinition'], operationName);
  const except      = allowProto ? ['proto'] : [];
  const boundsPairs = boundsOfAllStructuresInTokens(tokens, { except });

  return _.findIndex(tokens, (token, index) => {
    if (!_.contains(operatorNames, token.name)) return false;

    const isInsideStructure = indexIsInsideBoundsPairs(index, boundsPairs);
    if (isInsideStructure) return false;

    const leftToken   = tokens[index - 1];
    const leftIsValid = (
      _.contains(validLeftTypes, leftToken.type) ||
      leftToken.name === 'identifier'            ||
      TokenUtil.isCloseGroupToken(leftToken)
    );
    if (!leftIsValid)      return false;

    const rightToken   = tokens[index + 1];
    const rightIsValid = (
      _.contains(validRightTypes, rightToken.type) ||
      rightToken.name === 'identifier'             ||
      TokenUtil.isOpenGroupToken(rightToken)
    );
    if (!rightIsValid)     return false;

    return true;
  });
}

function indexOfAssignment(tokens) {
  const validLeftTypes  = ['word'];
  const validRightTypes = ['word', 'string', 'number', 'regex', 'operator'];
  return indexOfBinaryOperation('assignment', tokens, { validLeftTypes, validRightTypes });
}

function indexOfSequence(tokens) {
  const validLeftTypes  = ['word', 'string', 'number', 'regex'];
  const validRightTypes = ['word', 'string', 'number', 'regex', 'operator'];
  return indexOfBinaryOperation('sequence', tokens, { validLeftTypes, validRightTypes });
}

function indexOfSubtraction(tokens) {
  const validLeftTypes  = ['word', 'number', 'string'];
  const validRightTypes = ['word', 'number', 'string', 'regex', 'operator'];
  return indexOfBinaryOperation('subtraction', tokens, { validLeftTypes, validRightTypes });
}

function indexOfAddition(tokens) {
  const validLeftTypes  = ['word', 'number', 'string'];
  const validRightTypes = ['word', 'number', 'string', 'operator'];
  return indexOfBinaryOperation('addition', tokens, { validLeftTypes, validRightTypes });
}

function indexOfDivision(tokens) {
  const validLeftTypes  = ['word', 'number'];
  const validRightTypes = ['word', 'number', 'regex', 'operator'];
  return indexOfBinaryOperation('division', tokens, { validLeftTypes, validRightTypes });
}

function indexOfMultiplication(tokens) {
  const validLeftTypes  = ['word', 'number', 'string'];
  const validRightTypes = ['word', 'number', 'operator'];
  return indexOfBinaryOperation('multiplication', tokens, { validLeftTypes, validRightTypes });
}

function indexOfExponentiation(tokens) {
  const validLeftTypes  = ['word', 'number'];
  const validRightTypes = ['word', 'number', 'operator'];
  return indexOfBinaryOperation('exponentiation', tokens, { validLeftTypes, validRightTypes });
}

function indexOfRocket(tokens) {
  const validLeftTypes  = ['word', 'number', 'string', 'regex'];
  const validRightTypes = ['word', 'number', 'string', 'regex', 'operator'];
  return indexOfBinaryOperation('rocketCondition', tokens, { validLeftTypes, validRightTypes });
}

function indexOfDispatch(tokens) {
  const validLeftTypes  = ['word', 'number', 'string', 'regex'];
  const validRightTypes = ['word'];
  return indexOfBinaryOperation('dispatch', tokens, { validLeftTypes, validRightTypes });
}

function indexOfComparisonOperation(operationName, tokens) {
  const validLeftTypes  = ['word', 'string', 'number', 'regex'];
  const validRightTypes = ['word', 'string', 'number', 'regex', 'operator'];
  return indexOfBinaryOperation(operationName, tokens, { validLeftTypes, validRightTypes });
}

function indexOfLogicalOR(tokens) {
  return indexOfComparisonOperation('logicalOR', tokens);
}

function indexOfLogicalAND(tokens) {
  return indexOfComparisonOperation('logicalAND', tokens);
}

function indexOfEqualityComparison(tokens) {
  return indexOfComparisonOperation('equalityComparison', tokens);
}

function indexOfDifferentialComparison(tokens) {
  return indexOfComparisonOperation('differentialComparison', tokens);
}

function indexOfHashColon(tokens) {
  const validLeftTypes    = ['word', 'number', 'string', 'regex'];
  const validRightTypes   = ['word', 'number', 'string', 'regex', 'operator'];
  const indexOfFirstColon = indexOfBinaryOperation('hashPair', tokens, { validLeftTypes, validRightTypes })
  if (indexOfFirstColon === -1) return -1;

  const tokenBeforeColon = tokens[indexOfFirstColon - 1];
  if (_.isUndefined(tokenBeforeColon)) return -1;

  const tokenAfterColon = tokens[indexOfFirstColon + 1];
  if (_.isUndefined(tokenAfterColon)) return -1;

  const firstColonToken   = tokens[indexOfFirstColon];
  const linesBeforeColon  = TokenUtil.linesBetween(tokenBeforeColon, firstColonToken);
  if (linesBeforeColon > 0) return -1;

  const linesAfterColon  = TokenUtil.linesBetween(firstColonToken, tokenAfterColon);
  const spacesAfterColon = TokenUtil.columnsBetween(firstColonToken, tokenAfterColon);
  if (linesAfterColon === 0 && spacesAfterColon === 0) return -1;

  return indexOfFirstColon;
}

function indexOfFunctionCall(tokens, offset = 0) {
  const boundsOfFirstGroup = boundsOfFirstGroupInTokens(tokens);
  if (_.isEmpty(boundsOfFirstGroup)) return -1;

  const indexOfOpenToken  = boundsOfFirstGroup[0];
  const boundsPairs       = boundsOfAllStructuresInTokens(tokens, { except: ['group'] });
  const isInsideStructure = indexIsInsideBoundsPairs(indexOfOpenToken, boundsPairs);
  if (isInsideStructure)             return -1;

  const openToken = tokens[indexOfOpenToken];
  const leftToken = tokens[indexOfOpenToken - 1];
  if (openToken.name === 'openParen' && leftToken) {
    const validTypes = ['word', 'string', 'number'];
    const validNames = ['closeParen', 'closeBracket', 'closeBrace'];
    if (_.contains(validTypes, leftToken.type) || _.contains(validNames, leftToken.name)) {
      return indexOfOpenToken + offset;
    }
  }

  const indexOfCloseToken = boundsOfFirstGroup[1];
  const restOfTokens      = tokens.slice(indexOfCloseToken);
  const currentOffset     = indexOfCloseToken + offset;
  return indexOfFunctionCall(restOfTokens, currentOffset);
}

function indexOfFunctionColon(tokens) {
  return _.findIndex(tokens, (token, index) => {
    if (token.name !== 'colon')                         return false;

    // regular function definitions MUST provide an argument group to the left
    // of the colon, and prop setter functions MUST provide a prop name to the
    // left of the colon, so if nothing's to the left, it's not a function
    const leftToken = tokens[index - 1];
    if (_.isUndefined(leftToken))                       return false;

    const linesBeforeColon   = TokenUtil.linesBetween(token, leftToken);
    const columnsBeforeColon = TokenUtil.columnsBetween(token, leftToken);
    if (linesBeforeColon > 0 || columnsBeforeColon > 0) return false;

    // for regular function definitions, e.g.,
    //   def foo(a, b):Str "#{a} foos #{b}!"   # hoisted, returns a string
    //   foo = (a, b):Str "#{a}#{b}"           # not hoisted, returns a string
    //   foo = (a, b): console.log(a, b)       # not hoisted, returns null
    //   foo = (a, b):                         # not hoisted, returns null, no-op is valid

    // if it provides an argument group before the colon, it's valid, and it
    // allows anything to follow (no-op is also valid)
    if (leftToken.name === 'closeParen')                return true;

    // for prop setter definitions within proto shape body, e.g.,
    //   breed:Str set "#{breed} is da best!"  # explicit setter; prop name is passed as implicit argument
    //   breed:Str "husky"                     # defaults to 'husky'; short for breed:Str set breed || "husky"
    //   breed:Str                             # defaults to ''; short for breed:Str set breed

    // prop setter definitions MUST provide a non-null return type to the
    // right of the colon
    const rightToken = tokens[index + 1];
    if (_.isUndefined(rightToken))                      return false;
    if (rightToken.type !== 'word')                     return false;

    // the return type must be DIRECTLY after the colon (in hashes there MUST
    // be a space after the colon, to differentiate them from return types)
    const linesAfterColon   = TokenUtil.linesBetween(token, rightToken);
    const columnsAfterColon = TokenUtil.columnsBetween(token, rightToken);
    if (linesAfterColon > 0 || columnsAfterColon > 0)   return false;

    return true;
  });
}

function indexOfProto(tokens) {
  // const boundsPairs = boundsOfAllStructuresInTokens(tokens, { except: ['proto'] });
  // return _.findIndex(tokens, (token, index) => {
  //   if (token.name !== 'proto') return false;
  //   return this.indexIsInsideBoundsPairs(index, boundsPairs);
  // });
  return _.findIndex(tokens, { name: 'proto' });
}

function indexOfFrom(tokens) {
  const validLeftTypes  = ['word'];
  const validRightTypes = [];
  return indexOfBinaryOperation('protoDerivation', tokens, { validLeftTypes, validRightTypes });
}

function indexOfShaped(tokens) {
  const validLeftTypes  = ['word'];
  const validRightTypes = [];
  return indexOfBinaryOperation('shapeDefinition', tokens, { validLeftTypes, validRightTypes });
}

function indexOfExtends(tokens) {
  const validLeftTypes  = ['word'];
  const validRightTypes = [];
  return indexOfBinaryOperation('extensionDefinition', tokens, { validLeftTypes, validRightTypes });
}


// ---------------------------------- //
// BOUNDS FINDERS FOR FIRST STRUCTURE //
// ---------------------------------- //


// Given a set of tokens, returns the indices of the first open grouping symbol and its
// matching closing symbol... essentially the beginning and end of the first group. Returns
// an array: [] if there are no groups, or [openSymbolIndex, closeSymbolIndex] otherwise.
// It will throw an error if there is no matching closing symbol for an open group.
function boundsOfFirstGroupInTokens(tokens, openTokenName = null) {
  const validOpenTokenNames = ['openParen', 'openBracket', 'openBrace'];
  if (openTokenName && !_.contains(validOpenTokenNames, openTokenName)) {
    throw `TokenParserError: openTokenName argument passed to boundsOfFirstGroupInTokens must be the 'name' property of a token representing an open grouping symbol.`;
  }

  const openTokenNames = _.filter(validOpenTokenNames, name => !openTokenName || name === openTokenName);
  const openIndex      = _.findIndex(tokens, token => _.contains(openTokenNames, token.name));
  if (openIndex < 0) return [];

  const openStack  = [];
  const closeIndex = openIndex + _.findIndex(tokens.slice(openIndex), (token) => {
    if (token.type !== 'grouping') return false;

    if (TokenUtil.isOpenGroupToken(token)) {
      openStack.push(token);
      return false;
    }

    if (TokenUtil.openTokenMatchesCloser(_.last(openStack), token)) {
      openStack.pop();
      return _.isEmpty(openStack);
    }

    throw SyntaxError.at(token, `Unmatched ${token.name}`);
  });

  if (closeIndex < 0) {
    const openToken = tokens[openIndex];
    throw SyntaxError.at(openToken, `Unmatched ${openToken.name}`);
  }

  return [openIndex, closeIndex];
}

function boundsOfFirstFunctionDefinitionInTokens(tokens) {
  const colonIndex = indexOfFunctionColon(tokens);
  if (colonIndex === -1) return [];

  const colonAndRest = tokens.slice(colonIndex);
  const stopIndex    = colonIndex + lastIndexOfIndentedBlock(colonAndRest);
  if (tokens[colonIndex - 1].name !== 'closeParen') {
    return [colonIndex - 1, stopIndex]; // it's a prop definition
  }

  const tokensBeforeColon = _.first(tokens, colonIndex);
  const argOpenIndex      = _.findLastIndex(tokensBeforeColon, (token, index) => {
    if (token.name !== 'openParen') return false;
    const currentTokens = tokensBeforeColon.slice(index);
    return tokensHaveBalancedGrouping(currentTokens);
  });

  const nameToken      = tokens[argOpenIndex - 1];
  const defToken       = tokens[argOpenIndex - 2];
  const isDeclaration  = !!defToken && !!nameToken && defToken.name === 'def' && nameToken.name === 'identifier';
  if (!isDeclaration) {
    return [argOpenIndex, stopIndex]; // it's anonymous
  }

  return [argOpenIndex - 2, stopIndex];
}

function boundsOfFirstProtoDefinitionInTokens(tokens) {
  const startIndex = indexOfProto(tokens);
  if (startIndex === -1) return [];

  const protoTokens = tokens.slice(startIndex);
  const endIndex    = startIndex + lastIndexOfIndentedBlock(protoTokens);
  return [startIndex, endIndex];

  // const firstBraceGroupBounds   = boundsOfFirstGroupInTokens(protoTokens, 'openBrace');
  // const firstOpenBraceIndex     = firstBraceGroupBounds[0];
  // const 
  // if (_.isUndefined(firstOpenBraceIndex)) {
  //   return [startIndex, lastIndexOfIndentedBlock(protoTokens)];
  // }


  // const firstOpenBrace          = protoTokens[firstOpenBraceIndex];
  // const tokensTilFirstBrace     = _.first(protoTokens, firstOpenBraceIndex);
  // const lastIndexBeforeBlocks   = lastIndexOfIndentedBlock(tokensTilFirstBrace);
  // const lastIndexBeforeBlocks   = lastIndexOfIndentedBlock(protoTokens);
  // const firstBlockIsPartOfProto = lastIndexBeforeBlocks === firstOpenBraceIndex - 1;
  // if (!firstBlockIsPartOfProto) return [startIndex, startIndex + lastIndexBeforeBlocks];

  // const blockDescriptorToken = protoTokens[lastIndexBeforeBlocks];
  // if (!_.contains(blockDescriptorToken.name, ['shaped', 'extends'])) {
  //   throw SyntaxError.at(blockDescriptorToken, 'Expected "shaped" or "extends" keyword before brace group');
  // }


  // const 
  // const firstOpenIsPartOfProto = lastIndexOfIndentedBlock(tokensTilFirstBrace) === firstOpenBraceIndex - 1;

  // if (!firstOpenIsPartOfProto)
  // const hasGroupGroup    = firstOpenBraceIndex !== -1 && !!firstOpenBrace && firstBraceToken.name === 'openBrace';
  // const first
  


  // // The "from" keyword should only happen at the third token of a proto definition,
  // // at the moment. Might change in the future for, e.g., namespacing or something.
  // const indexOfFrom     = _.findIndex(protoTokens.slice(0, 3), { name: 'from' });
  // // The "shaped" keyword should only be within the first five tokens of a proto
  // // definition. Might change for the same reasons "from" does.
  // const indexOfShaped   = _.findIndex(protoTokens.slice(0, 5), { name: 'shaped' });
  // // 
  // const indexOfExtends  = indexOfBinaryOperation('extensionDefinition', protoTokens, { validLeftTypes, validRightTypes });

  // const lastDescriptorIndex = _.max([indexOfFrom, indexOfShaped, indexOfExtends]);
  // const descriptorToken     = protoTokens[lastDescriptorIndex];
  // if (lastDescriptorIndex === -1)          return [startIndex, startIndex + 1];
  // if (lastDescriptorIndex === indexOfFrom) return [startIndex, startIndex + indexOfFrom + 1];

  // const restOfTokens  = protoTokens.slice(lastDescriptorIndex);
  // const boundsOfBlock = boundsOfFirstGroupInTokens(restOfTokens);
  // if (_.isEmpty(boundsOfBlock)) {
  //   throw SyntaxError.at(descriptorToken, `Expected block for ${descriptorToken.name} descriptor`);
  // }

  // const canonicalBounds = _.map(boundsOfBlock, boundary => boundary + startIndex + lastDescriptorIndex);
  // const endIndex        = canonicalBounds[1];
  // return [startIndex, endIndex];
}

function boundsOfFirstConditionalInTokens(conditionalOperatorName, tokens) {
  const conditionalIndex = _.findIndex(tokens, { name: conditionalOperatorName });
  if (conditionalIndex === -1) return [];

  const conditionalToken   = tokens[conditionalIndex];
  const conditionalAndRest = tokens.slice(conditionalIndex);
  const stopIndex          = conditionalIndex + lastIndexOfIndentedBlock(conditionalAndRest);
  if (stopIndex < conditionalIndex) {
    throw SyntaxError.at(conditionalToken, `Couldn't find the end of ${conditionalOperatorName} statement`);
  }

  return [conditionalIndex, stopIndex];
}

function boundsOfFirstCheckInTokens(tokens) {
  return boundsOfFirstConditionalInTokens('check', tokens);
}

function boundsOfFirstGuardInTokens(tokens) {
  return boundsOfFirstConditionalInTokens('guard', tokens);
}


// --------------------------------- //
// BOUNDS FINDERS FOR ALL STRUCTURES //
// --------------------------------- //


function allBoundsInTokensUsing(tokens, firstBoundsFn, boundsPairs = []) {
  const previousPair = _.last(boundsPairs);
  const startIndex   = _.isUndefined(previousPair) ? 0 : previousPair[1] + 1;
  const restOfTokens = tokens.slice(startIndex);
  if (_.isEmpty(restOfTokens)) return boundsPairs;

  const firstBounds = firstBoundsFn(restOfTokens);
  if (_.isEmpty(firstBounds))  return boundsPairs;

  const canonicalBounds = _.map(firstBounds, boundary => boundary + startIndex);
  boundsPairs.push(canonicalBounds);

  return allBoundsInTokensUsing(tokens, firstBoundsFn, boundsPairs);
}

function boundsOfAllGroupsInTokens(tokens) {
  return allBoundsInTokensUsing(tokens, boundsOfFirstGroupInTokens);
}

function boundsOfAllFunctionDefinitionsInTokens(tokens) {
  return allBoundsInTokensUsing(tokens, boundsOfFirstFunctionDefinitionInTokens);
}

function boundsOfAllProtoDefinitionsInTokens(tokens) {
  return allBoundsInTokensUsing(tokens, boundsOfFirstProtoDefinitionInTokens);
}

function boundsOfAllChecksInTokens(tokens) {
  return allBoundsInTokensUsing(tokens, boundsOfFirstCheckInTokens);
}

function boundsOfAllGuardsInTokens(tokens) {
  return allBoundsInTokensUsing(tokens, boundsOfFirstGuardInTokens);
}

function boundsOfAllStructuresInTokens(tokens, options = { except: [], skipStart: false }) {
  const { except, skipStart } = options;
  const allStructureTypes  = ['group', 'function', 'proto', 'check', 'guard'];
  const filteredStructures = _.without(allStructureTypes, ...except);
  const structurePairFuncs = {
    group:    boundsOfAllGroupsInTokens,
    function: boundsOfAllFunctionDefinitionsInTokens,
    proto:    boundsOfAllProtoDefinitionsInTokens,
    check:    boundsOfAllChecksInTokens,
    guard:    boundsOfAllGuardsInTokens,
  };

  const structureBounds = _.reduce(filteredStructures, (boundsPairs, structureType) => {
    const pairsForStructure = structurePairFuncs[structureType](tokens);
    return boundsPairs.concat(pairsForStructure);
  }, []);

  if (!skipStart || _.isEmpty(structureBounds)) return structureBounds;

  const structureBoundsStartIndex = structureBounds[0][0] === 0 ? 1 : 0;
  return structureBounds.slice(structureBoundsStartIndex);
}

class TokenParser {
  constructor(tokens) {
    this.tokens = tokens;
  }

  // Given a set of tokens, returns the tokens up to the end of the first line (or spanning
  // multiple lines if there are grouping symbols), to the end of the contiguous "statement".
  // Does not include the block of a function/proto definition, etc., as blocks are multiple
  // statements, so I'm just gonna treat the definition statement as a single entity for now
  // and validate/construct the definition block somewhere else.
  // EDIT: ...SLASH TODO: CONSIDER SURROUNDING FUNCTION DEFS W/ CURLY BRACES MAYBE
  firstStatement(tokens = this.tokens) {
    if (_.isEmpty(tokens)) return [];

    const endIndex = lastIndexOfIndentedBlock(tokens);
    return _.first(tokens, endIndex + 1);

    // const boundsPairs     = boundsOfAllStructuresInTokens(tokens);
    // const statementEndPos = _.findIndex(tokens, (currentToken, index) => {
    //   const nextToken = tokens[index + 1];
    //   if (_.isUndefined(nextToken))             return true;

    //   const isInsideStructure = indexIsInsideBoundsPairs(index + 1, boundsPairs);
    //   if (isInsideStructure)                    return false;

    //   if (nextToken.line === currentToken.line) return false;

    //   const currentTokens = _.first(tokens, index + 1);
    //   return tokensHaveBalancedGrouping(currentTokens);
    // });

    // return _.first(tokens, statementEndPos + 1);
  }

  startsWithPropDefinition(tokens = this.tokens) {
    const [nameToken, colonToken, typeToken] = tokens;
    if (_.isUndefined(nameToken)  || nameToken.name  !== 'identifier') return false;
    if (_.isUndefined(colonToken) || colonToken.name !== 'colon')      return false;
    if (_.isUndefined(typeToken)  || typeToken.type  !== 'word')       return false;
    if (nameToken.line !== colonToken.line)                            return false;
    if (colonToken.line !== typeToken.line)                            return false;

    const spacesBeforeColon = TokenUtil.columnsBetween(nameToken, colonToken);
    const spacesAfterColon  = TokenUtil.columnsBetween(colonToken, typeToken);
    if (spacesBeforeColon > 0 || spacesAfterColon > 0) return false;

    return true;
  }

  startsWithPropDefault(tokens = this.tokens) {
    if (!this.startsWithPropDefinition(tokens))      return false;
    const defaultToken = tokens[3];
    if (defaultToken && defaultToken.name === 'set') return false;
    return true;
  }

  startsWithPropSetter(tokens = this.tokens) {
    if (!this.startsWithPropDefinition(tokens))             return false;
    const setToken = tokens[3];
    if (_.isUndefined(setToken) || setToken.name !== 'set') return false;
    return true;
  }

  startsWithFnDeclaration(tokens = this.tokens) {
    const [defToken, nameToken] = tokens;
    if (_.isUndefined(defToken)  || defToken.name  !== 'def')        return false;
    if (_.isUndefined(nameToken) || nameToken.name !== 'identifier') return false;

    const argBounds = boundsOfFirstGroupInTokens(tokens);
    if (argBounds[0] !== 2)                                          return false;

    const colonToken = tokens[argBounds[1] + 1];
    if (_.isUndefined(colonToken) || colonToken.name !== 'colon')    return false;

    return true;
  }

  startsWithAnonFn(tokens = this.tokens) {
    const argBounds = boundsOfFirstGroupInTokens(tokens);
    if (argBounds[0] !== 0)                                       return false;

    const colonToken = tokens[argBounds[1] + 1];
    if (_.isUndefined(colonToken) || colonToken.name !== 'colon') return false;

    return true;
  }

  indexOfAssignment(tokens = this.tokens)             { return indexOfAssignment(tokens); }
  indexOfSequence(tokens = this.tokens)               { return indexOfSequence(tokens); }
  indexOfSubtraction(tokens = this.tokens)            { return indexOfSubtraction(tokens); }
  indexOfAddition(tokens = this.tokens)               { return indexOfAddition(tokens); }
  indexOfDivision(tokens = this.tokens)               { return indexOfDivision(tokens); }
  indexOfMultiplication(tokens = this.tokens)         { return indexOfMultiplication(tokens); }
  indexOfExponentiation(tokens = this.tokens)         { return indexOfExponentiation(tokens); }
  indexOfRocket(tokens = this.tokens)                 { return indexOfRocket(tokens); }
  indexOfDispatch(tokens = this.tokens)               { return indexOfDispatch(tokens); }
  indexOfLogicalOR(tokens = this.tokens)              { return indexOfLogicalOR(tokens); }
  indexOfLogicalAND(tokens = this.tokens)             { return indexOfLogicalAND(tokens); }
  indexOfEqualityComparison(tokens = this.tokens)     { return indexOfEqualityComparison(tokens); }
  indexOfDifferentialComparison(tokens = this.tokens) { return indexOfDifferentialComparison(tokens); }
  indexOfHashColon(tokens = this.tokens)              { return indexOfHashColon(tokens); }
  indexOfFunctionCall(tokens = this.tokens)           { return indexOfFunctionCall(tokens); }
  indexOfFunctionColon(tokens = this.tokens)          { return indexOfFunctionColon(tokens); }
  indexOfProto(tokens = this.tokens)                  { return indexOfProto(tokens); }
  indexOfFrom(tokens = this.tokens)                   { return indexOfFrom(tokens); }
  indexOfShaped(tokens = this.tokens)                 { return indexOfShaped(tokens); }
  indexOfExtends(tokens = this.tokens)                { return indexOfExtends(tokens); }

  boundsOfFirstGroup(tokens = this.tokens)                     { return boundsOfFirstGroupInTokens(tokens); }
  boundsOfFirstProtoDefinition(tokens = this.tokens)           { return boundsOfFirstProtoDefinitionInTokens(tokens); }
  boundsOfFirstConditional(operatorName, tokens = this.tokens) { return boundsOfFirstConditionalInTokens(operatorName, tokens); }

  // lastIndexOfIndentedBlock(startIndex = 0) {
  //   const firstToken      = this.tokens[startToken];
  //   const structureBounds = this.boundsOfAllStructures({ startIndex });
  //   return _.findIndex(this.tokens, (currentToken, index) => {
  //     if (index < startIndex)                   return false;

  //     const isInsideStructure = this.indexIsInsideBoundsPairs(index + 1, structureBounds);
  //     if (isInsideStructure)                    return false;

  //     const nextToken = this.tokens[index + 1];
  //     if (_.isUndefined(nextToken))             return true;
  //     if (nextToken.line === currentToken.line) return false;
  //     if (nextToken.indent > firstToken.indent) return false;

  //     return true;
  //   });
  // }

  // // assumes the tokens start with the condition... kinda janky, but that's how
  // // it's currently used. FIXME.
  // boundsOfFirstRocketCondition() {
  //   const indexOfRocket = this.indexOfRocket();
  //   if (indexOfRocket === -1) return [];

  //   const boundsPairs = this.boundsOfAllStructures();
  //   const conditionEndIndex = _.findIndex(tokens, (token, index) => {
  //     if (index <= indexOfRocket)          return false;

  //     const isInsideStructure = this.indexIsInsideBoundsPairs(index, boundsPairs);
  //     if (isInsideStructure)               return false;

  //     const nextToken = tokens[index + 1];
  //     if (nextToken.name === 'exhaust')    return true;
  //     if (nextToken.line === token.line)   return false;
  //     if (nextToken.indent > token.indent) return false;

  //     return true;
  //   });

  //   if (conditionEndIndex === -1) {
  //     throw SyntaxError.at(tokens[indexOfRocket], 'Could not find the end of the rocket condition');
  //   }

  //   return [0, conditionEndIndex];
  // }

  // // memoized per args hash
  // boundsOfAllStructures(options = { except: [], startIndex: 0 }) {
  //   const { except, startIndex } = options;
  //   const allStructureTypes     = ['group', 'function', 'proto', 'check', 'guard'];
  //   const filteredStructures    = _.without(allStructureTypes, except);
  //   const memoKey               = `${filteredStructures},${startIndex}`;
  //   this._boundsOfAllStructures[memoKey] = this._boundsOfAllStructures[memoKey] || (function(parser, opts = {}) {
  //     const structurePairFuncs = {
  //       group:    _.bind(parser.boundsOfAllGroups, parser),
  //       function: _.bind(parser.boundsOfAllFunctionDefinitions, parser),
  //       proto:    _.bind(parser.boundsOfAllProtoDefinitions, parser),
  //       check:    _.bind(parser.boundsOfAllChecks, parser),
  //       guard:    _.bind(parser.boundsOfAllGuards, parser),
  //     };

  //     const structureBounds = _.reduce(options.filteredStructures, (boundsPairs, structureType) => {
  //       const pairsForStructure = structurePairFuncs[structureType]();
  //       return boundsPairs.concat(pairsForStructure);
  //     }, []);

  //     if (_.isEmpty(structureBounds)) return structureBounds;

  //     const boundsStartIndex = _.findIndex(structureBounds, boundsPair => startIndex <= boundsPair[0]);
  //     return structureBounds.slice(boundsStartIndex);
  //   })(this, { filteredStructures, startIndex });

  //   return this._boundsOfAllStructures;
  // }
}

export default TokenParser;
