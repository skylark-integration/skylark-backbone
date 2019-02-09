define([
  "skylark-langx/langx",
  "skylark-fw-model",
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