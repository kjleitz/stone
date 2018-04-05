import _           from 'underscore';
import Node        from '../leaves/node';
import TokenParser from '../parse/token_parser';

export default class Syntaxer {
  constructor(tokens) {
    this.tokens = tokens;
  }

  traverse(tokens = this.tokens, nodes = []) {
    if (_.isEmpty(tokens)) return nodes;
    const parser         = new TokenParser(tokens);
    const firstStatement = parser.firstStatement();
    const firstNode      = Node.fromStatement(firstStatement);
    nodes.push(firstNode);
    const restOfTokens   = tokens.slice(firstStatement.length);
    return this.traverse(restOfTokens, nodes);
  }

  // isGroup(tokens) {
  //   const openToken  = _.first(tokens);
  //   const closeToken = _.last(tokens);
  //   return this.openTokenMatchesCloser(openToken, closeToken);
  // }

  // isOpenGroupToken(token) {
  //   if (token.type !== 'grouping') return false;
  //   return _.contains(['openParen', 'openBracket', 'openBrace'], token.name);
  // }

  // isCloseGroupToken(token) {
  //   if (token.type !== 'grouping') return false;
  //   return _.contains(['closeParen', 'closeBracket', 'closeBrace'], token.name);
  // }

  // openTokenMatchesCloser(openToken, closeToken) {
  //   if (_.isUndefined(openToken) || _.isUndefined(closeToken))           return false;
  //   if (openToken.type !== 'grouping' || closeToken.type !== 'grouping') return false;
  //   const validCloserFor = { '(': ')', '[': ']', '{': '}' };
  //   const validOpeners   = _.keys(validCloserFor);
  //   const openerIsValid  = _.contains(validOpeners, openToken.lexeme);
  //   const closerIsValid  = closeToken.lexeme === validCloserFor[openToken.lexeme];
  //   return openerIsValid && closerIsValid;
  // }

  // // Given a set of tokens, returns true if the tokens follow valid grouping rules (all open
  // // grouping symbols are properly matched with closing symbols, or there are no groups), or
  // // false if a group is not closed properly. Throws an error for orphaned closing symbols.
  // hasBalancedGrouping(tokens) {
  //   const openStack = [];
  //   _.each(tokens, (token) => {
  //     if (token.type !== 'grouping') return;

  //     if (this.isOpenGroupToken(token)) {
  //       openStack.push(token);
  //       return;
  //     }

  //     if (this.openTokenMatchesCloser(_.last(openStack), token)) {
  //       openStack.pop();
  //     }
  //   });

  //   return _.isEmpty(openStack);
  // }

  // findAllBoundsInTokensWith(findFirstBoundsInTokensFn, tokens, boundsPairs = []) {
  //   const previousPair = _.last(boundsPairs);
  //   const startIndex   = _.isUndefined(previousPair) ? 0 : previousPair[1] + 1;
  //   const restOfTokens = tokens.slice(startIndex);
  //   if (_.isEmpty(restOfTokens))    return boundsPairs;

  //   const boundsOfFirstFn = findFirstBoundsInTokensFn(restOfTokens);
  //   if (_.isEmpty(boundsOfFirstFn)) return boundsPairs;

  //   const canonicalBounds = _.map(boundsOfFirstFn, boundary => boundary + startIndex);
  //   boundsPairs.push(canonicalBounds);

  //   return this.findAllBoundsInTokensWith(findFirstBoundsInTokensFn, tokens, boundsPairs);
  // }

  // // Given a set of tokens, returns the indices of the first open grouping symbol and its
  // // matching closing symbol... essentially the beginning and end of the first group. Returns
  // // an array: [] if there are no groups, or [openSymbolIndex, closeSymbolIndex] otherwise.
  // // It will throw an error if there is no matching closing symbol for an open group.
  // boundsOfFirstGroupInTokens(tokens) {
  //   const openIndex = _.findIndex(tokens, token => this.isOpenGroupToken(token));
  //   if (openIndex < 0) return [];

  //   const openStack  = [];
  //   const closeIndex = openIndex + _.findIndex(tokens.slice(openIndex), (token) => {
  //     if (token.type !== 'grouping') return false;

  //     if (this.isOpenGroupToken(token)) {
  //       openStack.push(token);
  //       return false;
  //     }

  //     if (this.openTokenMatchesCloser(_.last(openStack), token)) {
  //       openStack.pop();
  //       return _.isEmpty(openStack);
  //     }

  //     throw SyntaxError.at(token, `Unmatched ${token.name}`);
  //   });

  //   if (closeIndex < 0) {
  //     const openToken = tokens[openIndex];
  //     throw SyntaxError.at(openToken, `Unmatched ${openToken.name}`);
  //   }

  //   return [openIndex, closeIndex];
  // }

  // boundsOfAllGroupsInTokens(tokens) {
  //   const boundsFinderFn = _.bind(this.boundsOfFirstGroupInTokens, this);
  //   return this.findAllBoundsInTokensWith(boundsFinderFn, tokens);
  // }

  // indexOfFirstFunctionColon(tokens) {
  //   return _.findIndex(tokens, (token, index) => {
  //     if (token.name !== 'colon')                         return false;

  //     // regular function definitions MUST provide an argument group to the left
  //     // of the colon, and prop setter functions MUST provide a prop name to the
  //     // left of the colon, so if nothing's to the left, it's not a function
  //     const leftToken = tokens[index - 1];
  //     if (_.isUndefined(leftToken))                       return false;


  //     const linesBeforeColon   = this.linesBetween(token, leftToken);
  //     const columnsBeforeColon = this.columnsBetween(token, leftToken);
  //     if (linesBeforeColon > 0 || columnsBeforeColon > 0) return false;

  //     // for regular function definitions, e.g.,
  //     //   def foo(a, b):Str "#{a} foos #{b}!"   # hoisted, returns a string
  //     //   foo = (a, b):Str "#{a}#{b}"           # not hoisted, returns a string
  //     //   foo = (a, b): console.log(a, b)       # not hoisted, returns null
  //     //   foo = (a, b):                         # not hoisted, returns null, no-op is valid

  //     // if it provides an argument group before the colon, it's valid, and it
  //     // allows anything to follow (no-op is also valid)
  //     if (leftToken.name === 'closeParen')                return true;

  //     // for prop setter definitions within proto shape body, e.g.,
  //     //   breed:Str set "#{breed} is da best!"  # explicit setter; prop name is passed as implicit argument
  //     //   breed:Str "husky"                     # defaults to 'husky'; short for breed:Str set breed || "husky"
  //     //   breed:Str                             # defaults to ''; short for breed:Str set breed

  //     // prop setter definitions MUST provide a non-null return type to the
  //     // right of the colon
  //     const rightToken = tokens[index + 1];
  //     if (_.isUndefined(rightToken))                      return false;
  //     if (rightToken.type !== 'word')                     return false;

  //     // the return type must be DIRECTLY after the colon (in hashes there MUST
  //     // be a space after the colon, to differentiate them from return types)
  //     const linesAfterColon   = this.linesBetween(token, rightToken);
  //     const columnsAfterColon = this.columnsBetween(token, rightToken);
  //     if (linesAfterColon > 0 || columnsAfterColon > 0)   return false;

  //     return true;
  //   });
  // }

  // boundsOfFirstFunctionDefinitionInTokens(tokens) {
  //   const colonIndex = this.indexOfFirstFunctionColon(tokens);
  //   if (colonIndex === -1) return [];

  //   const colonToken = tokens[colonIndex];

  //   const stopIndex  = _.findIndex(tokens, (currentToken, index) => {
  //     if (index < colonIndex)                       return false;

  //     const nextToken = tokens[index + 1];
  //     if (_.isUndefined(nextToken))                 return true;

  //     const currentTokens = tokens.slice(colonIndex, index + 1);
  //     if (!this.hasBalancedGrouping(currentTokens)) return false;
  //     if (nextToken.line === currentToken.line)     return false;
  //     if (nextToken.indent > colonToken.indent)     return false;

  //     return true;
  //   });

  //   if (tokens[colonIndex - 1].name !== 'closeParen') {
  //     return [colonIndex - 1, stopIndex]; // it's a prop definition
  //   }

  //   const tokensBeforeColon = _.first(tokens, colonIndex);
  //   const argOpenIndex      = _.findLastIndex(tokensBeforeColon, (token, index) => {
  //     if (token.name !== 'openParen') return false;
  //     const currentTokens = tokensBeforeColon.slice(index);
  //     return this.hasBalancedGrouping(currentTokens);
  //   });

  //   const nameToken      = tokens[argOpenIndex - 1];
  //   const defToken       = tokens[argOpenIndex - 2];
  //   const isDeclaration  = !!defToken && !!nameToken && defToken.name === 'def' && nameToken.name === 'identifier';
  //   if (!isDeclaration) {
  //     return [argOpenIndex, stopIndex]; // it's anonymous
  //   }

  //   return [argOpenIndex - 2, stopIndex];
  // }

  // boundsOfAllFunctionDefinitionsInTokens(tokens) {
  //   const boundsFinderFn = _.bind(this.boundsOfFirstFunctionDefinitionInTokens, this);
  //   return this.findAllBoundsInTokensWith(boundsFinderFn, tokens);
  // }

  // boundsOfFirstConditionalInTokens(conditionalOperatorName, tokens) {
  //   const conditionalIndex = _.findIndex(tokens, { name: conditionalOperatorName });
  //   if (conditionalIndex === -1) return [];

  //   const conditionalToken = tokens[conditionalIndex];
  //   const stopIndex = _.findIndex(tokens, (currentToken, index) => {
  //     if (index < conditionalIndex)                   return false;

  //     const nextToken = tokens[index + 1];
  //     if (_.isUndefined(nextToken))                   return true;

  //     const currentTokens = tokens.slice(conditionalIndex, index + 1);
  //     if (!this.hasBalancedGrouping(currentTokens))   return false;
  //     if (nextToken.line === currentToken.line)       return false;
  //     if (nextToken.indent > conditionalToken.indent) return false;

  //     return true;
  //   });

  //   if (stopIndex === -1) {
  //     throw SyntaxError.at(conditionalToken, `Couldn't find the end of ${conditionalOperatorName} statement`);
  //   }

  //   return [conditionalIndex, stopIndex];
  // }

  // boundsOfFirstCheckInTokens(tokens) {
  //   return this.boundsOfFirstConditionalInTokens('check', tokens);
  // }

  // boundsOfAllChecksInTokens(tokens) {
  //   const boundsFinderFn = _.bind(this.boundsOfFirstCheckInTokens, this);
  //   return this.findAllBoundsInTokensWith(boundsFinderFn, tokens);
  // }

  // boundsOfFirstGuardInTokens(tokens) {
  //   return this.boundsOfFirstConditionalInTokens('guard', tokens);
  // }

  // boundsOfAllGuardsInTokens(tokens) {
  //   const boundsFinderFn = _.bind(this.boundsOfFirstCheckInTokens, this);
  //   return this.findAllBoundsInTokensWith(boundsFinderFn, tokens);
  // }

  // // assumes the tokens start with the condition... kinda janky, but that's how
  // // it's currently used. FIXME.
  // boundsOfFirstRocketConditionInTokens(tokens) {
  //   const indexOfRocket = this.indexOfRocket(tokens);
  //   if (indexOfRocket === -1) return [];

  //   const boundsPairs = this.boundsOfAllStructuresInTokens(tokens);
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

  // boundsOfAllStructuresInTokens(tokens, options = { except: [] }) {
  //   const { except } = options;
  //   const allStructureTypes  = ['group', 'function', 'proto', 'check', 'guard'];
  //   const filteredStructures = _.without(allStructureTypes, except);
  //   const structurePairFuncs = {
  //     group:    _.bind(this.boundsOfAllGroupsInTokens, this),
  //     function: _.bind(this.boundsOfAllFunctionDefinitionsInTokens, this),
  //     proto:    _.bind(this.boundsOfAllProtoDefinitionsInTokens, this),
  //     check:    _.bind(this.boundsOfAllChecksInTokens, this),
  //     guard:    _.bind(this.boundsOfAllGuardsInTokens, this),
  //   }

  //   return _.reduce(filteredStructures, (boundsPairs, structureType) => {
  //     const pairsForStructure = structurePairFuncs[structureType](tokens);
  //     return boundsPairs.concat(pairsForStructure);
  //   }, [])
  // }

  // indexIsInsideBoundsPairs(index, boundsPairs) {
  //   if (_.isEmpty(boundsPairs)) return false;
  //   return _.any(boundsPairs, bounds => bounds[0] < index && index < bounds[1]);
  // }

  // indexOfFirstProto(tokens) {
  //   const boundsPairs = this.boundsOfAllStructuresInTokens(tokens, { except: ['proto'] });
  //   return _.findIndex(tokens, (token, index) => {
  //     if (token.name !== 'proto') return false;
  //     return this.indexIsInsideBoundsPairs(index, boundsPairs);
  //   });
  // }

  // boundsOfFirstProtoDefinitionInTokens(tokens) {
  //   const startIndex = this.indexOfFirstProto(tokens);
  //   if (startIndex === -1) return [];

  //   const protoTokens     = tokens.slice(startIndex);
  //   const validLeftTypes  = ['word'];
  //   const validRightTypes = [];
  //   const indexOfFrom     = this.indexOfBinaryOperation('protoDerivation',     protoTokens, { validLeftTypes, validRightTypes })
  //   const indexOfShaped   = this.indexOfBinaryOperation('shapeDefinition',     protoTokens, { validLeftTypes, validRightTypes })
  //   const indexOfExtends  = this.indexOfBinaryOperation('extensionDefinition', protoTokens, { validLeftTypes, validRightTypes })

  //   const lastDescriptorIndex = _.max([indexOfFrom, indexOfShaped, indexOfExtends]);
  //   const descriptorToken     = protoTokens[lastDescriptorIndex];
  //   if (lastDescriptorIndex === -1)          return [startIndex, startIndex + 1];
  //   if (lastDescriptorIndex === indexOfFrom) return [startIndex, startIndex + indexOfFrom + 1];

  //   const restOfTokens  = protoTokens.slice(lastDescriptorIndex);
  //   const boundsOfBlock = this.boundsOfFirstGroupInTokens(restOfTokens);
  //   if (_.isEmpty(boundsOfBlock)) {
  //     throw SyntaxError.at(descriptorToken, `Expected block for ${descriptorToken.name} descriptor`);
  //   }

  //   const canonicalBounds = _.map(boundsOfBlock, boundary => boundary + startIndex + lastDescriptorIndex);
  //   const endIndex        = canonicalBounds[1];
  //   return [startIndex, endIndex];
  // }

  // boundsOfAllProtoDefinitionsInTokens(tokens) {
  //   const boundsFinderFn = _.bind(this.boundsOfFirstProtoDefinitionInTokens, this);
  //   return this.findAllBoundsInTokensWith(boundsFinderFn, tokens);
  // }

  // indexOfBinaryOperation(operationName, tokens, { validLeftTypes, validRightTypes }) {
  //   const operatorNames = {
  //     assignment:             ['equals'],
  //     sequence:               ['comma'],
  //     logicalOR:              ['or'],
  //     logicalAND:             ['and'],
  //     equalityComparison:     ['equalTo', 'notEqualTo'],
  //     differentialComparison: ['greaterThan', 'greaterThanOrEqualTo', 'lessThan', 'lessThanOrEqualTo'],
  //     subtraction:            ['minus'],
  //     addition:               ['plus'],
  //     division:               ['slash'],
  //     multiplication:         ['star'],
  //     exponentiation:         ['starStar'],
  //     hashPair:               ['colon'],
  //     rocketCondition:        ['rocket'],
  //     dispatch:               ['dot'],
  //     protoDerivation:        ['from'],
  //     shapeDefinition:        ['shaped'],
  //     extensionDefinition:    ['extends'],
  //   }[operationName];

  //   if (_.isEmpty(operatorNames)) throw `Invalid binary operation '${operationName}'`;

  //   const allowProto  = _.contains(['protoDerivation', 'shapeDefinition', 'extensionDefinition'], operationName);
  //   const except      = allowProto ? ['proto'] : [];
  //   const boundsPairs = this.boundsOfAllStructuresInTokens(tokens, { except });

  //   return _.findIndex(tokens, (token, index) => {
  //     if (!_.contains(operatorNames, token.name)) return false;

  //     const isInsideStructure = this.indexIsInsideBoundsPairs(index, boundsPairs);
  //     if (isInsideStructure)                      return false;

  //     const leftIsValid = (
  //       _.contains(validLeftTypes, leftToken.type) ||
  //       leftToken.name === 'identifier'            ||
  //       this.isCloseGroupToken(leftToken)
  //     );
  //     if (!leftIsValid)                           return false;

  //     const rightIsValid = (
  //       _.contains(validRightTypes, rightToken.type) ||
  //       rightToken.name === 'identifier'             ||
  //       this.isOpenGroupToken(rightToken)
  //     );
  //     if (!rightIsValid)                          return false;

  //     return true;
  //   });
  // }

  // indexOfComparisonOperation(operationName, tokens) {
  //   const validLeftTypes  = ['word', 'string', 'number', 'regex'];
  //   const validRightTypes = ['word', 'string', 'number', 'regex', 'operator'];
  //   return this.indexOfBinaryOperation(operationName, tokens, { validLeftTypes, validRightTypes });
  // }

  // indexOfAssignment(tokens) {
  //   const validLeftTypes  = ['word'];
  //   const validRightTypes = ['word', 'string', 'number', 'regex', 'operator'];
  //   return this.indexOfBinaryOperation('assignment', tokens, { validLeftTypes, validRightTypes });
  // }

  // indexOfSequence(tokens) {
  //   const validLeftTypes  = ['word', 'string', 'number', 'regex'];
  //   const validRightTypes = ['word', 'string', 'number', 'regex', 'operator'];
  //   return this.indexOfBinaryOperation('sequence', tokens, { validLeftTypes, validRightTypes });
  // }

  // indexOfLogicalOR(tokens) {
  //   return this.indexOfComparisonOperation('logicalOR', tokens);
  // }

  // indexOfLogicalAND(tokens) {
  //   return this.indexOfComparisonOperation('logicalAND', tokens);
  // }

  // indexOfEqualityComparison(tokens) {
  //   return this.indexOfComparisonOperation('equalityComparison', tokens);
  // }

  // indexOfDifferentialComparison(tokens) {
  //   return this.indexOfComparisonOperation('differentialComparison', tokens);
  // }

  // indexOfSubtraction(tokens) {
  //   const validLeftTypes  = ['word', 'number', 'string'];
  //   const validRightTypes = ['word', 'number', 'string', 'regex', 'operator'];
  //   return this.indexOfBinaryOperation('subtraction', tokens, { validLeftTypes, validRightTypes });
  // }

  // indexOfAddition(tokens) {
  //   const validLeftTypes  = ['word', 'number', 'string'];
  //   const validRightTypes = ['word', 'number', 'string', 'operator'];
  //   return this.indexOfBinaryOperation('addition', tokens, { validLeftTypes, validRightTypes });
  // }

  // indexOfDivision(tokens) {
  //   const validLeftTypes  = ['word', 'number'];
  //   const validRightTypes = ['word', 'number', 'regex', 'operator'];
  //   return this.indexOfBinaryOperation('division', tokens, { validLeftTypes, validRightTypes });
  // }

  // indexOfMultiplication(tokens) {
  //   const validLeftTypes  = ['word', 'number', 'string'];
  //   const validRightTypes = ['word', 'number', 'operator'];
  //   return this.indexOfBinaryOperation('multiplication', tokens, { validLeftTypes, validRightTypes });
  // }

  // indexOfExponentiation(tokens) {
  //   const validLeftTypes  = ['word', 'number'];
  //   const validRightTypes = ['word', 'number', 'operator'];
  //   return this.indexOfBinaryOperation('exponentiation', tokens, { validLeftTypes, validRightTypes });
  // }

  // indexOfHashColon(tokens) {
  //   const validLeftTypes    = ['word', 'number', 'string', 'regex'];
  //   const validRightTypes   = ['word', 'number', 'string', 'regex', 'operator'];
  //   const indexOfFirstColon = this.indexOfBinaryOperation('hashPair', tokens, { validLeftTypes, validRightTypes })
  //   if (indexOfFirstColon === -1) return -1;

  //   const tokenBeforeColon = tokens[indexOfFirstColon - 1];
  //   if (_.isUndefined(tokenBeforeColon)) return -1;

  //   const tokenAfterColon = tokens[indexOfFirstColon + 1];
  //   if (_.isUndefined(tokenAfterColon)) return -1;

  //   const firstColonToken   = tokens[indexOfFirstColon];
  //   const linesBeforeColon  = this.linesBetween(tokenBeforeColon, firstColonToken);
  //   if (linesBeforeColon > 0) return -1;

  //   const linesAfterColon  = this.linesBetween(firstColonToken, tokenAfterColon);
  //   const spacesAfterColon = this.columnsBetween(firstColonToken, tokenAfterColon);
  //   if (linesAfterColon === 0 && spacesAfterColon === 0) return -1;

  //   return indexOfFirstColon;
  // }

  // indexOfRocket(tokens) {
  //   const validLeftTypes  = ['word', 'number', 'string', 'regex'];
  //   const validRightTypes = ['word', 'number', 'string', 'regex', 'operator'];
  //   return this.indexOfBinaryOperation('rocketCondition', tokens, { validLeftTypes, validRightTypes });
  // }

  // indexOfDispatch(tokens) {
  //   const validLeftTypes  = ['word', 'number', 'string', 'regex'];
  //   const validRightTypes = ['word'];
  //   return this.indexOfBinaryOperation('dispatch', tokens, { validLeftTypes, validRightTypes });
  // }

  // indexOfFunctionCall(tokens, offset = 0) {
  //   const boundsOfFirstGroup = this.boundsOfFirstGroupInTokens(tokens);
  //   if (_.isEmpty(boundsOfFirstGroup)) return -1;

  //   const indexOfOpenToken  = boundsOfFirstGroup[0];
  //   const boundsPairs       = this.boundsOfAllStructuresInTokens(tokens, { except: 'group' });
  //   const isInsideStructure = this.indexIsInsideBoundsPairs(index, boundsPairs);
  //   if (isInsideStructure)             return -1;

  //   const openToken = tokens[indexOfOpenToken];
  //   const leftToken = tokens[indexOfOpenToken - 1];
  //   if (openToken.name === 'openParen' && leftToken) {
  //     const validTypes = ['word', 'string', 'number'];
  //     const validNames = ['closeParen', 'closeBracket', 'closeBrace'];
  //     if (_.contains(validTypes, leftToken.type) || _.contains(validNames, leftToken.name)) {
  //       return indexOfOpenToken + offset;
  //     }
  //   }

  //   const indexOfCloseToken = boundsOfFirstGroup[1];
  //   const restOfTokens      = tokens.slice(indexOfCloseToken);
  //   const currentOffset     = indexOfCloseToken + offset;
  //   return this.indexOfFunctionCall(restOfTokens, currentOffset);
  // }

  // // Given a set of tokens, returns the tokens up to the end of the first line (or spanning
  // // multiple lines if there are grouping symbols), to the end of the contiguous "statement".
  // // Does not include the block of a function/proto definition, etc., as blocks are multiple
  // // statements, so I'm just gonna treat the definition statement as a single entity for now
  // // and validate/construct the definition block somewhere else.
  // // EDIT: ...SLASH TODO: CONSIDER SURROUNDING FUNCTION DEFS W/ CURLY BRACES MAYBE
  // firstStatementFromTokens(tokens) {
  //   if (_.isEmpty(tokens)) return [];

  //   const boundsPairs     = this.boundsOfAllStructuresInTokens(tokens);
  //   const statementEndPos = _.findIndex(tokens, (currentToken, index) => {
  //     const nextToken = tokens[index + 1];
  //     if (_.isUndefined(nextToken))             return true;

  //     const isInsideStructure = this.indexIsInsideBoundsPairs(index + 1, boundsPairs);
  //     if (isInsideStructure)                    return false;

  //     if (nextToken.line === currentToken.line) return false;

  //     const currentTokens = _.first(tokens, index + 1);
  //     return this.hasBalancedGrouping(currentTokens);
  //   });

  //   return _.first(tokens, statementEndPos + 1);
  // }

  // identityNode(token) {
  //   const validIdentityTypes = ['word', 'string', 'number', 'regex'];
  //   if (!_.contains(validIdentityTypes, token.type)) {
  //     throw SyntaxError.at(token, 'Expected to find valid identity token');
  //   }

  //   return {
  //     operation: 'identity',
  //     token,
  //   };
  // }

  // unaryOperationNode(operationName, tokens) {
  //   const operatorToken = _.first(tokens);
  //   const rightTokens   = _.rest(tokens);

  //   const validUnaryOperatorNames = ['plus', 'minus', 'not'];
  //   if (!_.contains(validUnaryOperatorNames, operatorToken.name)) {
  //     throw SyntaxError.at(operatorToken, `Expected to find ${operationName}`);
  //   }

  //   return {
  //     operation: operationName,
  //     token:     operatorToken,
  //     rightNode: this.pemdasNodeFromStatement(rightTokens),
  //   };
  // }

  // binaryOperationNode(operationName, operatorIndex, tokens) {
  //   const tokenNames = {
  //     subtraction:    ['minus'],
  //     addition:       ['plus'],
  //     division:       ['slash'],
  //     multiplication: ['star'],
  //     exponentiation: ['starStar'],
  //     assignment:     ['equals'],
  //     dispatch:       ['dot'],
  //     comparison: [
  //       'equalTo',
  //       'greaterThan',
  //       'greaterThanOrEqualTo',
  //       'lessThan',
  //       'lessThanOrEqualTo',
  //       'notEqualTo',
  //     ],
  //     boolean: [
  //       'and',
  //       'or',
  //     ],
  //   }[operationName];

  //   const operatorToken = tokens[operatorIndex];
  //   if (!_.contains(tokenNames, operatorToken.name)) {
  //     throw SyntaxError.at(operatorToken, `Expected to find ${operationName}`);
  //   }

  //   const leftTokens = _.first(tokens, operatorIndex);
  //   if (_.isEmpty(leftTokens)) {
  //     throw SyntaxError.at(operatorToken, `Found no left-hand side for ${operationName}`);
  //   }

  //   const rightTokens = tokens.slice(operatorIndex + 1);
  //   if (_.isEmpty(rightTokens)) {
  //     throw SyntaxError.at(operatorToken, `Found no right-hand side for ${operationName}`);
  //   }

  //   return {
  //     operation: operationName,
  //     token:     operatorToken,
  //     leftNode:  this.pemdasNodeFromStatement(leftTokens),
  //     rightNode: this.pemdasNodeFromStatement(rightTokens),
  //   };
  // }

  // sequenceNode(firstCommaIndex, tokens) {
  //   const firstComma = tokens[firstCommaIndex];
  //   if (firstComma.name !== 'comma') {
  //     throw SyntaxError.at(firstComma, 'Expected to find comma');
  //   }

  //   const sequenceSets = _.reduce(tokens, (sets, token) => {
  //     if (token.name === 'comma') {
  //       sets.push([]);
  //     } else {
  //       _.last(sets).push(token);
  //     }

  //     return sets;
  //   }, [[]]);

  //   const sequenceNodes = _.map(sequenceSets, set => this.pemdasNodeFromStatement(set));

  //   return {
  //     operation:  'sequence',
  //     startToken: _.first(tokens),
  //     endToken:   _.last(tokens),
  //     sequenceNodes,
  //   };
  // }

  // groupNode(operationName, tokens) {
  //   const correctOpenTokenName = {
  //     parenGroup:   'openParen',
  //     bracketGroup: 'openBracket',
  //     braceGroup:   'openBrace',
  //   }[operationName];

  //   const openToken = _.first(tokens);
  //   if (openToken.name !== correctOpenTokenName) {
  //     throw SyntaxError.at(openToken, `Expected ${operationName} opening symbol`);
  //   }

  //   const closeToken = _.last(tokens);
  //   if (!this.openTokenMatchesCloser(openToken, closeToken)) {
  //     throw SyntaxError.at(closeToken, `Expected ${operationName} closing symbol`);
  //   }

  //   const innerTokens = tokens.slice(1, -1);

  //   return {
  //     operation: operationName,
  //     openToken,
  //     closeToken,
  //     innerNode: this.pemdasNodeFromStatement(innerTokens),
  //   };
  // }

  // startsWithPropDefinition(tokens) {
  //   const [nameToken, colonToken, typeToken] = tokens;
  //   if (_.isUndefined(nameToken)  || nameToken.name  !== 'identifier') return false;
  //   if (_.isUndefined(colonToken) || colonToken.name !== 'colon')      return false;
  //   if (_.isUndefined(typeToken)  || typeToken.type  !== 'word')       return false;
  //   if (nameToken.line !== colonToken.line)                            return false;
  //   if (colonToken.line !== typeToken.line)                            return false;

  //   const spacesBeforeColon = this.columnsBetween(nameToken, colonToken);
  //   const spacesAfterColon  = this.columnsBetween(colonToken, typeToken);
  //   if (spacesBeforeColon > 0 || spacesAfterColon > 0) return false;

  //   return true;
  // }

  // startsWithPropDefault(tokens) {
  //   if (!this.startsWithPropDefinition(tokens))      return false;
  //   const defaultToken = tokens[3];
  //   if (defaultToken && defaultToken.name === 'set') return false;
  //   return true;
  // }

  // startsWithPropSetter(tokens) {
  //   if (!this.startsWithPropDefinition(tokens))             return false;
  //   const setToken = tokens[3];
  //   if (_.isUndefined(setToken) || setToken.name !== 'set') return false;
  //   return true;
  // }

  // startsWithFnDeclaration(tokens) {
  //   const [defToken, nameToken] = tokens;
  //   if (_.isUndefined(defToken)  || defToken.name  !== 'def')        return false;
  //   if (_.isUndefined(nameToken) || nameToken.name !== 'identifier') return false;

  //   const argBounds = this.boundsOfFirstGroupInTokens(tokens);
  //   if (argBounds[0] !== 2)                                          return false;

  //   const colonToken = tokens[argBounds[1] + 1];
  //   if (_.isUndefined(colonToken) || colonToken.name !== 'colon')    return false;

  //   return true;
  // }

  // startsWithAnonFn(tokens) {
  //   const argBounds = this.boundsOfFirstGroupInTokens(tokens);
  //   if (argBounds[0] !== 0)                                       return false;

  //   const colonToken = tokens[argBounds[1] + 1];
  //   if (_.isUndefined(colonToken) || colonToken.name !== 'colon') return false;

  //   return true;
  // }

  // linesBetween(firstToken = {}, secondToken = {}) {
  //   return Math.abs(firstToken.line - secondToken.line);
  // }

  // columnsBetween(firstToken = { lexeme: '' }, secondToken = { lexeme: '' }) {
  //   const [startToken, endToken] = _.sortBy([firstToken, secondToken], 'column');
  //   const startCol = startToken.column + startToken.lexeme.length;
  //   const endCol   = endToken.column;
  //   return endCol - startCol;
  // }

  // anonFnDefinitionNode(tokens) {
  //   const argBounds = this.boundsOfFirstGroupInTokens(tokens);
  //   if (argBounds[0] !== 0) {
  //     throw SyntaxError.at(tokens[0], 'Expected arguments to begin the anonymous function');
  //   }

  //   const colonIndex = argBounds[1] + 1;
  //   const colonToken = tokens[colonIndex];
  //   if (_.isUndefined(colonToken) || colonToken.name !== 'colon') {
  //     throw SyntaxError.at(colonToken, 'Expected valid function definition');
  //   }

  //   const tokenAfterColon = tokens[colonIndex + 1];
  //   const linesAfterColon = this.linesBetween(colonToken, tokenAfterColon);
  //   const colsAfterColon  = this.columnsBetween(colonToken, tokenAfterColon);
  //   const typeToken       = (linesAfterColon === 0 && colsAfterColon === 0) ? tokenAfterColon : undefined;
  //   const argTokens       = tokens.slice(argBounds[0] + 1, argBounds[1])
  //   const blockStartIndex = colonIndex + (_.isUndefined(typeToken) ? 1 : 2);
  //   const blockTokens     = tokens.slice(blockStartIndex);

  //   return {
  //     operation: 'anonFnDefinition',
  //     colonToken,
  //     typeToken,
  //     argumentsNode: this.pemdasNodeFromStatement(argTokens),
  //     blockNodes:    this.traverse(blockTokens),
  //   };
  // }

  // fnDeclarationNode(tokens) {
  //   const defToken = tokens[0];
  //   if (_.isUndefined(defToken) || defToken.name !== 'def') {
  //     throw SyntaxError.at(defToken, 'Expected "def" to start the function declaration');
  //   }

  //   const nameToken = tokens[1];
  //   if (_.isUndefined(nameToken) || nameToken.name !== 'identifier') {
  //     throw SyntaxError.at(nameToken, 'Expected the function declaration to have a valid name');
  //   }

  //   const argBounds = this.boundsOfFirstGroupInTokens(tokens);
  //   if (argBounds[0] !== 2) {
  //     throw SyntaxError.at(nameToken, 'Expected arguments for function declaration after name');
  //   }

  //   const colonIndex = argBounds[1] + 1;
  //   const colonToken = tokens[colonIndex];
  //   if (_.isUndefined(colonToken) || colonToken.name !== 'colon') {
  //     throw SyntaxError.at(colonToken, 'Expected valid function declaration');
  //   }

  //   const tokenAfterColon = tokens[colonIndex + 1];
  //   const linesAfterColon = this.linesBetween(colonToken, tokenAfterColon);
  //   const colsAfterColon  = this.columnsBetween(colonToken, tokenAfterColon);
  //   const typeToken       = (linesAfterColon === 0 && colsAfterColon === 0) ? tokenAfterColon : undefined;
  //   const argTokens       = tokens.slice(argBounds[0] + 1, argBounds[1]);
  //   const blockStartIndex = colonIndex + (_.isUndefined(typeToken) ? 1 : 2);
  //   const blockTokens     = tokens.slice(blockStartIndex);

  //   return {
  //     operation: 'fnDeclaration',
  //     nameToken,
  //     colonToken,
  //     typeToken,
  //     argumentsNode: this.pemdasNodeFromStatement(argTokens),
  //     blockNodes:    this.traverse(blockTokens),
  //   };
  // }

  // propDefaultNode(tokens) {
  //   const nameToken = tokens[0];
  //   if (_.isUndefined(nameToken) || nameToken.name !== 'identifier') {
  //     throw SyntaxError.at(nameToken, 'Expected the prop default to have a valid name');
  //   }

  //   const colonToken = tokens[1];
  //   if (_.isUndefined(colonToken) || colonToken.name !== 'colon') {
  //     throw SyntaxError.at(colonToken, 'Expected valid prop default definition');
  //   }

  //   const typeToken       = tokens[2];
  //   const linesAfterColon = this.linesBetween(colonToken, typeToken);
  //   const colsAfterColon  = this.columnsBetween(colonToken, typeToken);
  //   const typePosIsValid  = linesAfterColon === 0 && colsAfterColon === 0;
  //   if (_.isUndefined(typeToken) || !typePosIsValid || typeToken.type !== 'word') {
  //     throw SyntaxError.at(colonToken, 'Prop must specify a type');
  //   }

  //   const blockTokens = tokens.slice(3);

  //   return {
  //     operation: 'propDefault',
  //     nameToken,
  //     colonToken,
  //     typeToken,
  //     blockNodes: this.traverse(blockTokens),
  //   };
  // }

  // propSetterNode(tokens) {
  //   const nameToken = tokens[0];
  //   if (_.isUndefined(nameToken) || nameToken.name !== 'identifier') {
  //     throw SyntaxError.at(nameToken, 'Expected the prop default to have a valid name');
  //   }

  //   const colonToken = tokens[1];
  //   if (_.isUndefined(colonToken) || colonToken.name !== 'colon') {
  //     throw SyntaxError.at(colonToken, 'Expected valid prop default definition');
  //   }

  //   const typeToken       = tokens[2];
  //   const linesAfterColon = this.linesBetween(colonToken, typeToken);
  //   const colsAfterColon  = this.columnsBetween(colonToken, typeToken);
  //   const typePosIsValid  = linesAfterColon === 0 && colsAfterColon === 0;
  //   if (_.isUndefined(typeToken) || !typePosIsValid || typeToken.type !== 'word') {
  //     throw SyntaxError.at(colonToken, 'Prop must specify a type');
  //   }

  //   const setToken       = tokens[3];
  //   const linesAfterType = this.linesBetween(typeToken, setToken);
  //   if (_.isUndefined(setToken) || linesAfterType !== 0) {
  //     throw SyntaxError.at(typeToken, 'Expected prop setter "set" keyword after specifying type');
  //   }

  //   const blockTokens = tokens.slice(4);

  //   return {
  //     operation: 'propSetter',
  //     nameToken,
  //     colonToken,
  //     typeToken,
  //     blockNodes: this.traverse(blockTokens),
  //   };
  // }

  // functionCallNode(indexOfOpenToken, tokens) {
  //   const openToken = tokens[indexOfOpenToken];
  //   const leftToken = tokens[indexOfOpenToken - 1];

  //   if (!openToken || !leftToken || openToken.name !== 'openParen') {
  //     throw SyntaxError.at(openToken, 'Expected function call');
  //   }

  //   const validLeftTypes = ['word', 'string', 'number'];
  //   const validLeftNames = ['closeParen', 'closeBracket', 'closeBrace'];
  //   if (!(_.contains(validLeftTypes, leftToken.type) || _.contains(validLeftNames, leftToken.name))) {
  //     throw SyntaxError.at(leftToken, 'Invalid function callee');
  //   }

  //   const calleeTokens = _.first(tokens, indexOfOpenToken);
  //   const restOfTokens = tokens.slice(indexOfOpenToken);
  //   const boundsOfArgs = this.boundsOfFirstGroupInTokens(restOfTokens);

  //   if (_.isEmpty(boundsOfArgs)) {
  //     throw SyntaxError.at(openToken, 'Incomplete argument group for function call');
  //   }

  //   const closeToken      = restOfTokens[boundsOfArgs[1]];
  //   const argumentsTokens = restOfTokens.slice(boundsOfArgs[0] + 1, boundsOfArgs[1]);

  //   return {
  //     operation: 'functionCall',
  //     openToken,
  //     closeToken,
  //     calleeNode:    this.pemdasNodeFromStatement(calleeTokens),
  //     argumentsNode: this.pemdasNodeFromStatement(argumentsTokens),
  //   };
  // }

  // hashPairNode(indexOfHashColon, tokens) {
  //   const colonToken = tokens[indexOfHashColon];
  //   if (colonToken.name !== 'colon') {
  //     throw SyntaxError.at(colonToken, 'Expected to find a hash pair colon');
  //   }

  //   const leftTokens = _.first(tokens, indexOfHashColon);
  //   if (_.isEmpty(leftTokens)) {
  //     throw SyntaxError.at(colonToken, 'Found no left-hand side (key) for the hash pair');
  //   }

  //   const rightTokens = tokens.slice(indexOfHashColon + 1);
  //   if (_.isEmpty(rightTokens)) {
  //     throw SyntaxError.at(colonToken, 'Found no right-hand side (value) for the hash pair');
  //   }

  //   return {
  //     operation: 'hashPair',
  //     token:     colonToken,
  //     keyNode:   this.pemdasNodeFromStatement(leftTokens),
  //     valueNode: this.pemdasNodeFromStatement(rightTokens),
  //   };
  // }

  // protoDefinitionNode(tokens) {
  //   const protoToken = tokens[0];
  //   if (protoToken.name !== 'proto') throw SyntaxError.at(protoToken, 'Expected proto definition to begin');

  //   const validLeftTypes  = ['word'];
  //   const validRightTypes = [];
  //   const indexOfFrom     = this.indexOfBinaryOperation('protoDerivation',     tokens, { validLeftTypes, validRightTypes });
  //   const indexOfShaped   = this.indexOfBinaryOperation('shapeDefinition',     tokens, { validLeftTypes, validRightTypes });
  //   const indexOfExtends  = this.indexOfBinaryOperation('extensionDefinition', tokens, { validLeftTypes, validRightTypes });

  //   const derivationToken       = tokens[indexOfFrom] && tokens[indexOfFrom + 1];
  //   const shapeBlockBounds      = indexOfShaped  === -1 ? [] : this.boundsOfFirstGroupInTokens(tokens.slice(indexOfShaped));
  //   const extendBlockBounds     = indexOfExtends === -1 ? [] : this.boundsOfFirstGroupInTokens(tokens.slice(indexOfExtends));
  //   const canonicalShapeBounds  = _.map(shapeBlockBounds,  boundary => boundary + indexOfShaped);
  //   const canonicalExtendBounds = _.map(extendBlockBounds, boundary => boundary + indexOfExtends);

  //   // hacky bullshit that needs to be rewritten ASAP
  //   const shapeTokens     = tokens.slice((canonicalShapeBounds[0]  || -1) + 1, (canonicalShapeBounds[1]  || 0));
  //   const extensionTokens = tokens.slice((canonicalExtendBounds[0] || -1) + 1, (canonicalExtendBounds[1] || 0));

  //   return {
  //     operation: 'protoDefinition',
  //     protoToken,
  //     derivationToken,
  //     shapeBlockNodes:  this.traverse(shapeTokens),
  //     extendBlockNodes: this.traverse(extensionTokens),
  //   };
  // }

  // rocketConditionNode(tokens) {
  //   const rocketIndex = this.indexOfRocket(tokens);
  //   if (rocketIndex === -1) {
  //     throw SyntaxError.at(tokens[0], 'Expected rocket condition to begin');
  //   }

  //   const boundsOfCondish = this.boundsOfFirstRocketConditionInTokens(tokens);
  //   const [startIndex, endIndex] = boundsOfCondish;
  //   if (startIndex !== 0) {
  //     throw SyntaxError.at(tokens[0], 'Expected rocket condition to begin');
  //   }

  //   const rocketToken = tokens[rocketIndex];
  //   const leftTokens  = _.first(tokens, rocketIndex);
  //   const rightTokens = tokens.slice(rocketIndex + 1, endIndex);

  //   return {
  //     operation: 'rocketCondition',
  //     rocketToken,
  //     leftNodes:  this.traverse(leftTokens),
  //     rightNodes: this.traverse(rightTokens),
  //   };
  // }

  // exhaustConditionNode(tokens) {
  //   const exhaustToken = tokens[0];
  //   if (exhaustToken.name !== 'exhaust') {
  //     throw SyntaxError.at(exhaustToken, 'Expected exhaust condition to begin');
  //   }

  //   return {
  //     operation: 'exhaustCondition',
  //     exhaustToken,
  //     rightNodes: this.traverse(tokens.slice(1)),
  //   };
  // }

  // conditionNodes(tokens, nodeList = []) {
  //   const indexOfRocket = this.indexOfRocket(tokens);
  //   if (indexOfRocket === -1) {
  //     if (firstToken.name === 'exhaust') {
  //       const exhaustNode = this.exhaustConditionNode(tokens);
  //       nodeList.push(exhaustNode);
  //     }
  //     return nodeList;
  //   }

  //   const boundsOfCondition = this.boundsOfFirstRocketConditionInTokens(tokens);
  //   if (_.isEmpty(boundsOfCondition)) {
  //     throw SyntaxError.at(tokens[indexOfRocket], 'Expected rocket condition');
  //   }

  //   const [conditionStartIndex, conditionEndIndex] = boundsOfCondition;
  //   const conditionTokens = tokens.slice(conditionStartIndex, conditionEndIndex + 1);
  //   const rocketNode      = this.rocketConditionNode(conditionTokens);
  //   const restOfTokens    = tokens.slice(conditionEndIndex + 1);
  //   nodeList.push(rocketNode);

  //   return this.conditionNodes(restOfTokens, nodeList);
  // }

  // conditionalNode(conditionalOperatorName, tokens) {
  //   const conditionalToken = tokens[0];
  //   if (conditionalToken.name !== conditionalOperatorName) {
  //     throw SyntaxError.at(conditionalToken, `Expected ${conditionalOperatorName} to begin`);
  //   }

  //   const tokenName       = `${conditionalOperatorName}Token`;
  //   const argBounds       = this.boundsOfFirstGroupInTokens(tokens);
  //   const argOpenIndex    = argBounds[0];
  //   const argCloseIndex   = argBounds[1];
  //   const hasArgs         = argOpenIndex === 1 && tokens[1].name === 'openParen';
  //   const argumentsNode   = hasArgs ? this.pemdasNodeFromStatement(tokens.slice(argOpenIndex + 1, argCloseIndex)) : undefined;
  //   const boundsOfCondish = this.boundsOfFirstConditionalInTokens(conditionalOperatorName, tokens);
  //   const blockStartIndex = hasArgs ? argCloseIndex + 1 : 1;
  //   const blockEndIndex   = boundsOfCondish[1];
  //   const blockTokens     = tokens.slice(blockStartIndex, blockEndIndex + 1);

  //   return {
  //     operation:   conditionalOperatorName,
  //     [tokenName]: conditionalToken,
  //     argumentsNode,
  //     conditionNodes: this.conditionNodes(blockTokens),
  //   };
  // }

  // checkNode(tokens) {
  //   return this.conditionalNode('check', tokens);
  // }

  // guardNode(tokens) {
  //   return this.conditionalNode('guard', tokens);
  // }

  // pemdasNodeFromStatement(statementTokens) {
  //   if (_.isEmpty(statementTokens)) {
  //     return null;
  //   }

  //   if (statementTokens.length === 1) {
  //     return this.identityNode(statementTokens[0]);
  //   }

  //   const indexOfSequence = this.indexOfSequence(statementTokens);
  //   if (indexOfSequence !== -1) {
  //     return this.sequenceNode(indexOfSequence, statementTokens);
  //   }

  //   const indexOfAssignment = this.indexOfAssignment(statementTokens);
  //   if (indexOfAssignment !== -1) {
  //     return this.binaryOperationNode('assignment', indexOfAssignment, statementTokens);
  //   }

  //   const indexOfLogicalOR = this.indexOfLogicalOR(statementTokens);
  //   if (indexOfLogicalOR !== -1) {
  //     return this.binaryOperationNode('boolean', indexOfLogicalOR, statementTokens);
  //   }

  //   const indexOfLogicalAND = this.indexOfLogicalAND(statementTokens);
  //   if (indexOfLogicalAND !== -1) {
  //     return this.binaryOperationNode('boolean', indexOfLogicalAND, statementTokens);
  //   }

  //   const indexOfEqualityComparison = this.indexOfEqualityComparison(statementTokens);
  //   if (indexOfEqualityComparison !== -1) {
  //     return this.binaryOperationNode('comparison', indexOfEqualityComparison, statementTokens);
  //   }

  //   const indexOfDifferentialComparison = this.indexOfDifferentialComparison(statementTokens);
  //   if (indexOfDifferentialComparison !== -1) {
  //     return this.binaryOperationNode('comparison', indexOfDifferentialComparison, statementTokens);
  //   }

  //   const indexOfAddition      = this.indexOfAddition(statementTokens);
  //   const indexOfSubtraction   = this.indexOfSubtraction(statementTokens);
  //   const firstLinearMathIndex = _.min(_.without([indexOfAddition, indexOfSubtraction], -1));
  //   switch (firstLinearMathIndex) {
  //     case indexOfAddition:    return this.binaryOperationNode('addition',    indexOfAddition,    statementTokens);
  //     case indexOfSubtraction: return this.binaryOperationNode('subtraction', indexOfSubtraction, statementTokens);
  //     default: break; // to satisfy eslint
  //   }

  //   const indexOfDivision       = this.indexOfDivision(statementTokens);
  //   const indexOfMultiplication = this.indexOfMultiplication(statementTokens);
  //   const firstPlanarMathIndex  = _.min(_.without([indexOfDivision, indexOfMultiplication], -1));
  //   switch (firstPlanarMathIndex) {
  //     case indexOfDivision:       return this.binaryOperationNode('division',       indexOfDivision,       statementTokens);
  //     case indexOfMultiplication: return this.binaryOperationNode('multiplication', indexOfMultiplication, statementTokens);
  //     default: break; // to satisfy eslint
  //   }

  //   const indexOfExponentiation = this.indexOfExponentiation(statementTokens);
  //   if (indexOfExponentiation !== -1) {
  //     return this.binaryOperationNode('exponentiation', indexOfExponentiation, statementTokens);
  //   }

  //   const firstToken = _.first(statementTokens);
  //   switch (firstToken.name) {
  //     case 'minus': return this.unaryOperationNode('negation',       statementTokens);
  //     case 'plus':  return this.unaryOperationNode('substantiation', statementTokens);
  //     case 'not':   return this.unaryOperationNode('inversion',      statementTokens);
  //     case 'proto': return this.protoDefinitionNode(statementTokens);
  //     case 'check': return this.checkNode(statementTokens);
  //     case 'guard': return this.guardNode(statementTokens);
  //     default: break; // to satisfy eslint
  //   }

  //   const indexOfHashColon = this.indexOfHashColon(statementTokens);
  //   if (indexOfHashColon !== -1) {
  //     return this.hashPairNode(indexOfHashColon, statementTokens);
  //   }

  //   const isAnonymousFn   = this.startsWithAnonFn(statementTokens);
  //   const isFnDeclaration = !isAnonymousFn && this.startsWithFnDeclaration(statementTokens);
  //   const isPropDefault   = !isAnonymousFn && !isFnDeclaration && this.startsWithPropDefault(statementTokens);
  //   const isPropSetter    = !isAnonymousFn && !isFnDeclaration && !isPropDefault && this.startsWithPropSetter(statementTokens);

  //   switch (true) {
  //     case isAnonymousFn:   return this.anonFnDefinitionNode(statementTokens);
  //     case isFnDeclaration: return this.fnDeclarationNode(statementTokens);
  //     case isPropDefault:   return this.propDefaultNode(statementTokens);
  //     case isPropSetter:    return this.propSetterNode(statementTokens);
  //     default: break; // to satisfy eslint
  //   }

  //   const indexOfDispatch     = this.indexOfDispatch(statementTokens);
  //   const indexOfFunctionCall = this.indexOfFunctionCall(statementTokens);
  //   const firstAccessionIndex = _.min(_.without([indexOfDispatch, indexOfFunctionCall], -1));
  //   switch (firstAccessionIndex) {
  //     case indexOfDispatch:     return this.binaryOperationNode('dispatch', indexOfDispatch, statementTokens);
  //     case indexOfFunctionCall: return this.functionCallNode(indexOfFunctionCall, statementTokens);
  //     default: break; // to satisfy eslint
  //   }

  //   switch (firstToken.name) {
  //     case 'openParen':   return this.groupNode('parenGroup',   statementTokens);
  //     case 'openBracket': return this.groupNode('bracketGroup', statementTokens);
  //     case 'openBrace':   return this.groupNode('braceGroup',   statementTokens);
  //     default: break; // to satisfy eslint
  //   }

  //   const lastToken = _.last(statementTokens);
  //   throw SyntaxError.between(firstToken, lastToken, 'Unrecognized statement');
  // }
}
