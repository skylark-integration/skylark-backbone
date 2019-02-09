/**
 * skylark-backbone - A version of backbone that ported to running on skylarkjs.
 * @author 
 * @version v0.9.0
 * @link 
 * @license MIT
 */
define(["skylark-langx/skylark","skylark-fw-model","skylark-jquery"],function(e,a,l){var n=e.backbone={emulateHTTP:!1,emulateJSON:!1};return n.$=l,n.sync=function(e,l,t){return langx.defaults(t||(t={}),{emulateHTTP:n.emulateHTTP,emulateJSON:n.emulateJSON}),a.backends.ajaxSync.apply(this,[e,l,t])},n});
//# sourceMappingURL=sourcemaps/backbone.js.map
