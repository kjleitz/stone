import _            from 'underscore';
import StringParser from '../parse/string_parser';
import { LexError } from '../errors/errors';

class Token {
  static firstFrom(fileText, options = { at: 0 }) {
    const charIndex  = options.at || 0;
    const fileParser = new StringParser(fileText);
    const restParser = new StringParser(fileParser.textAfter(charIndex));

    const type   = restParser.leadingType();
    if (_.isUndefined(type)) throw new LexError(fileText).at(charIndex, 'Token type is undefined');

    const lexeme = restParser.leadingLexeme();
    if (_.isEmpty(lexeme))   throw new LexError(fileText).at(charIndex, 'Token lexeme is empty');

    const name   = restParser.leadingName();
    if (_.isUndefined(name)) throw new LexError(fileText).at(charIndex, 'Token name is undefined');

    const line   = fileParser.lineNumAt(charIndex);
    const column = fileParser.colNumAt(charIndex);
    const indent = fileParser.indentLevelAt(charIndex);

    return {
      type,
      lexeme,
      name,
      line,
      column,
      indent,
    };
  }
}

export default Token;
