import _     from 'underscore';
import Lexer from './lexer.js';

// for testing it out in chrome/dev tools... don't judge
window.addEventListener('load', () => {
  window.Lexer = Lexer;
  window.fileText = "foo = 1 + 2\nbar(baz) {return 'hi, how's it going?'}\nbar(foo)";
  window.lex = new Lexer(window.fileText);
  window._ = _;
});
