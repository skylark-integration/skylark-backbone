/**
 * skylark-backbone - A version of backbone that ported to running on skylarkjs.
 * @author 
 * @version v0.9.0
 * @link 
 * @license MIT
 */
define(["skylark-langx/langx","skylark-underscore/underscore","./backbone"],function(n,t,r){var e=function(n,r){return t.isFunction(n)?n:t.isObject(n)&&!r._isModel(n)?u(n):t.isString(n)?function(t){return t.get(n)}:n},u=function(n){var r=t.matches(n);return function(n){return r(n.attributes)}};return{addUnderscoreMethods:function(n,r,u){t.each(r,function(r,i){t[i]&&(n.prototype[i]=function(n,r,u){switch(n){case 1:return function(){return t[r](this[u])};case 2:return function(n){return t[r](this[u],n)};case 3:return function(n,i){return t[r](this[u],e(n,this),i)};case 4:return function(n,i,c){return t[r](this[u],e(n,this),i,c)};default:return function(){var n=slice.call(arguments);return n.unshift(this[u]),t[r].apply(t,n)}}}(r,i,u))})},extend:r.extend=function(n,r){n.constructor=this._constructor;var e=this.inherit(n);return t.extend(e,r),e}}});
//# sourceMappingURL=sourcemaps/helper.js.map
