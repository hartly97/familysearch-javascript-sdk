var globals = require('./globals'),
    utils = require('./utils'),
    angularjsWrappers = require('./angularjs-wrappers'),
    jQueryWrappers = require('./jquery-wrappers'),
    nodejsWrappers = require('./nodejs-wrappers');

/**
 * @ngdoc function
 * @name init.functions:init
 * @function
 *
 * @description
 * Initialize the FamilySearch object
 *
 * **Options**
 *
 * - `client_id` - the developer key you received from FamilySearch
 * - `environment` - sandbox, staging, or production
 * - `http_function` - a function for issuing http requests: `jQuery.ajax` or angular's `$http`,
 * or eventually node.js's http function; defaults to `jQuery.ajax`
 * - `deferred_function` - a function for creating deferred's: `jQuery.Deferred` or angular's `$q.defer`
 * or eventually `Q`; defaults to `jQuery.Deferred`
 * - `timeout_function` - optional timeout function: angular users should pass `$timeout`; otherwise the global `setTimeout` is used
 * - `redirect_uri` - the OAuth2 redirect uri you registered with FamilySearch.  Does not need to exist,
 * but must have the same host and port as the server running your script;
 * however, it must exist for mobile safari - see the Overview section of the documentation
 * - `auto_expire` - set to true if you want to the system to clear the access token when it has expired
 * (after one hour of inactivity or 24 hours, whichever comes first; should probably be false for node.js)
 * - `auto_signin` - set to true if you want the user to be prompted to sign in whenever you call an API function
 * without an access token; must be false for node.js, and may result in a blocked pop-up if the API call is
 * not in direct response to a user-initiated action; because of the blocked pop-up issue, you may want to use `expire_callback` instead
 * - `expire_callback` - pass in a function that will be called when the access token expires
 * - `save_access_token` - set to true if you want the access token to be saved and re-read in future init calls
 * (uses a session cookie, must be false for node.js) - *setting `save_access_token` along with `auto_signin` and
 * `auto_expire` is very convenient*
 * - `access_token` - pass this in if you already have an access token
 * - `debug` - set to true to turn on console logging during development
 *
 * @param {Object} opts opts
 */
var FS = module.exports = function(opts){

  var self = this;
  self.settings = utils.extend(self.settings, globals);

  self.helpers = new Helpers(self);
  self.plumbing = new Plumbing(self);
  
  opts = opts || {};

  if(!opts['client_id'] && !opts['app_key']) {
    throw 'client_id must be set';
  }
  self.settings.clientId = opts['client_id'] || opts['app_key']; //app_key is deprecated

  if(!opts['environment']) {
    throw 'environment must be set';
  }
  //noinspection JSUndeclaredVariable
  self.settings.environment = opts['environment'];
  
  // nodejs
  if(typeof module === 'object' && typeof module.exports !== 'undefined'){
    if(!opts['http_function']){
      throw 'missing http_function for node';
    }
    self.settings.httpWrapper = nodejsWrappers.httpWrapper(opts['http_function'], self);
    
    if(!opts['deferred_function']){
      throw 'missing deferred_function for node';
    }
    self.settings.deferredWrapper = nodejsWrappers.deferredWrapper(opts['deferred_function']);
  } 
  
  // browsers
  else {
    if(!opts['http_function'] && !window.jQuery) {
      throw 'http must be set; e.g., jQuery.ajax';
    }
    var httpFunction = opts['http_function'] || window.jQuery.ajax;
    if (httpFunction.defaults) {
      self.settings.httpWrapper = angularjsWrappers.httpWrapper(httpFunction, self);
    }
    else {
      self.settings.httpWrapper = jQueryWrappers.httpWrapper(httpFunction, self);
    }

    if(!opts['deferred_function'] && !window.jQuery) {
      throw 'deferred_function must be set; e.g., jQuery.Deferred';
    }
    var deferredFunction = opts['deferred_function'] || window.jQuery.Deferred;
    var d = deferredFunction();
    d.resolve(); // required for unit tests
    if (!utils.isFunction(d.promise)) {
      self.settings.deferredWrapper = angularjsWrappers.deferredWrapper(deferredFunction);
    }
    else {
      self.settings.deferredWrapper = jQueryWrappers.deferredWrapper(deferredFunction);
    }
  }

  var timeout = opts['timeout_function'];
  if (timeout) {
    self.settings.setTimeout = function(fn, delay) {
      return timeout(fn, delay);
    };
    self.settings.clearTimeout = function(timer) {
      timeout.cancel(timer);
    };
  }
  else {
    // not sure why I can't just set self.settings.setTimeout = setTimeout, but it doesn't seem to work; anyone know why?
    self.settings.setTimeout = function(fn, delay) {
      return setTimeout(fn, delay);
    };
    self.settings.clearTimeout = function(timer) {
      clearTimeout(timer);
    };
  }

  if(!opts['redirect_uri'] && !opts['auth_callback']) {
    throw 'redirect_uri must be set';
  }
  self.settings.redirectUri = opts['redirect_uri'] || opts['auth_callback']; // auth_callback is deprecated

  self.settings.autoSignin = opts['auto_signin'];

  self.settings.autoExpire = opts['auto_expire'];

  self.settings.expireCallback = opts['expire_callback'];

  if (opts['save_access_token']) {
    self.settings.saveAccessToken = true;
    self.readAccessToken();
  }

  if (opts['access_token']) {
    self.settings.accessToken = opts['access_token'];
  }

  self.settings.debug = opts['debug'];
  
  // request the discovery resource
  self.settings.discoveryPromise = self.plumbing.get(self.settings.discoveryUrl);
  self.settings.discoveryPromise.then(function(discoveryResource) {
    self.settings.discoveryResource = discoveryResource;
  });

};

// require these after setting module.exports so that
// they can have access to the FS global if they want
// to require it also
var Helpers = require('./helpers'),
    Plumbing = require('./plumbing');

require('./agent');
require('./attribution');
require('./authorities');
require('./authentication');
require('./changeHistory');
require('./change');
require('./comment');
require('./date');
require('./discussion');
require('./discussionRef');
require('./fact');
require('./memories');
require('./memoryArtifactRef');
require('./memoryPersona');
require('./memoryPersonaRef');
require('./memory');
require('./name');
require('./notes');
require('./note');
require('./place');
require('./redirect');
require('./sources');
require('./sourceDescription');
require('./sourceRef');
require('./user');
require('./users');
require('./discussions');

// Plumbing
extendFSPrototype('plumbing', 'del');
extendFSPrototype('plumbing', 'get');
extendFSPrototype('plumbing', 'getTotalProcessingTime');
extendFSPrototype('plumbing', 'getUrl');
extendFSPrototype('plumbing', 'http');
extendFSPrototype('plumbing', 'post');
extendFSPrototype('plumbing', 'put');
extendFSPrototype('plumbing', 'setTotalProcessingTime');

function extendFSPrototype(moduleName, functionName){
  FS.prototype[functionName] = function(){
    return this[moduleName][functionName].apply(this[moduleName], arguments);
  };
}