// FUNCTIONS


function add(n, m) {
  return n + m; // note: arguments to functions in new_lang will be turned into consts
}

function add(n, m) { return n + m }

const add = function(n, m) { return n + m }

const add = function(n, m) {
  return n + m;
}

const log1 = function(msg) {
  console.log(msg);
}

const log2 = function(msg) {
  const returnVal = console.log(msg);
  return +returnVal || 0 // coerce return value to a number with unary +
}












foo.to_string() //=> "foo"
const toStr = function(bar) { return bar.to_string() }
toStr(foo)      //=> "foo"


// CLASSES
const Pet = {
  _isEmptyValForString: (val) => {
    const isNil = _.isNull(val) || _.isUndefined(val);
    if (isNil) return true;
    const isEmpty = _.is
  },
  
  _setBreed: (breed) => {
    _.isUndefined(breed) || _.isNull(breed)
    typeof breed == 'undefined' ? '' : '' + breed;
    this.breed = breed;
  },

  _setName: (name) => {
    typeof name == 'undefined' ? '' : '' + name
    const names = name.split(' ');
    const properNames = names.map(name => name.capitalize());
    this.name = name
  }
};
