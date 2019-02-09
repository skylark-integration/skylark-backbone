/**
 * skylark-backbone - A version of backbone that ported to running on skylarkjs.
 * @author 
 * @version v0.9.0
 * @link 
 * @license MIT
 */
define(["skylark-langx/langx","skylark-underscore/underscore","skylark-fw-model","./backbone","./events","./helper"],function(t,e,n,i,r,s){var a=i.Model=n.Entity.inherit({_construct:function(e,n){t.Stateful.prototype._construct.apply(this,arguments),this.initialize.apply(this,arguments)},initialize:function(){},escape:function(t){return e.escape(this.get(t))},matches:function(t){return!!e.iteratee(t,this)(this.attributes)},sync:function(){return i.sync.apply(this,arguments)}});return a.partial(r.EventExtends),a.extend=s.extend,a});
//# sourceMappingURL=sourcemaps/Model.js.map
