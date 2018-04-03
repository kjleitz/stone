import _       from 'underscore';
import GRAMMAR from '../utils/grammar';

class TokenUtil {
  static typeIsSignificant(tokenType) {
    return !_.contains(GRAMMAR.ignorableTypes, tokenType);
  }

  static firstCharRegexForType(type) {
    return GRAMMAR.firstCharMatches[type];
  }

  static fullRegexForType(type) {
    return GRAMMAR.fullMatches[type];
  }

  static nameForLexemeByType(lexeme, type) {
    const names = GRAMMAR.names[type];
    if (_.isUndefined(names)) return 'literal';

    const name = names[lexeme];
    if (type === 'word' && _.isUndefined(name)) return 'identifier';

    return name;
  }

  // returns an array of token types
  static typesForFirstChar(firstChar) {
    return _.filter(GRAMMAR.types, (type) => {
      const firstCharRegex = this.firstCharRegexForType(type);
      return !!firstChar.match(firstCharRegex);
    });
  }

  // returns a token type for a string STARTING with a token
  static firstTypeForString(stringStartingWithToken) {
    const firstChar     = stringStartingWithToken[0];
    const possibleTypes = this.typesForFirstChar(firstChar);
    return _.find(possibleTypes, (type) => {
      const matchedStr = this.firstSubstringMatchForType(stringStartingWithToken, type);
      return !!matchedStr;
    });
  }

  // returns a leading substring that matches the type given
  static firstSubstringMatchForType(stringStartingWithToken, type) {
    const fullRegex = this.fullRegexForType(type);
    const matched   = stringStartingWithToken.match(fullRegex);
    return matched ? matched[0] : '';
  }

  static isOpenGroupToken(token) {
    if (token.type !== 'grouping') return false;
    return _.contains(['openParen', 'openBracket', 'openBrace'], token.name);
  }

  static isCloseGroupToken(token) {
    if (token.type !== 'grouping') return false;
    return _.contains(['closeParen', 'closeBracket', 'closeBrace'], token.name);
  }

  static openTokenMatchesCloser(openToken, closeToken) {
    if (_.isUndefined(openToken) || _.isUndefined(closeToken))           return false;
    if (openToken.type !== 'grouping' || closeToken.type !== 'grouping') return false;
    const validCloserFor = { '(': ')', '[': ']', '{': '}' };
    const validOpeners   = _.keys(validCloserFor);
    const openerIsValid  = _.contains(validOpeners, openToken.lexeme);
    const closerIsValid  = closeToken.lexeme === validCloserFor[openToken.lexeme];
    return openerIsValid && closerIsValid;
  }

  static linesBetween(firstToken = {}, secondToken = {}) {
    return Math.abs(firstToken.line - secondToken.line);
  }

  static columnsBetween(firstToken = { lexeme: '' }, secondToken = { lexeme: '' }) {
    const [startToken, endToken] = _.sortBy([firstToken, secondToken], 'column');
    const startCol = startToken.column + startToken.lexeme.length;
    const endCol   = endToken.column;
    return endCol - startCol;
  }
}

export default TokenUtil;
