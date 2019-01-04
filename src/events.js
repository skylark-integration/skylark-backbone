define([
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