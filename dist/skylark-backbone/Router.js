/**
 * skylark-backbone - A version of backbone that ported to running on skylarkjs.
 * @author 
 * @version v0.9.0
 * @link 
 * @license MIT
 */
define(["skylark-langx/langx","skylark-underscore/underscore","./backbone","./events","./helper"],function(e,t,r,n,i){var o=r.Router=n.BackboneEvented.inherit({_construct:function(e){e||(e={}),e.routes&&(this.routes=e.routes),this._bindRoutes(),this.initialize.apply(this,arguments)}}),u=/\((.*?)\)/g,s=/(\(\?)?:\w+/g,a=/\*\w+/g,c=/[\-{}\[\]+?.,\\\^$|#\s]/g;return o.partial({initialize:function(){},route:function(e,n,i){t.isRegExp(e)||(e=this._routeToRegExp(e)),t.isFunction(n)&&(i=n,n=""),i||(i=this[n]);var o=this;return r.history.route(e,function(t){var u=o._extractParameters(e,t);!1!==o.execute(i,u,n)&&(o.trigger.apply(o,["route:"+n].concat(u)),o.trigger("route",n,u),r.history.trigger("route",o,n,u))}),this},execute:function(e,t,r){e&&e.apply(this,t)},navigate:function(e,t){return r.history.navigate(e,t),this},_bindRoutes:function(){if(this.routes){this.routes=t.result(this,"routes");for(var e,r=t.keys(this.routes);null!=(e=r.pop());)this.route(e,this.routes[e])}},_routeToRegExp:function(e){return e=e.replace(c,"\\$&").replace(u,"(?:$1)?").replace(s,function(e,t){return t?e:"([^/?]+)"}).replace(a,"([^?]*?)"),new RegExp("^"+e+"(?:\\?([\\s\\S]*))?$")},_extractParameters:function(e,r){var n=e.exec(r).slice(1);return t.map(n,function(e,t){return t===n.length-1?e||null:e?decodeURIComponent(e):null})}}),o.extend=i.extend,o});
//# sourceMappingURL=sourcemaps/Router.js.map
