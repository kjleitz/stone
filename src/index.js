import _     from 'underscore';
import Lexer from './lexer.js';

// for testing it out in chrome/dev tools... don't judge
window.addEventListener('load', () => {
  window.Lexer = Lexer;
  window.fileText = "foo = 'me \"says\":'\ndef bar(baz):Str\n  abc = 'hi, how\\'s it going?'\n  return baz + abc\n\n# this is just a comment\nbar(foo)";
  window.lex = new Lexer({ fileText: window.fileText });
  window._ = _;

  const xhr = new XMLHttpRequest();
  xhr.open('GET', '/brainstorm.stone');
  xhr.onreadystatechange = (event) => {
    if (event.target.readyState === 4) {
      window.stoneFileText = event.target.responseText;
      window.stoneLex      = new Lexer({ fileText: window.stoneFileText });
    }
  };
  xhr.send();
});
