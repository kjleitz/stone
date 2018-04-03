import Token     from '../leaves/token';
import TokenUtil from '../utils/token_util';

class Lexer {
  constructor(fileText) {
    this.fileText = fileText;
  }

  traverse(tokenList = [], currentCharIndex = 0) {
    if (currentCharIndex >= this.fileText.length) return tokenList;
    const token = Token.firstFrom(this.fileText, { at: currentCharIndex });
    if (TokenUtil.typeIsSignificant(token.type)) tokenList.push(token);
    const nextCharIndex = currentCharIndex + token.lexeme.length;
    return this.traverse(tokenList, nextCharIndex);
  }
}

export default Lexer;
