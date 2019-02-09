define([
  "skylark-langx/langx",
  "skylark-underscore/underscore",
  "skylark-fw-model",
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