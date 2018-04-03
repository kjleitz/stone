import _        from 'underscore';
import Lexer    from './build/lexer.js';
import Syntaxer from './build/syntaxer.js';

// for testing it out in chrome/dev tools... don't judge
window.addEventListener('load', () => {
  window._        = _;
  window.Lexer    = Lexer;
  window.Syntaxer = Syntaxer;
  window.fileText = "foo = 'me \"says\":'\ndef bar(baz):Str\n  abc = 'hi, how\\'s it going?'\n  return baz + abc\n\n# this is just a comment\nbar(foo)";
  window.lex      = new Lexer(window.fileText);

  const brainstormXHR = new XMLHttpRequest();
  brainstormXHR.open('GET', '/brainstorm.stone');
  brainstormXHR.onreadystatechange = (event) => {
    if (event.target.readyState === 4) {
      window.stoneFileText = event.target.responseText;
      window.stoneLex      = new Lexer(window.stoneFileText);
      window.stoneSyn      = new Syntaxer(window.stoneLex.traverse());
    }
  };
  brainstormXHR.send();

  const simpleTestXHR = new XMLHttpRequest();
  simpleTestXHR.open('GET', '/test.stone');
  simpleTestXHR.onreadystatechange = (event) => {
    if (event.target.readyState === 4) {
      window.simpleTestText = event.target.responseText;
      window.simpleTestLex  = new Lexer(window.simpleTestText);
      window.simpleTestSyn  = new Syntaxer(window.simpleTestLex.traverse());
    }
  };
  simpleTestXHR.send();
});
