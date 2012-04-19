/**
 * Simple flat clone using prototype, accepts only objects,
 * usefull for property override on FLAT configuration object 
 * (no nested props)
 *
 * USE WITH CAUTION, can not behave as you wish if you do not know
 * how this works
 */
module.exports = function(parent) {
  if(parent === null)
    return null;

  var ctor = function() {};
  ctor.prototype = parent;
  return new ctor();
};
