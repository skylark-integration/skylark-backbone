/**
 * skylark-backbone - A version of backbone that ported to running on skylarkjs.
 * @author 
 * @version v0.9.0
 * @link 
 * @license MIT
 */
define(["skylark-langx/langx","./backbone"],function(n,t){var e=Array.prototype.slice,i={on:function(n,t,i){var o=function(){var i=e.call(arguments,1);"all"==n&&i.unshift(arguments[0].type),t.apply(this,i)};return o._=t,this.overrided(n,o,i)},once:function(n,t,e){return this.one(n,t,e)},bind:function(n,t,e){return this.on(n,t,e)},unbind:function(n,t,e){return this.off(n,t,e)},stopListening:function(n,t,e){return this.unlistenTo(n,t,e)}},o=n.Evented.inherit(i),r=o.prototype,s=t.Events={bind:r.bind,listenTo:r.listenTo,listenToOnce:r.listenToOnce,off:r.off,on:r.on,once:r.once,stopListening:r.stopListening,trigger:r.trigger,unbind:r.unbind,unlistenTo:r.unlistenTo};return n.extend(t,s),{EventExtends:i,BackboneEvented:o}});
//# sourceMappingURL=sourcemaps/events.js.map
