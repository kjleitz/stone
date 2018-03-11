import _        from 'underscore';
import Lexer    from './lexer.js';
import Syntaxer from './syntaxer.js';

// for testing it out in chrome/dev tools... don't judge
window.addEventListener('load', () => {
  window._        = _;
  window.Lexer    = Lexer;
  window.Syntaxer = Syntaxer;
  window.fileText = "foo = 'me \"says\":'\ndef bar(baz):Str\n  abc = 'hi, how\\'s it going?'\n  return baz + abc\n\n# this is just a comment\nbar(foo)";
  window.lex      = new Lexer({ fileText: window.fileText });

  const brainstormXHR = new XMLHttpRequest();
  brainstormXHR.open('GET', '/brainstorm.stone');
  brainstormXHR.onreadystatechange = (event) => {
    if (event.target.readyState === 4) {
      window.stoneFileText = event.target.responseText;
      window.stoneLex      = new Lexer({ fileText: window.stoneFileText });
      window.stoneSyn      = new Syntaxer({ tokenList: window.stoneLex.traverse() });
    }
  };
  brainstormXHR.send();

  const simpleTestXHR = new XMLHttpRequest();
  simpleTestXHR.open('GET', '/test.stone');
  simpleTestXHR.onreadystatechange = (event) => {
    if (event.target.readyState === 4) {
      window.simpleTestText = event.target.responseText;
      window.simpleTestLex  = new Lexer({ fileText: window.simpleTestText });
      window.simpleTestSyn  = new Syntaxer({ tokenList: window.simpleTestLex.traverse() });
    }
  };
  simpleTestXHR.send();
});
