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
}
