/**
 * skylark-backbone - A version of backbone that ported to running on skylarkjs.
 * @author 
 * @version v0.9.0
 * @link 
 * @license MIT
 */
(function(factory,globals) {
  var define = globals.define,
      require = globals.require,
      isAmd = (typeof define === 'function' && define.amd),
      isCmd = (!isAmd && typeof exports !== 'undefined');

  if (!isAmd && !define) {
    var map = {};
    function absolute(relative, base) {
        if (relative[0]!==".") {
          return relative;
        }
        var stack = base.split("/"),
            parts = relative.split("/");
        stack.pop(); 
        for (var i=0; i<parts.length; i++) {
            if (parts[i] == ".")
                continue;
            if (parts[i] == "..")
                stack.pop();
            else
                stack.push(parts[i]);
        }
        return stack.join("/");
    }
    define = globals.define = function(id, deps, factory) {
        if (typeof factory == 'function') {
            map[id] = {
                factory: factory,
                deps: deps.map(function(dep){
                  return absolute(dep,id);
                }),
                resolved: false,
                exports: null
            };
            require(id);
        } else {
            map[id] = {
                factory : null,
                resolved : true,
                exports : factory
            };
        }
    };
    require = globals.require = function(id) {
        if (!map.hasOwnProperty(id)) {
            throw new Error('Module ' + id + ' has not been defined');
        }
        var module = map[id];
        if (!module.resolved) {
            var args = [];

            module.deps.forEach(function(dep){
                args.push(require(dep));
            })

            module.exports = module.factory.apply(globals, args) || null;
            module.resolved = true;
        }
        return module.exports;
    };
  }
  
  if (!define) {
     throw new Error("The module utility (ex: requirejs or skylark-utils) is not loaded!");
  }

  factory(define,require);

  if (!isAmd) {
    var skylarkjs = require("skylark-langx/skylark");

    if (isCmd) {
      module.exports = skylarkjs;
    } else {
      globals.skylarkjs  = skylarkjs;
    }
  }

})(function(define,require) {

define('skylark-backbone/backbone',[
	"skylark-langx/skylark",
    "skylark-data-entities",
	"skylark-jquery"
],function(skylark, models,$){
//     from Backbone.js 1.2.3

//     (c) 2010-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org
	var Backbone  = {
        // set a `X-Http-Method-Override` header.
        emulateHTTP : false,

        // Turn on `emulateJSON` to support legacy servers that can't deal with direct
        // `application/json` requests ... this will encode the body as
        // `application/x-www-form-urlencoded` instead and will send the model in a
        // form param named `model`.
        emulateJSON : false,

	};
    
    Backbone.$ = $;

    Backbone.sync =    function(method, entity, options) {
	    // Default options, unless specified.
	    langx.defaults(options || (options = {}), {
	      emulateHTTP: Backbone.emulateHTTP,
	      emulateJSON: Backbone.emulateJSON
	    });
	    return models.backends.ajaxSync.apply(this,[method,entity,options]);
	};


	return skylark.attach("itg.backbone",Backbone) ;
});
define('skylark-backbone/events',[
  "skylark-langx/langx",
  "./backbone"
],function(langx,Backbone){
  // Create a local reference to a common array method we'll want to use later.
  var slice = Array.prototype.slice;

  // Backbone.Events

  var EventExtends = {
      on  : function(name, callback, context){
          var fn =  function() {
            var args = slice.call(arguments,1);
            if (name=="all") {
              args.unshift(arguments[0].type);
            }
            callback.apply(this, args);
          };
          fn._ = callback
          
          return this.overrided(name,fn,context);
      },
        
      once : function(name, callback, context) {
        return this.one(name,callback,context);
      },
      bind : function(name, callback, context) {
          return this.on(name,callback,context);
      },
      
      unbind : function(name, callback, context){
          return this.off(name,callback,context);
      },
    
      stopListening : function(obj, name, callback){
        return this.unlistenTo(obj,name,callback);
      }
   },

  BackboneEvented = langx.Evented.inherit(EventExtends),

  EventedProto = BackboneEvented.prototype;
  
  var Events = Backbone.Events = {
     bind: EventedProto.bind,
     listenTo: EventedProto.listenTo,
     listenToOnce: EventedProto.listenToOnce,
     off: EventedProto.off,
     on : EventedProto.on,
     once: EventedProto.once,
     stopListening: EventedProto.stopListening,
     emit: EventedProto.emit,
     trigger: EventedProto.trigger,
     unbind: EventedProto.unbind,
     unlistenTo: EventedProto.unlistenTo
  };

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  langx.extend(Backbone, Events);

  return {
    EventExtends : EventExtends,
    BackboneEvented : BackboneEvented
  };

});
define('skylark-backbone/helper',[
  "skylark-langx/langx",
  "skylark-underscore/underscore",
  "./backbone"
],function(langx,_,Backbone){

  // Proxy Backbone class methods to Underscore functions, wrapping the model's
  // `attributes` object or collection's `models` array behind the scenes.
  //
  // collection.filter(function(model) { return model.get('age') > 10 });
  // collection.each(this.addView);
  //
  // `Function#apply` can be slow so we use the method's arg count, if we know it.
  var addMethod = function(length, method, attribute) {
    switch (length) {
      case 1: return function() {
        return _[method](this[attribute]);
      };
      case 2: return function(value) {
        return _[method](this[attribute], value);
      };
      case 3: return function(iteratee, context) {
        return _[method](this[attribute], cb(iteratee, this), context);
      };
      case 4: return function(iteratee, defaultVal, context) {
        return _[method](this[attribute], cb(iteratee, this), defaultVal, context);
      };
      default: return function() {
        var args = slice.call(arguments);
        args.unshift(this[attribute]);
        return _[method].apply(_, args);
      };
    }
  };

  var addUnderscoreMethods = function(Class, methods, attribute) {
    _.each(methods, function(length, method) {
      if (_[method]) Class.prototype[method] = addMethod(length, method, attribute);
    });
  };

  // Support `collection.sortBy('attr')` and `collection.findWhere({id: 1})`.
  var cb = function(iteratee, instance) {
    if (_.isFunction(iteratee)) return iteratee;
    if (_.isObject(iteratee) && !instance._isModel(iteratee)) return modelMatcher(iteratee);
    if (_.isString(iteratee)) return function(model) { return model.get(iteratee); };
    return iteratee;
  };

  var modelMatcher = function(attrs) {
    var matcher = _.matches(attrs);
    return function(model) {
      return matcher(model.attributes);
    };
  };

  var extend  = Backbone.extend = function(protoProps, staticProps){
    protoProps.constructor = this._constructor;
    var child = this.inherit(protoProps);
    _.extend(child,staticProps);
  
    return child;
  };

  return {
    addUnderscoreMethods : addUnderscoreMethods,
    extend : extend
  };
});
define('skylark-backbone/Collection',[
  "skylark-langx/langx",
  "skylark-data-entities",
  "./backbone",
  "./events",
  "./helper"
],function(langx,models,Backbone,events,helper){

  // Backbone.Collection
  // -------------------

  // If models tend to represent a single row of data, a Backbone Collection is
  // more analogous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.

  var Collection = Backbone.Collection = models.Collection.inherit({
      _construct : function(models, options) {
        options || (options = {});
        if (options.model) this.model = options.model;
        if (options.comparator !== void 0) this.comparator = options.comparator;
        this._reset();
        this.initialize.apply(this, arguments);
        if (models) this.reset(models, _.extend({silent: true}, options));
      },
      // Initialize is an empty function by default. Override it with your own
      // initialization logic.
      initialize: function(){},

      // Proxy `Backbone.sync` by default.
      sync: function() {
        return Backbone.sync.apply(this, arguments);
      }

  });


  // Define the Collection's inheritable methods.
  Collection.partial(events.EventExtends);

  Object.defineProperty(Collection.prototype, "model",{
    get() { return this.entity; },
    set(newValue) { this.entity = newValue; }
  });

  Object.defineProperty(Collection.prototype, "models",{
    get() { return this.entities; },
    set(newValue) { this.entities = newValue; }
  });

  Collection.prototype.modelId = Collection.prototype.entityId;
  Collection.prototype._isModel = Collection.prototype._isEntity;


  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  var collectionMethods = {forEach: 3, each: 3, map: 3, collect: 3, reduce: 0,
      foldl: 0, inject: 0, reduceRight: 0, foldr: 0, find: 3, detect: 3, filter: 3,
      select: 3, reject: 3, every: 3, all: 3, some: 3, any: 3, include: 3, includes: 3,
      contains: 3, invoke: 0, max: 3, min: 3, toArray: 1, size: 1, first: 3,
      head: 3, take: 3, initial: 3, rest: 3, tail: 3, drop: 3, last: 3,
      without: 0, difference: 0, indexOf: 3, shuffle: 1, lastIndexOf: 3,
      isEmpty: 1, chain: 1, sample: 3, partition: 3, groupBy: 3, countBy: 3,
      sortBy: 3, indexBy: 3, findIndex: 3, findLastIndex: 3};

  // Mix in each Underscore method as a proxy to `Collection#models`.
  helper.addUnderscoreMethods(Collection, collectionMethods, 'models');

  Collection.extend = helper.extend;

  return Collection;

});
define('skylark-backbone/Model',[
  "skylark-langx/langx",
  "skylark-underscore/underscore",
  "skylark-data-entities",
  "./backbone",
  "./events",
  "./helper"
],function(langx,_,models,Backbone,events,helper){

  // Backbone.Model
  // --------------

  // Backbone **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = models.Entity.inherit({
      _construct : function(attributes, options) {
        langx.Stateful.prototype._construct.apply(this,arguments);
        this.initialize.apply(this, arguments);
      },
      // Initialize is an empty function by default. Override it with your own
      // initialization logic.
      initialize: function(){},

      // Get the HTML-escaped value of an attribute.
      escape: function(attr) {
        return _.escape(this.get(attr));
      },

      // Special-cased proxy to underscore's `_.matches` method.
      matches: function(attrs) {
        return !!_.iteratee(attrs, this)(this.attributes);
      },

      // Proxy `Backbone.sync` by default.
      sync: function() {
        return Backbone.sync.apply(this, arguments);
      }
 });



  // Attach all inheritable methods to the Model prototype.
  Model.partial(events.EventExtends);

  Model.extend = helper.extend;

  return Model;
});
define('skylark-backbone/History',[
  "skylark-langx/langx",
  "skylark-underscore/underscore",
  "./backbone",
  "./events",
  "./helper"
],function(langx,_,Backbone,events,helper){

 // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  var History = Backbone.History = events.BackboneEvented.inherit({
    _construct : function() {
        this.handlers = [];
        this.checkUrl = _.bind(this.checkUrl, this);
    
        // Ensure that `History` can be used outside of the browser.
        if (typeof window !== 'undefined') {
          this.location = window.location;
          this.history = window.history;
        }
    }
  });

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for stripping urls of hash.
  var pathStripper = /#.*$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  History.partial({

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Are we at the app root?
    atRoot: function() {
      var path = this.location.pathname.replace(/[^\/]$/, '$&/');
      return path === this.root && !this.getSearch();
    },

    // Does the pathname match the root?
    matchRoot: function() {
      var path = this.decodeFragment(this.location.pathname);
      var rootPath = path.slice(0, this.root.length - 1) + '/';
      return rootPath === this.root;
    },

    // Unicode characters in `location.pathname` are percent encoded so they're
    // decoded for comparison. `%25` should not be decoded since it may be part
    // of an encoded parameter.
    decodeFragment: function(fragment) {
      return decodeURI(fragment.replace(/%25/g, '%2525'));
    },

    // In IE6, the hash fragment and search params are incorrect if the
    // fragment contains `?`.
    getSearch: function() {
      var match = this.location.href.replace(/#.*/, '').match(/\?.+/);
      return match ? match[0] : '';
    },

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the pathname and search params, without the root.
    getPath: function() {
      var path = this.decodeFragment(
        this.location.pathname + this.getSearch()
      ).slice(this.root.length - 1);
      return path.charAt(0) === '/' ? path.slice(1) : path;
    },

    // Get the cross-browser normalized URL fragment from the path or hash.
    getFragment: function(fragment) {
      if (fragment == null) {
        if (this._usePushState || !this._wantsHashChange) {
          fragment = this.getPath();
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error('Backbone.history has already been started');
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._hasHashChange   = 'onhashchange' in window && (document.documentMode === void 0 || document.documentMode > 7);
      this._useHashChange   = this._wantsHashChange && this._hasHashChange;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.history && this.history.pushState);
      this._usePushState    = this._wantsPushState && this._hasPushState;
      this.fragment         = this.getFragment();

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      // Transition from hashChange to pushState or vice versa if both are
      // requested.
      if (this._wantsHashChange && this._wantsPushState) {

        // If we've started off with a route from a `pushState`-enabled
        // browser, but we're currently in a browser that doesn't support it...
        if (!this._hasPushState && !this.atRoot()) {
          var rootPath = this.root.slice(0, -1) || '/';
          this.location.replace(rootPath + '#' + this.getPath());
          // Return immediately as browser will do redirect to new url
          return true;

        // Or if we've started out with a hash-based route, but we're currently
        // in a browser where it could be `pushState`-based instead...
        } else if (this._hasPushState && this.atRoot()) {
          this.navigate(this.getHash(), {replace: true});
        }

      }

      // Proxy an iframe to handle location events if the browser doesn't
      // support the `hashchange` event, HTML5 history, or the user wants
      // `hashChange` but not `pushState`.
      if (!this._hasHashChange && this._wantsHashChange && !this._usePushState) {
        this.iframe = document.createElement('iframe');
        this.iframe.src = 'javascript:0';
        this.iframe.style.display = 'none';
        this.iframe.tabIndex = -1;
        var body = document.body;
        // Using `appendChild` will throw on IE < 9 if the document is not ready.
        var iWindow = body.insertBefore(this.iframe, body.firstChild).contentWindow;
        iWindow.document.open();
        iWindow.document.close();
        iWindow.location.hash = '#' + this.fragment;
      }

      // Add a cross-platform `addEventListener` shim for older browsers.
      var addEventListener = window.addEventListener || function(eventName, listener) {
        return attachEvent('on' + eventName, listener);
      };

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._usePushState) {
        addEventListener('popstate', this.checkUrl, false);
      } else if (this._useHashChange && !this.iframe) {
        addEventListener('hashchange', this.checkUrl, false);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      // Add a cross-platform `removeEventListener` shim for older browsers.
      var removeEventListener = window.removeEventListener || function(eventName, listener) {
        return detachEvent('on' + eventName, listener);
      };

      // Remove window listeners.
      if (this._usePushState) {
        removeEventListener('popstate', this.checkUrl, false);
      } else if (this._useHashChange && !this.iframe) {
        removeEventListener('hashchange', this.checkUrl, false);
      }

      // Clean up the iframe if necessary.
      if (this.iframe) {
        document.body.removeChild(this.iframe);
        this.iframe = null;
      }

      // Some environments will throw when clearing an undefined interval.
      if (this._checkUrlInterval) clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();

      // If the user pressed the back button, the iframe's hash will have
      // changed and we should use that for comparison.
      if (current === this.fragment && this.iframe) {
        current = this.getHash(this.iframe.contentWindow);
      }

      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl();
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragment) {
      // If the root doesn't match, no routes can match either.
      if (!this.matchRoot()) return false;
      fragment = this.fragment = this.getFragment(fragment);
      return _.some(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: !!options};

      // Normalize the fragment.
      fragment = this.getFragment(fragment || '');

      // Don't include a trailing slash on the root.
      var rootPath = this.root;
      if (fragment === '' || fragment.charAt(0) === '?') {
        rootPath = rootPath.slice(0, -1) || '/';
      }
      var url = rootPath + fragment;

      // Strip the hash and decode for matching.
      fragment = this.decodeFragment(fragment.replace(pathStripper, ''));

      if (this.fragment === fragment) return;
      this.fragment = fragment;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._usePushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && fragment !== this.getHash(this.iframe.contentWindow)) {
          var iWindow = this.iframe.contentWindow;

          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if (!options.replace) {
            iWindow.document.open();
            iWindow.document.close();
          }

          this._updateHash(iWindow.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) return this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Set up inheritance for the model, collection, router, view and history.
  History.extend = Backbone.extend ;


  return History;

});


define('skylark-backbone/Router',[
  "skylark-langx/langx",
  "skylark-underscore/underscore",
  "./backbone",
  "./events",
  "./helper"
],function(langx,_,Backbone,events,helper){

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = events.BackboneEvented.inherit({
    _construct : function(options) {
        options || (options = {});
        if (options.routes) this.routes = options.routes;
        this._bindRoutes();
        this.initialize.apply(this, arguments);
    }
  });


  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  Router.partial({

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        if (router.execute(callback, args, name) !== false) {
          router.trigger.apply(router, ['route:' + name].concat(args));
          router.trigger('route', name, args);
          Backbone.history.trigger('route', router, name, args);
        }
      });
      return this;
    },

    // Execute a route handler with the provided parameters.  This is an
    // excellent place to do pre-route setup or post-route cleanup.
    execute: function(callback, args, name) {
      if (callback) callback.apply(this, args);
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional) {
                     return optional ? match : '([^/?]+)';
                   })
                   .replace(splatParam, '([^?]*?)');
      return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param, i) {
        // Don't decode the search params.
        if (i === params.length - 1) return param || null;
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // Set up inheritance for the model, collection, router, view and history.
  Router.extend = helper.extend;


  return Router;

});


define('skylark-backbone/View',[
  "skylark-langx/langx",
  "skylark-jquery",
  "skylark-domx-noder",
  "skylark-domx-plugins",
  "skylark-underscore/underscore",
  "./backbone",
  "./events",
  "./helper"
],function(langx, $,noder,plugins,_,Backbone,events,helper){
  // Backbone.View
  // -------------

  // Backbone Views are almost more convention than they are actual code. A View
  // is simply a JavaScript object that represents a logical chunk of UI in the
  // DOM. This might be a single item, an entire list, a sidebar or panel, or
  // even the surrounding frame which wraps your whole app. Defining a chunk of
  // UI as a **View** allows you to define your DOM events declaratively, without
  // having to worry about render order ... and makes it easy for the view to
  // react to specific changes in the state of your models.

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...

    var View = Backbone.View = plugins.Plugin.inherit({
      _construct :function(options) {
          this.cid = _.uniqueId('view');
          this.preinitialize.apply(this, arguments);
          _.extend(this, _.pick(options, viewOptions));
          this._ensureElement();
          this.initialize.apply(this, arguments);

      },

      // The default `tagName` of a View's element is `"div"`.
      tagName: 'div',

      // query delegate for element lookup, scoped to DOM elements within the
      // current view. This should be preferred to global lookups where possible.
      $: function(selector) {
        return this.$el.find(selector);
      },

      // preinitialize is an empty function by default. You can override it with a function
      // or object.  preinitialize will run before any instantiation logic is run in the View
      preinitialize: function(){},

      // Initialize is an empty function by default. Override it with your own
      // initialization logic.
      initialize: function(){},

      // **render** is the core function that your view should override, in order
      // to populate its element (`this.el`), with the appropriate HTML. The
      // convention is for **render** to always return `this`.
      render: function() {
        return this;
      },

      // Remove this view by taking the element out of the DOM, and removing any
      // applicable Backbone.Events listeners.
      remove: function() {
        this._removeElement();
        this.unlistenTo();
        return this;
      },

      // Remove this view's element from the document and all event listeners
      // attached to it. Exposed for subclasses using an alternative DOM
      // manipulation API.
      _removeElement: function() {
        this.$el.remove();
      },

      // Change the view's element (`this.el` property) and re-delegate the
      // view's events on the new element.
      setElement: function(element) {
        this.undelegateEvents();
        this._setElement(element);
        this.delegateEvents();
        return this;
      },

      // Creates the `this.el` and `this.$el` references for this view using the
      // given `el`. `el` can be a CSS selector or an HTML string, a jQuery
      // context or an element. Subclasses can override this to utilize an
      // alternative DOM manipulation API and are only required to set the
      // `this.el` property.
      _setElement: function(el) {
        this.$el = $(el);
        this.el = this.$el[0];
      },

      // Set callbacks, where `this.events` is a hash of
      //
      // *{"event selector": "callback"}*
      //
      //     {
      //       'mousedown .title':  'edit',
      //       'click .button':     'save',
      //       'click .open':       function(e) { ... }
      //     }
      //
      // pairs. Callbacks will be bound to the view, with `this` set properly.
      // Uses event delegation for efficiency.
      // Omitting the selector binds the event to `this.el`.
      delegateEvents: function(events) {
        events || (events = langx.result(this, 'events'));
        if (!events) return this;
        this.undelegateEvents();
        for (var key in events) {
          var method = events[key];
          if (!langx.isFunction(method)) method = this[method];
          if (!method) continue;
          var match = key.match(delegateEventSplitter);
          this.delegate(match[1], match[2], langx.proxy(method, this));
        }
        return this;
      },

      // Add a single event listener to the view's element (or a child element
      // using `selector`). This only works for delegate-able events: not `focus`,
      // `blur`, and not `change`, `submit`, and `reset` in Internet Explorer.
      delegate: function(eventName, selector, listener) {
        this.$el.on(eventName + '.delegateEvents' + this.uid, selector, listener);
        return this;
      },

      // Clears all callbacks previously bound to the view by `delegateEvents`.
      // You usually don't need to use this, but may wish to if you have multiple
      // Backbone views attached to the same DOM element.
      undelegateEvents: function() {
        if (this.$el) this.$el.off('.delegateEvents' + this.uid);
        return this;
      },

      // A finer-grained `undelegateEvents` for removing a single delegated event.
      // `selector` and `listener` are both optional.
      undelegate: function(eventName, selector, listener) {
        this.$el.off(eventName + '.delegateEvents' + this.uid, selector, listener);
        return this;
      },

      // Produces a DOM element to be assigned to your view. Exposed for
      // subclasses using an alternative DOM manipulation API.
      _createElement: function(tagName,attrs) {
        return noder.createElement(tagName,attrs);
      },

      // Ensure that the View has a DOM element to render into.
      // If `this.el` is a string, pass it through `$()`, take the first
      // matching element, and re-assign it to `el`. Otherwise, create
      // an element from the `id`, `className` and `tagName` properties.
      _ensureElement: function() {
        if (!this.el) {
          var attrs = langx.mixin({}, langx.result(this, 'attributes'));
          if (this.id) attrs.id = langx.result(this, 'id');
          if (this.className) attrs['class'] = langx.result(this, 'className');
          this.setElement(this._createElement(langx.result(this, 'tagName'),attrs));
          this._setAttributes(attrs);
        } else {
          this.setElement(langx.result(this, 'el'));
        }
      },

      // Set attributes from a hash on this view's element.  Exposed for
      // subclasses using an alternative DOM manipulation API.
      _setAttributes: function(attributes) {
        this.$el.attr(attributes);
      },
      
    });


  View.partial(events.EventExtends);

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be set as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  View.extend = helper.extend;

  return View;
});
define('skylark-backbone/UndoManager',[
  "skylark-langx/langx",
  "skylark-underscore/underscore",
  "./backbone",
  "./Model",
  "./Collection"

],function(langx,_,Backbone,Model,Collection){

	var core_slice = Array.prototype.slice;

	/**
	 * As call is faster than apply, this is a faster version of apply as it uses call.
	 * 
	 * @param  {Function} fn 	The function to execute 
	 * @param  {Object}   ctx 	The context the function should be called in
	 * @param  {Array}    args 	The array of arguments that should be applied to the function
	 * @return Forwards whatever the called function returns
	 */
	function apply (fn, ctx, args) {
		return args.length <= 4 ?
			fn.call(ctx, args[0], args[1], args[2], args[3]) :
			fn.apply(ctx, args);
	}

	/**
	 * Uses slice on an array or an array-like object.
	 * 
	 * @param  {Array|Object} 	arr 	The array or array-like object.
	 * @param  {Number} 		[index]	The index from where the array should be sliced. Default is 0.
	 * @return {Array} The sliced array
	 */
	function slice (arr, index) {
		return core_slice.call(arr, index);
	}

	/**
	 * Checks if an object has one or more specific keys. The keys 
	 * don't have to be an owned property.
	 * You can call this function either this way:
	 * hasKeys(obj, ["a", "b", "c"])
	 * or this way:
	 * hasKeys(obj, "a", "b", "c")
	 * 
	 * @param  {Object}  	obj 	The object to check on
	 * @param  {Array}  	keys 	The keys to check for
	 * @return {Boolean} True, if the object has all those keys
	 */
	function hasKeys (obj, keys) {
		if (obj == null) return false;
		if (!_.isArray(keys)) {
			keys = slice(arguments, 1);
		}
		return _.all(keys, function (key) {
			return key in obj;
		});
	}

	/**
	 * Returns a number that is unique per call stack. The number gets 
	 * changed after the call stack has been completely processed.
	 * 
	 * @return {number} MagicFusionIndex
	 */
	var getMagicFusionIndex = (function () {
		// If you add several models to a collection or set several
		// attributes on a model all in sequence and yet all for
		// example in one function, then several Undo-Actions are
		// generated.
		// If you want to undo your last action only the last model
		// would be removed from the collection or the last set
		// attribute would be changed back to its previous value.
		// To prevent that we have to figure out a way to combine
		// all those actions that happened "at the same time". 
		// Timestamps aren't exact enough. A complex routine could 
		// run several milliseconds and in that time produce a lot 
		// of actions with different timestamps.
		// Instead we take advantage of the single-threadedness of
		// JavaScript:

		var callstackWasIndexed = false, magicFusionIndex = -1;
		function indexCycle() {
			magicFusionIndex++;
			callstackWasIndexed = true;
			_.defer(function () {
				// Here comes the magic. With a Timeout of 0 
				// milliseconds this function gets called whenever
				// the current callstack is completed
				callstackWasIndexed = false;
			})
		}
		return function () {
			if (!callstackWasIndexed) {
				indexCycle();
			}
			return magicFusionIndex;
		}
	})();

	/**
	 * To prevent binding a listener several times to one 
	 * object, we register the objects in an ObjectRegistry
	 *
	 * @constructor
	 */
	function ObjectRegistry () {
		// This uses two different ways of storing
		// objects: In case the object has a cid
		// (which Backbone objects typically have)
		// it uses this cid as an index. That way
		// the Array's length attribute doesn't 
		// change and the object isn't an item 
		// in the array, but an object-property.
		// Otherwise it's added to the Array as an
		// item.
		// That way we can use the fast property-
		// lookup and only have to fall back to 
		// iterating over the array in case 
		// non-Backbone-objects are registered.
		this.registeredObjects = [];
		// To return a list of all registered 
		// objects in the 'get' method we have to
		// store the objects that have a cid in
		// an additional array. 
		this.cidIndexes = [];
	}
	ObjectRegistry.prototype = {
		/**
		 * Returns whether the object is already registered in this ObjectRegistry or not.
		 * 
		 * @this 	{ObjectRegistry}
		 * @param  	{Object} 		 obj 	The object to check
		 * @return 	{Boolean} True if the object is already registered
		 */
		isRegistered: function (obj) {
			// This is where we get a performance boost 
			// by using the two different ways of storing 
			// objects.
			return obj && obj.cid ? this.registeredObjects[obj.cid] : _.contains(this.registeredObjects, obj);
		},
		/**
		 * Registers an object in this ObjectRegistry.
		 * 
		 * @this 	{ObjectRegistry}
		 * @param  	{Object} 		 obj 	The object to register
		 * @return 	{undefined}
		 */
		register: function (obj) {
			if (!this.isRegistered(obj)) {
				if (obj && obj.cid) {
					this.registeredObjects[obj.cid] = obj;
					this.cidIndexes.push(obj.cid);
				} else {
					this.registeredObjects.push(obj);
				}
				return true;
			}
			return false;
		},
		/**
		 * Unregisters an object from this ObjectRegistry.
		 * 
		 * @this {ObjectRegistry}
		 * @param  {Object} obj The object to unregister
		 * @return {undefined}
		 */
		unregister: function (obj) {
			if (this.isRegistered(obj)) {
				if (obj && obj.cid) {
					delete this.registeredObjects[obj.cid];
					this.cidIndexes.splice(_.indexOf(this.cidIndexes, obj.cid), 1);
				} else {
					var i = _.indexOf(this.registeredObjects, obj);
					this.registeredObjects.splice(i, 1);
				}
				return true;
			}
			return false;
		},
		/**
		 * Returns an array of all objects that are currently in this ObjectRegistry.
		 * 
		 * @return {Array} An array of all the objects which are currently in the ObjectRegistry
		 */
		get: function () {
			return (_.map(this.cidIndexes, function (cid) {return this.registeredObjects[cid];}, this)).concat(this.registeredObjects);
		}
	}

	/**
	 * Binds or unbinds the "all"-listener for one or more objects.
	 * 
	 * @param  {String}   which 	Either "on" or "off"
	 * @param  {Object[]} objects 	Array of the objects on which the "all"-listener should be bound / unbound to
	 * @param  {Function} [fn] 		The function that should be bound / unbound. Optional in case of "off"
	 * @param  {Object}   [ctx] 	The context the function should be called in
	 * @return {undefined}
	 */
	function onoff(which, objects, fn, ctx) {
		for (var i = 0, l = objects.length, obj; i < l; i++) {
			obj = objects[i];
			if (!obj) continue;
			if (which === "on") {
				if (!ctx.objectRegistry.register(obj)) {
					// register returned false, so obj was already registered
					continue;
				}
			} else {
				if (!ctx.objectRegistry.unregister(obj)) {
					// unregister returned false, so obj wasn't registered
					continue;
				}
			}
			if (_.isFunction(obj[which])) {
				obj[which]("all", fn, ctx);
			}
		}
	}

	/**
	 * Calls the undo/redo-function for a specific action.
	 * 
	 * @param  {String} which 	Either "undo" or "redo"
	 * @param  {Object} action 	The Action's attributes
	 * @return {undefined}
	 */
	function actionUndoRedo (which, action) {
		var type = action.type, undoTypes = action.undoTypes, fn = !undoTypes[type] || undoTypes[type][which];
		if (_.isFunction(fn)) {
			fn(action.object, action.before, action.after, action.options);
		}
	}

	/**
	 * The main undo/redo function.
	 *
	 * @param  {String} 		which 	    Either "undo" or "redo"
	 * @param  {UndoManager} 	manager	    The UndoManager-instance on which an "undo"/"redo"-Event is triggered afterwards
	 * @param  {UndoStack} 		stack 	    The UndoStack on which we perform
	 * @param  {Boolean} 		magic 	    If true, undoes / redoes all actions with the same magicFusionIndex
	 * @param  {Boolean} 		everything  If true, undoes / redoes every action that had been tracked
	 * @return {undefined}
	 */
	function managerUndoRedo (which, manager, stack, magic, everything) {
		if (stack.isCurrentlyUndoRedoing || 
			(which === "undo" && stack.pointer === -1) ||
			(which === "redo" && stack.pointer === stack.length - 1)) {
			// We're either currently in an undo- / redo-process or 
			// we reached the end of the stack
			return;
		}
		stack.isCurrentlyUndoRedoing = true;
		var action, actions, isUndo = which === "undo";
		if (everything) {
			// Undo / Redo all steps until you reach the stack's beginning / end
			actions = isUndo && stack.pointer === stack.length - 1 || // If at the stack's end calling undo
					  !isUndo && stack.pointer === -1 ? // or at the stack's beginning calling redo
					  _.clone(stack.models) : // => Take all the models. Otherwise:
					  core_slice.apply(stack.models, isUndo ? [0, stack.pointer] : [stack.pointer, stack.length - 1]);
		} else {
			// Undo / Redo only one step
			action = stack.at(isUndo ? stack.pointer : stack.pointer + 1);
			actions = magic ? stack.where({"magicFusionIndex": action.get("magicFusionIndex")}) : [action];
		}
		
		stack.pointer += (isUndo ? -1 : 1) * actions.length;
		while (action = isUndo ? actions.pop() : actions.shift()) {
			// Here we're calling the Action's undo / redo method
			action[which]();
		}
		stack.isCurrentlyUndoRedoing = false;

		manager.trigger(which, manager);
	}

	/**
	 * Checks whether an UndoAction should be created or not. Therefore it checks
	 * whether a "condition" property is set in the undoTypes-object of the specific
	 * event type. If not, it returns true. If it's set and a boolean, it returns it.
	 * If it's a function, it returns its result, converting it into a boolean. 
	 * Otherwise it returns true.
	 * 
	 * @param  {Object} 	undoTypesType 	The object within the UndoTypes that holds the function for this event type (i.e. "change")
	 * @param  {Arguments} 	args       		The arguments the "condition" function is called with
	 * @return {Boolean} 	True, if an UndoAction should be created
	 */
	function validateUndoActionCreation (undoTypesType, args) {
		var condition = undoTypesType.condition, type = typeof condition;
		return type === "function" ? !!apply(condition, undoTypesType, args) :
			type === "boolean" ? condition : true;
	}

	/**
	 * Adds an Undo-Action to the stack.
	 * 
	 * @param {UndoStack} 		stack 		The undostack the action should be added to.
	 * @param {String} 			type 		The event type (i.e. "change")
	 * @param {Arguments} 		args 		The arguments passed to the undoTypes' "on"-handler
	 * @param {OwnedUndoTypes} 	undoTypes 	The undoTypes-object which has the "on"-handler
	 * @return {undefined}
	 */
	function addToStack(stack, type, args, undoTypes) {
		if (stack.track && !stack.isCurrentlyUndoRedoing && type in undoTypes &&
			validateUndoActionCreation(undoTypes[type], args)) {
			// An UndoAction should be created
			var res = apply(undoTypes[type]["on"], undoTypes[type], args), diff;
			if (hasKeys(res, "object", "before", "after")) {
				res.type = type;
				res.magicFusionIndex = getMagicFusionIndex();
				res.undoTypes = undoTypes;
				if (stack.pointer < stack.length - 1) {
					// New Actions must always be added to the end of the stack.
					// If the pointer is not pointed to the last action in the
					// stack, presumably because actions were undone before, then
					// all following actions must be discarded
					var diff = stack.length - stack.pointer - 1;
					while (diff--) {
						stack.pop();
					}
				}
				stack.pointer = stack.length;
				stack.add(res);
				if (stack.length > stack.maximumStackLength) {
					stack.shift();
					stack.pointer--;
				}
			}
		}
	}


	/**
	 * Predefined UndoTypes object with default handlers for the most common events.
	 * @type {Object}
	 */
	var UndoTypes = {
		"add": {
			"undo": function (collection, ignore, model, options) {
				// Undo add = remove
				collection.remove(model, options);
			},
			"redo": function (collection, ignore, model, options) {
				// Redo add = add
				if (options.index) {
					options.at = options.index;
				}
				collection.add(model, options);
			},
			"on": function (model, collection, options) {
				return {
					object: collection,
					before: undefined,
					after: model,
					options: _.clone(options)
				};
			}
		},
		"remove": {
			"undo": function (collection, model, ignore, options) {
				if ("index" in options) {
					options.at = options.index;
				}
				collection.add(model, options);
			},
			"redo": function (collection, model, ignore, options) {
				collection.remove(model, options);
			},
			"on": function (model, collection, options) {
				return {
					object: collection,
					before: model,
					after: undefined,
					options: _.clone(options)
				};
			}
		},
		"change": {
			"undo": function (model, before, after, options) {
				if (_.isEmpty(before)) {
					_.each(_.keys(after), model.unset, model);
				} else {
					model.set(before);
					if (options && options.unsetData && options.unsetData.before && options.unsetData.before.length) {
						_.each(options.unsetData.before, model.unset, model);
					}
				}
			},
			"redo": function (model, before, after, options) {
				if (_.isEmpty(after)) {
					_.each(_.keys(before), model.unset, model);
				} else {
					model.set(after);
					if (options && options.unsetData && options.unsetData.after && options.unsetData.after.length) {
						_.each(options.unsetData.after, model.unset, model);
					}
				}
			},
			"on": function (model, options) {
				var
				afterAttributes = model.changedAttributes(),
				keysAfter = _.keys(afterAttributes),
				previousAttributes = _.pick(model.previousAttributes(), keysAfter),
				keysPrevious = _.keys(previousAttributes),
				unsetData = (options || (options = {})).unsetData = {
					after: [],
					before: []
				};

				if (keysAfter.length != keysPrevious.length) {
					// There are new attributes or old attributes have been unset
					if (keysAfter.length > keysPrevious.length) {
						// New attributes have been added
						_.each(keysAfter, function (val) {
							if (!(val in previousAttributes)) {
								unsetData.before.push(val);
							}
						}, this);
					} else {
						// Old attributes have been unset
						_.each(keysPrevious, function (val) {
							if (!(val in afterAttributes)) {
								unsetData.after.push(val);
							}
						})
					}
				}
				return {
					object: model,
					before: previousAttributes,
					after: afterAttributes,
					options: _.clone(options)
				};
			}
		},
		"reset": {
			"undo": function (collection, before, after) {
				collection.reset(before);
			},
			"redo": function (collection, before, after) {
				collection.reset(after);
			},
			"on": function (collection, options) {
				return {
					object: collection,
					before: options.previousModels,
					after: _.clone(collection.models)
				};
			}
		}
	};

	/**
	 * Every UndoManager instance has an own undoTypes object
	 * which is an instance of OwnedUndoTypes. OwnedUndoTypes' 
	 * prototype is the global UndoTypes object. Changes to the 
	 * global UndoTypes object take effect on every instance of
	 * UndoManager as the object is its prototype. And yet every 
	 * local UndoTypes object can be changed individually.
	 *
	 * @constructor
	 */
	function OwnedUndoTypes () {}
	OwnedUndoTypes.prototype = UndoTypes;

	/**
	 * Adds, changes or removes an undo-type from an UndoTypes-object.
	 * You can call it this way:
	 * manipulateUndoType (1, "reset", {"on": function () {}}, undoTypes)
	 * or this way to perform bulk actions:
	 * manipulateUndoType (1, {"reset": {"on": function () {}}}, undoTypes)
	 * In case of removing undo-types you can pass an Array for performing
	 * bulk actions:
	 * manipulateUndoType(2, ["reset", "change"], undoTypes)
	 * 
	 * @param  {Number} 				  manipType 		Indicates the kind of action to execute: 0 for add, 1 for change, 2 for remove
	 * @param  {String|Object|Array} 	  undoType 			The type of undoType that should be added/changed/removed. Can be an object / array to perform bulk actions
	 * @param  {Object} 				  [fns] 			Object with the functions to add / change. Is optional in case you passed an object as undoType that contains these functions
	 * @param  {OwnedUndoTypes|UndoTypes} undoTypesInstance The undoTypes object to act on
	 * @return {undefined}
	 */
	function manipulateUndoType (manipType, undoType, fns, undoTypesInstance) {
		// manipType, passed by the calling function
		// 0: add
		// 1: change
		// 2: remove
		if (typeof undoType === "object") {
			// bulk action. Iterate over this data.
			return _.each(undoType, function (val, key) {
					if (manipType === 2) { // remove
						// undoType is an array
						manipulateUndoType (manipType, val, fns, undoTypesInstance);
					} else {
						// undoType is an object
						manipulateUndoType (manipType, key, val, fns);
					}
				})
		}

		switch (manipType) {
			case 0: // add
				if (hasKeys(fns, "undo", "redo", "on") && _.all(_.pick(fns, "undo", "redo", "on"), _.isFunction)) {
					undoTypesInstance[undoType] = fns;
				} 
			break;
			case 1: // change
				if (undoTypesInstance[undoType] && _.isObject(fns)) {
					// undoTypeInstance[undoType] may be a prototype's property
					// So, if we did this _.extend(undoTypeInstance[undoType], fns)
					// we would extend the object on the prototype which means
					// that this change would have a global effect
					// Instead we just want to manipulate this instance. That's why
					// we're doing this:
					undoTypesInstance[undoType] = _.extend({}, undoTypesInstance[undoType], fns);
				} 
			break;
			case 2: // remove
				delete undoTypesInstance[undoType]; 
			break;
		}
		return this;
	}

	/**
	 * Instantiating "Action" creates the UndoActions that 
	 * are collected in an UndoStack. It holds all relevant 
	 * data to undo / redo an action and has an undo / redo 
	 * method.
	 */
	var Action = Model.extend({
		defaults: {
			type: null, // "add", "change", "reset", etc.
			object: null, // The object on which the action occurred
			before: null, // The previous values which were changed with this action
			after: null, // The values after this action
			magicFusionIndex: null // The magicFusionIndex helps to combine 
			// all actions that occurred "at the same time" to undo/redo them altogether
		},
		/**
		 * Undoes this action.
		 * @param  {OwnedUndoTypes|UndoTypes} undoTypes The undoTypes object which contains the "undo"-handler that should be used
		 * @return {undefined}
		 */
		undo: function (undoTypes) {
			actionUndoRedo("undo", this.attributes);
		},
		/**
		 * Redoes this action.
		 * @param  {OwnedUndoTypes|UndoTypes} undoTypes The undoTypes object which contains the "redo"-handler that should be used
		 * @return {undefined}
		 */
		redo: function (undoTypes) {
			actionUndoRedo("redo", this.attributes);
		}
	}),
	/**
	 * An UndoStack is a collection of UndoActions in 
	 * chronological order.
	 */
	UndoStack = Collection.extend({
		model: Action,
		pointer: -1, // The pointer indicates the index where we are located within the stack. We start at -1
		track: false,
		isCurrentlyUndoRedoing: false,
		maximumStackLength: Infinity,
		setMaxLength: function (val) {
			this.maximumStackLength = val;
		}
	}),
	/**
	 * An instance of UndoManager can keep track of 
	 * changes to objects and helps to undo them.
	 */
	UndoManager = Model.extend({
		defaults: {
			maximumStackLength: Infinity,
			track: false
		},
		/**
		 * The constructor function.
		 * @param  {attr} 		[attr] Object with parameters. The available parameters are:
		 *                         	   - maximumStackLength {number} 	Set the undo-stack's maximum size
		 *                             - track 				{boolean}	Start tracking changes right away
		 * @return {undefined}
		 */
		initialize: function (attr) {
			this.stack = new UndoStack;
			this.objectRegistry = new ObjectRegistry();
			this.undoTypes = new OwnedUndoTypes();

			// sync the maximumStackLength attribute with our stack
			this.stack.setMaxLength(this.get("maximumStackLength"));
			this.on("change:maximumStackLength", function (model, value) {
				this.stack.setMaxLength(value);
			}, this);

			// Start tracking, if attr.track == true
			if (attr && attr.track) {
				this.startTracking();
			}

			// Register objects passed in the "register" attribute
			if (attr && attr.register) {
				if (_.isArray(attr.register) || _.isArguments(attr.register)) {
					apply(this.register, this, attr.register);
				} else {
					this.register(attr.register);
				}
			}
		},
		/**
		 * Starts tracking. Changes of registered objects won't be processed until you've called this function
		 * @return {undefined}
		 */
		startTracking: function () {
			this.set("track", true);
			this.stack.track = true;
		},
		/**
		 * Stops tracking. Afterwards changes of registered objects won't be processed.
		 * @return {undefined}
		 */
		stopTracking: function () {
			this.set("track", false);
			this.stack.track = false;
		},
		/**
		 * Return the state of the tracking
		 * @return {boolean}
		 */
		isTracking: function () {
			return this.get("track");
		},
		/**
		 * This is the "all"-handler which is bound to registered 
		 * objects. It creates an UndoAction from the event and adds 
		 * it to the stack.
		 * 
		 * @param  {String} 	type 	The event type
		 * @return {undefined}
		 */
		_addToStack: function (type) {
			addToStack(this.stack, type, slice(arguments, 1), this.undoTypes);
		},
		/**
		 * Registers one or more objects to track their changes.
		 * @param {...Object} 	obj 	The object or objects of which changes should be tracked
		 * @return {undefined}
		 */
		register: function () {
			onoff("on", arguments, this._addToStack, this);
		},
		/**
		 * Unregisters one or more objects.
		 * @param {...Object} 	obj 	The object or objects of which changes shouldn't be tracked any longer
		 * @return {undefined}
		 */
		unregister: function () {
			onoff("off", arguments, this._addToStack, this);
		},
		/**
		 * Unregisters all previously registered objects.
		 * @return {undefined}
		 */
		unregisterAll: function () {
			apply(this.unregister, this, this.objectRegistry.get());
		},
		/**
		 * Undoes the last action or the last set of actions in case 'magic' is true.
		 * @param {Boolean} 	[magic] 	If true, all actions that happened basically at the same time are undone together
		 * @return {undefined}
		 */
		undo: function (magic) {
			managerUndoRedo("undo", this, this.stack, magic);
		},

		/**
		 * Undoes all actions ever tracked by the undo manager
		 * @return {undefined}
		 */
		undoAll: function () {
			managerUndoRedo("undo", this, this.stack, false, true);
		},

		/**
		 * Redoes a previously undone action or a set of actions.
		 * @param {Boolean} 	[magic] 	If true, all actions that happened basically at the same time are redone together
		 * @return {undefined}
		 */
		redo: function (magic) {
			managerUndoRedo("redo", this, this.stack, magic);
		},

		/**
		 * Redoes all actions ever tracked by the undo manager
		 * @return {undefined}
		 */
		redoAll: function () {
			managerUndoRedo("redo", this, this.stack, false, true);
		},
		/**
		 * Checks if there's an action in the stack that can be undone / redone
		 * @param  {String} 	type 	Either "undo" or "redo"
		 * @return {Boolean} True if there is a set of actions which can be undone / redone
		 */
		isAvailable: function (type) {
			var s = this.stack, l = s.length;

			switch (type) {
				case "undo": return l > 0 && s.pointer > -1;
				case "redo": return l > 0 && s.pointer < l - 1;
				default: return false;
			}
		},
		/**
		 * Sets the stack-reference to the stack of another undoManager.
		 * @param  {UndoManager} 	undoManager 	The undoManager whose stack-reference is set to this stack
		 * @return {undefined}
		 */
		merge: function (undoManager) {
			// This sets the stack-reference to the stack of another 
			// undoManager so that the stack of this other undoManager 
			// is used by two different managers.
			// This enables to set up a main-undoManager and besides it
			// several others for special, exceptional cases (by using
			// instance-based custom UndoTypes). Models / collections 
			// which need this special treatment are only registered at 
			// those special undoManagers. Those special ones are then 
			// merged into the main-undoManager to write on its stack. 
			// That way it's easier to manage exceptional cases.
			var args = _.isArray(undoManager) ? undoManager : slice(arguments), manager;
			while (manager = args.pop()) {
				if (manager instanceof UndoManager &&
					manager.stack instanceof UndoStack) {
					// set the stack reference to our stack
					manager.stack = this.stack;
				}
			}
		},
		/**
		 * Add an UndoType to this specific UndoManager-instance.
		 * @param {String} type The event this UndoType is made for
		 * @param {Object} fns  An object of functions that are called to generate the data for an UndoAction or to process it. Must have the properties "undo", "redo" and "on". Can have the property "condition".
		 * @return {undefined}
		 */
		addUndoType: function (type, fns) {
			manipulateUndoType(0, type, fns, this.undoTypes);
		},
		/**
		 * Overwrite properties of an existing UndoType for this specific UndoManager-instance.
		 * @param  {String} type The event the UndoType is made for
		 * @param  {Object} fns  An object of functions that are called to generate the data for an UndoAction or to process it. It extends the existing object.
		 * @return {undefined}
		 */
		changeUndoType: function (type, fns) {
			manipulateUndoType(1, type, fns, this.undoTypes);
		},
		/**
		 * Remove one or more UndoTypes of this specific UndoManager-instance to fall back to the global UndoTypes.
		 * @param  {String|Array} type The event the UndoType that should be removed is made for. You can also pass an array of events.
		 * @return {undefined}
		 */
		removeUndoType: function (type) {
			manipulateUndoType(2, type, undefined, this.undoTypes);
		},

		/**
		 * Removes all actions from the stack.
		 * @return {undefined}
		 */
		clear: function() {
			this.stack.reset();
			this.stack.pointer = -1;
		}
	});

	_.extend(UndoManager, {
		/**
		 * Change the UndoManager's default attributes
		 * @param  {Object} defaultAttributes An object with the new default values.
		 * @return {undefined}
		 */
		defaults: function (defaultAttributes) {
			_.extend(UndoManager.prototype.defaults, defaultAttributes);
		},
		/**
		 * Add an UndoType to the global UndoTypes-object.
		 * @param  {String} type The event this UndoType is made for
		 * @param  {Object} fns  An object of functions that are called to generate the data for an UndoAction or to process it. Must have the properties "undo", "redo" and "on". Can have the property "condition".
		 * @return {undefined}
		 */
		"addUndoType": function (type, fns) {
			manipulateUndoType(0, type, fns, UndoTypes);
		},
		/**
		 * Overwrite properties of an existing UndoType in the global UndoTypes-object.
		 * @param  {String} type The event the UndoType is made for
		 * @param  {Object} fns  An object of functions that are called to generate the data for an UndoAction or to process it. It extends the existing object.
		 * @return {undefined}
		 */
		"changeUndoType": function (type, fns) {
			manipulateUndoType(1, type, fns, UndoTypes)
		},
		/**
		 * Remove one or more UndoTypes of this specific UndoManager-instance to fall back to the global UndoTypes.
		 * @param  {String|Array} type The event the UndoType that should be removed is made for. You can also pass an array of events.
		 * @return {undefined}
		 */
		"removeUndoType": function (type) {
			manipulateUndoType(2, type, undefined, UndoTypes);
		}
	})

	return Backbone.UndoManager = UndoManager;

});

define('skylark-backbone/main',[
	"./backbone",
	"./events",
	"./Collection",
	"./Model",
	"./History",
	"./Router",
	"./View",
	"./UndoManager"
],function(backbone){
	return backbone;
});
define('skylark-backbone', ['skylark-backbone/main'], function (main) { return main; });


},this);
//# sourceMappingURL=sourcemaps/skylark-backbone.js.map
