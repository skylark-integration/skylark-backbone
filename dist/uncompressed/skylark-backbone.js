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
                exports: null
            };
            require(id);
        } else {
            map[id] = factory;
        }
    };
    require = globals.require = function(id) {
        if (!map.hasOwnProperty(id)) {
            throw new Error('Module ' + id + ' has not been defined');
        }
        var module = map[id];
        if (!module.exports) {
            var args = [];

            module.deps.forEach(function(dep){
                args.push(require(dep));
            })

            module.exports = module.factory.apply(globals, args);
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
	"skylark-jquery"
],function(skylark,$){
//     from Backbone.js 1.2.3

//     (c) 2010-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org
	var Backbone = skylark.backbone = {}
    Backbone.$ = $;

	return Backbone ;
});
define('skylark-backbone/models',[
    "skylark-langx/langx"
], function(langx) {

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch': 'PATCH',
    'delete': 'DELETE',
    'read': 'GET'
  };
  
  // Wrap an optional error callback with a fallback error event.
  var wrapError = function(model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error.call(options.context, model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

  var sync = function(method, entity, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    langx.defaults(options || (options = {}), {
      emulateHTTP: models.emulateHTTP,
      emulateJSON: models.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = langx.result(entity, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && entity && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || entity.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {entity: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // Pass along `textStatus` and `errorThrown` from jQuery.
    var error = options.error;
    options.error = function(xhr, textStatus, errorThrown) {
      options.textStatus = textStatus;
      options.errorThrown = errorThrown;
      if (error) error.call(options.context, xhr, textStatus, errorThrown);
    };

    // Make the request, allowing the user to override any Ajax options.
    var xhr = options.xhr = langx.Xhr.request(langx.mixin(params, options));
    entity.trigger('request', entity, xhr, options);
    return xhr;
  };


  var Entity = langx.Stateful.inherit({
    sync: function() {
      return models.sync.apply(this, arguments);
    },

    // Get the HTML-escaped value of an attribute.
    //escape: function(attr) {
    //  return _.escape(this.get(attr));
    //},

    // Special-cased proxy to underscore's `_.matches` method.
    matches: function(attrs) {
      return langx.isMatch(this.attributes,attrs);
    },

    // Fetch the entity from the server, merging the response with the entity's
    // local attributes. Any changed attributes will trigger a "change" event.
    fetch: function(options) {
      options = langx.mixin({parse: true}, options);
      var entity = this;
      var success = options.success;
      options.success = function(resp) {
        var serverAttrs = options.parse ? entity.parse(resp, options) : resp;
        if (!entity.set(serverAttrs, options)) return false;
        if (success) success.call(options.context, entity, resp, options);
        entity.trigger('sync', entity, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Set a hash of entity attributes, and sync the entity to the server.
    // If the server returns an attributes hash that differs, the entity's
    // state will be `set` again.
    save: function(key, val, options) {
      // Handle both `"key", value` and `{key: value}` -style arguments.
      var attrs;
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options = langx.mixin({validate: true, parse: true}, options);
      var wait = options.wait;

      // If we're not waiting and attributes exist, save acts as
      // `set(attr).save(null, opts)` with validation. Otherwise, check if
      // the entity will be valid when the attributes, if any, are set.
      if (attrs && !wait) {
        if (!this.set(attrs, options)) return false;
      } else if (!this._validate(attrs, options)) {
        return false;
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      var entity = this;
      var success = options.success;
      var attributes = this.attributes;
      options.success = function(resp) {
        // Ensure attributes are restored during synchronous saves.
        entity.attributes = attributes;
        var serverAttrs = options.parse ? entity.parse(resp, options) : resp;
        if (wait) serverAttrs = langx.mixin({}, attrs, serverAttrs);
        if (serverAttrs && !entity.set(serverAttrs, options)) return false;
        if (success) success.call(options.context, entity, resp, options);
        entity.trigger('sync', entity, resp, options);
      };
      wrapError(this, options);

      // Set temporary attributes if `{wait: true}` to properly find new ids.
      if (attrs && wait) this.attributes = langx.mixin({}, attributes, attrs);

      var method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch' && !options.attrs) options.attrs = attrs;
      var xhr = this.sync(method, this, options);

      // Restore attributes.
      this.attributes = attributes;

      return xhr;
    },

    // Destroy this entity on the server if it was already persisted.
    // Optimistically removes the entity from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? langx.clone(options) : {};
      var entity = this;
      var success = options.success;
      var wait = options.wait;

      var destroy = function() {
        entity.stopListening();
        entity.trigger('destroy', entity, entity.collection, options);
      };

      options.success = function(resp) {
        if (wait) destroy();
        if (success) success.call(options.context, entity, resp, options);
        if (!entity.isNew()) entity.trigger('sync', entity, resp, options);
      };

      var xhr = false;
      if (this.isNew()) {
        langx.defer(options.success);
      } else {
        wrapError(this, options);
        xhr = this.sync('delete', this, options);
      }
      if (!wait) destroy();
      return xhr;
    },

    // Default URL for the entity's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base =
        langx.result(this, 'urlRoot') ||
        langx.result(this.collection, 'url') ||
        urlError();
      if (this.isNew()) return base;
      var id = this.get(this.idAttribute);
      return base.replace(/[^\/]$/, '$&/') + encodeURIComponent(id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the entity. The default implementation is just to pass the response along.
    parse: function(resp, options) {
      return resp;
    }
  });

  var Collection  = langx.Evented.inherit({
    "_construct" : function(entities, options) {
      options || (options = {});
      if (options.entity) this.entity = options.entity;
      if (options.comparator !== void 0) this.comparator = options.comparator;
      this._reset();
      if (entities) this.reset(entities, langx.mixin({silent: true}, options));
    }
  }); 

  // Default options for `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, remove: false};

  // Splices `insert` into `array` at index `at`.
  var splice = function(array, insert, at) {
    at = Math.min(Math.max(at, 0), array.length);
    var tail = Array(array.length - at);
    var length = insert.length;
    var i;
    for (i = 0; i < tail.length; i++) tail[i] = array[i + at];
    for (i = 0; i < length; i++) array[i + at] = insert[i];
    for (i = 0; i < tail.length; i++) array[i + length + at] = tail[i];
  };

  // Define the Collection's inheritable methods.
  Collection.partial({

    // The default entity for a collection is just a **Entity**.
    // This should be overridden in most cases.
    entity: Entity,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // entities' attributes.
    toJSON: function(options) {
      return this.map(function(entity) { return entity.toJSON(options); });
    },

    // Proxy `models.sync` by default.
    sync: function() {
      return models.sync.apply(this, arguments);
    },

    // Add a entity, or list of entities to the set. `entities` may be Backbone
    // Entitys or raw JavaScript objects to be converted to Entitys, or any
    // combination of the two.
    add: function(entities, options) {
      return this.set(entities, langx.mixin({merge: false}, options, addOptions));
    },

    // Remove a entity, or a list of entities from the set.
    remove: function(entities, options) {
      options = langx.mixin({}, options);
      var singular = !langx.isArray(entities);
      entities = singular ? [entities] : entities.slice();
      var removed = this._removeEntitys(entities, options);
      if (!options.silent && removed.length) {
        options.changes = {added: [], merged: [], removed: removed};
        this.trigger('update', this, options);
      }
      return singular ? removed[0] : removed;
    },

    // Update a collection by `set`-ing a new list of entities, adding new ones,
    // removing entities that are no longer present, and merging entities that
    // already exist in the collection, as necessary. Similar to **Entity#set**,
    // the core operation for updating the data contained by the collection.
    set: function(entities, options) {
      if (entities == null) return;

      options = langx.mixin({}, setOptions, options);
      if (options.parse && !this._isEntity(entities)) {
        entities = this.parse(entities, options) || [];
      }

      var singular = !langx.isArray(entities);
      entities = singular ? [entities] : entities.slice();

      var at = options.at;
      if (at != null) at = +at;
      if (at > this.length) at = this.length;
      if (at < 0) at += this.length + 1;

      var set = [];
      var toAdd = [];
      var toMerge = [];
      var toRemove = [];
      var modelMap = {};

      var add = options.add;
      var merge = options.merge;
      var remove = options.remove;

      var sort = false;
      var sortable = this.comparator && at == null && options.sort !== false;
      var sortAttr = langx.isString(this.comparator) ? this.comparator : null;

      // Turn bare objects into entity references, and prevent invalid entities
      // from being added.
      var entity, i;
      for (i = 0; i < entities.length; i++) {
        entity = entities[i];

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing entity.
        var existing = this.get(entity);
        if (existing) {
          if (merge && entity !== existing) {
            var attrs = this._isEntity(entity) ? entity.attributes : entity;
            if (options.parse) attrs = existing.parse(attrs, options);
            existing.set(attrs, options);
            toMerge.push(existing);
            if (sortable && !sort) sort = existing.hasChanged(sortAttr);
          }
          if (!modelMap[existing.cid]) {
            modelMap[existing.cid] = true;
            set.push(existing);
          }
          entities[i] = existing;

        // If this is a new, valid entity, push it to the `toAdd` list.
        } else if (add) {
          entity = entities[i] = this._prepareEntity(entity, options);
          if (entity) {
            toAdd.push(entity);
            this._addReference(entity, options);
            modelMap[entity.cid] = true;
            set.push(entity);
          }
        }
      }

      // Remove stale entities.
      if (remove) {
        for (i = 0; i < this.length; i++) {
          entity = this.entities[i];
          if (!modelMap[entity.cid]) toRemove.push(entity);
        }
        if (toRemove.length) this._removeEntitys(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new entities.
      var orderChanged = false;
      var replace = !sortable && add && remove;
      if (set.length && replace) {
        orderChanged = this.length !== set.length || this.entities.some(function(m, index) {
          return m !== set[index];
        });
        this.entities.length = 0;
        splice(this.entities, set, 0);
        this.length = this.entities.length;
      } else if (toAdd.length) {
        if (sortable) sort = true;
        splice(this.entities, toAdd, at == null ? this.length : at);
        this.length = this.entities.length;
      }

      // Silently sort the collection if appropriate.
      if (sort) this.sort({silent: true});

      // Unless silenced, it's time to fire all appropriate add/sort/update events.
      if (!options.silent) {
        for (i = 0; i < toAdd.length; i++) {
          if (at != null) options.index = at + i;
          entity = toAdd[i];
          entity.trigger('add', entity, this, options);
        }
        if (sort || orderChanged) this.trigger('sort', this, options);
        if (toAdd.length || toRemove.length || toMerge.length) {
          options.changes = {
            added: toAdd,
            removed: toRemove,
            merged: toMerge
          };
          this.trigger('update', this, options);
        }
      }

      // Return the added (or merged) entity (or entities).
      return singular ? entities[0] : entities;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of entities, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(entities, options) {
      options = options ? langx.clone(options) : {};
      for (var i = 0; i < this.entities.length; i++) {
        this._removeReference(this.entities[i], options);
      }
      options.previousEntitys = this.entities;
      this._reset();
      entities = this.add(entities, langx.mixin({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return entities;
    },

    // Add a entity to the end of the collection.
    push: function(entity, options) {
      return this.add(entity, langx.mixin({at: this.length}, options));
    },

    // Remove a entity from the end of the collection.
    pop: function(options) {
      var entity = this.at(this.length - 1);
      return this.remove(entity, options);
    },

    // Add a entity to the beginning of the collection.
    unshift: function(entity, options) {
      return this.add(entity, langx.mixin({at: 0}, options));
    },

    // Remove a entity from the beginning of the collection.
    shift: function(options) {
      var entity = this.at(0);
      return this.remove(entity, options);
    },

    // Slice out a sub-array of entities from the collection.
    slice: function() {
      return slice.apply(this.entities, arguments);
    },

    // Get a entity from the set by id, cid, entity object with id or cid
    // properties, or an attributes object that is transformed through entityId.
    get: function(obj) {
      if (obj == null) return void 0;
      return this._byId[obj] ||
        this._byId[this.entityId(obj.attributes || obj)] ||
        obj.cid && this._byId[obj.cid];
    },

    // Returns `true` if the entity is in the collection.
    has: function(obj) {
      return this.get(obj) != null;
    },

    // Get the entity at the given index.
    at: function(index) {
      if (index < 0) index += this.length;
      return this.entities[index];
    },

    // Return entities with matching attributes. Useful for simple cases of
    // `filter`.
    where: function(attrs, first) {
      return this[first ? 'find' : 'filter'](attrs);
    },

    // Return the first entity with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      var comparator = this.comparator;
      if (!comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      var length = comparator.length;
      if (langx.isFunction(comparator)) comparator = langx.proxy(comparator, this);

      // Run sort based on type of `comparator`.
      if (length === 1 || langx.isString(comparator)) {
        this.entities = this.sortBy(comparator);
      } else {
        this.entities.sort(comparator);
      }
      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Pluck an attribute from each entity in the collection.
    pluck: function(attr) {
      return this.map(attr + '');
    },

    // Fetch the default set of entities for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function(options) {
      options = langx.mixin({parse: true}, options);
      var success = options.success;
      var collection = this;
      options.success = function(resp) {
        var method = options.reset ? 'reset' : 'set';
        collection[method](resp, options);
        if (success) success.call(options.context, collection, resp, options);
        collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Create a new instance of a entity in this collection. Add the entity to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(entity, options) {
      options = options ? langx.clone(options) : {};
      var wait = options.wait;
      entity = this._prepareEntity(entity, options);
      if (!entity) return false;
      if (!wait) this.add(entity, options);
      var collection = this;
      var success = options.success;
      options.success = function(m, resp, callbackOpts) {
        if (wait) collection.add(m, callbackOpts);
        if (success) success.call(callbackOpts.context, m, resp, callbackOpts);
      };
      entity.save(null, options);
      return entity;
    },

    // **parse** converts a response into a list of entities to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of entities as this one.
    clone: function() {
      return new this.constructor(this.entities, {
        entity: this.entity,
        comparator: this.comparator
      });
    },

    // Define how to uniquely identify entities in the collection.
    entityId: function(attrs) {
      return attrs[this.entity.prototype.idAttribute || 'id'];
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    _reset: function() {
      this.length = 0;
      this.entities = [];
      this._byId  = {};
    },

    // Prepare a hash of attributes (or other entity) to be added to this
    // collection.
    _prepareEntity: function(attrs, options) {
      if (this._isEntity(attrs)) {
        if (!attrs.collection) attrs.collection = this;
        return attrs;
      }
      options = options ? langx.clone(options) : {};
      options.collection = this;
      var entity = new this.entity(attrs, options);
      if (!entity.validationError) return entity;
      this.trigger('invalid', this, entity.validationError, options);
      return false;
    },

    // Internal method called by both remove and set.
    _removeEntitys: function(entities, options) {
      var removed = [];
      for (var i = 0; i < entities.length; i++) {
        var entity = this.get(entities[i]);
        if (!entity) continue;

        var index = this.indexOf(entity);
        this.entities.splice(index, 1);
        this.length--;

        // Remove references before triggering 'remove' event to prevent an
        // infinite loop. #3693
        delete this._byId[entity.cid];
        var id = this.entityId(entity.attributes);
        if (id != null) delete this._byId[id];

        if (!options.silent) {
          options.index = index;
          entity.trigger('remove', entity, this, options);
        }

        removed.push(entity);
        this._removeReference(entity, options);
      }
      return removed;
    },

    // Method for checking whether an object should be considered a entity for
    // the purposes of adding to the collection.
    _isEntity: function(entity) {
      return entity instanceof Entity;
    },

    // Internal method to create a entity's ties to a collection.
    _addReference: function(entity, options) {
      this._byId[entity.cid] = entity;
      var id = this.entityId(entity.attributes);
      if (id != null) this._byId[id] = entity;
      entity.on('all', this._onEntityEvent, this);
    },

    // Internal method to sever a entity's ties to a collection.
    _removeReference: function(entity, options) {
      delete this._byId[entity.cid];
      var id = this.entityId(entity.attributes);
      if (id != null) delete this._byId[id];
      if (this === entity.collection) delete entity.collection;
      entity.off('all', this._onEntityEvent, this);
    },

    // Internal method called every time a entity in the set fires an event.
    // Sets need to update their indexes when entities change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onEntityEvent: function(event, entity, collection, options) {
      if (entity) {
        if ((event === 'add' || event === 'remove') && collection !== this) return;
        if (event === 'destroy') this.remove(entity, options);
        if (event === 'change') {
          var prevId = this.entityId(entity.previousAttributes());
          var id = this.entityId(entity.attributes);
          if (prevId !== id) {
            if (prevId != null) delete this._byId[prevId];
            if (id != null) this._byId[id] = entity;
          }
        }
      }
      this.trigger.apply(this, arguments);
    }

  });

    function models() {
        return models;
    }

    langx.mixin(models, {
        // set a `X-Http-Method-Override` header.
        emulateHTTP : false,

        // Turn on `emulateJSON` to support legacy servers that can't deal with direct
        // `application/json` requests ... this will encode the body as
        // `application/x-www-form-urlencoded` instead and will send the model in a
        // form param named `model`.
        emulateJSON : false,

        sync : sync,

        Entity: Entity,
        Collection : Collection
    });


    return models;
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
  "./models",
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
      initialize: function(){}

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
  "./models",
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
      }
  });



  // Attach all inheritable methods to the Model prototype.
  Model.partial(events.EventExtends);

  Model.extend = helper.extend;

  return Model;
});
define('skylark-backbone/View',[
  "skylark-langx/langx",
  "skylark-utils-dom/query",
  "skylark-utils-dom/noder",
  "skylark-utils-dom/plugins",
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
define('skylark-backbone/LocalStorage',[
  "skylark-langx/langx",
  "skylark-underscore",
  "./models",
  "./backbone"
],function(langx,_,models,Backbone){

// A simple module to replace `Backbone.sync` with *localStorage*-based
// persistence. Models are given GUIDS, and saved into a JSON object. Simple
// as that.

// Hold reference to Underscore.js and Backbone.js in the closure in order
// to make things work even if they are removed from the global namespace

// Generate four random hex digits.
function S4() {
   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
};

// Generate a pseudo-GUID by concatenating random hexadecimal.
function guid() {
   return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
};

// Our Store is represented by a single JS object in *localStorage*. Create it
// with a meaningful name, like the name you'd give a table.
// window.Store is deprecated, use Backbone.LocalStorage instead
var LocalStorage = langx.klass({
  _construct : function(name) {
    this.name = name;
    var store = this.localStorage().getItem(this.name);
    this.records = (store && store.split(",")) || [];
  },

  // Save the current state of the **Store** to *localStorage*.
  save: function() {
    this.localStorage().setItem(this.name, this.records.join(","));
  },

  // Add a model, giving it a (hopefully)-unique GUID, if it doesn't already
  // have an id of it's own.
  create: function(model) {
    if (!model.id) {
      model.id = guid();
      model.set(model.idAttribute, model.id);
    }
    this.localStorage().setItem(this.name+"-"+model.id, JSON.stringify(model));
    this.records.push(model.id.toString());
    this.save();
    return this.find(model);
  },

  // Update a model by replacing its copy in `this.data`.
  update: function(model) {
    this.localStorage().setItem(this.name+"-"+model.id, JSON.stringify(model));
    if (!_.include(this.records, model.id.toString()))
      this.records.push(model.id.toString()); this.save();
    return this.find(model);
  },

  // Retrieve a model from `this.data` by id.
  find: function(model) {
    return this.jsonData(this.localStorage().getItem(this.name+"-"+model.id));
  },

  // Return the array of all models currently in storage.
  findAll: function() {
    return _(this.records).chain()
      .map(function(id){
        return this.jsonData(this.localStorage().getItem(this.name+"-"+id));
      }, this)
      .compact()
      .value();
  },

  // Delete a model from `this.data`, returning it.
  destroy: function(model) {
    if (model.isNew())
      return false
    this.localStorage().removeItem(this.name+"-"+model.id);
    this.records = _.reject(this.records, function(id){
      return id === model.id.toString();
    });
    this.save();
    return model;
  },

  localStorage: function() {
    return localStorage;
  },

  // fix for "illegal access" error on Android when JSON.parse is passed null
  jsonData: function (data) {
      return data && JSON.parse(data);
  }

});

// localSync delegate to the model or collection's
// *localStorage* property, which should be an instance of `Store`.
// window.Store.sync and Backbone.localSync is deprectated, use Backbone.LocalStorage.sync instead
LocalStorage.sync = models.localSync = function(method, model, options) {
  var store = model.localStorage || model.collection.localStorage;

  var resp, errorMessage, syncDfd = $.Deferred && $.Deferred(); //If $ is having Deferred - use it.

  try {

    switch (method) {
      case "read":
        resp = model.id != undefined ? store.find(model) : store.findAll();
        break;
      case "create":
        resp = store.create(model);
        break;
      case "update":
        resp = store.update(model);
        break;
      case "delete":
        resp = store.destroy(model);
        break;
    }

  } catch(error) {
    if (error.code === DOMException.QUOTA_EXCEEDED_ERR && window.localStorage.length === 0)
      errorMessage = "Private browsing is unsupported";
    else
      errorMessage = error.message;
  }

  if (resp) {
    model.trigger("sync", model, resp, options);
    if (options && options.success)
      options.success(resp);
    if (syncDfd)
      syncDfd.resolve(resp);

  } else {
    errorMessage = errorMessage ? errorMessage
                                : "Record Not Found";

    if (options && options.error)
      options.error(errorMessage);
    if (syncDfd)
      syncDfd.reject(errorMessage);
  }

  // add compatibility with $.ajax
  // always execute callback for success and error
  if (options && options.complete) options.complete(resp);

  return syncDfd && syncDfd.promise();
};


models.ajaxSync = models.sync;

models.getSyncMethod = function(model) {
  if(model.localStorage || (model.collection && model.collection.localStorage)) {
    return models.localSync;
  }

  return models.ajaxSync;
};

// Override 'Backbone.sync' to default to localSync,
// the original 'Backbone.sync' is still available in 'Backbone.ajaxSync'
models.sync = function(method, model, options) {
  return models.getSyncMethod(model).apply(this, [method, model, options]);
};

return Backbone.LocalStorage =  LocalStorage;

});
define('skylark-backbone/main',[
	"./backbone",
	"./Collection",
	"./events",
	"./Model",
	"./View",
	"./LocalStorage"
],function(backbone){
	return backbone;
});
define('skylark-backbone', ['skylark-backbone/main'], function (main) { return main; });


},this);
//# sourceMappingURL=sourcemaps/skylark-backbone.js.map
