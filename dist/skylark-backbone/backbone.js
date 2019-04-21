/**
 * skylark-backbone - A version of backbone that ported to running on skylarkjs.
 * @author 
 * @version v0.9.0
 * @link 
 * @license MIT
 */
define(["skylark-langx/skylark","skylark-fw-model","skylark-jquery"],function(a,e,l){var t={emulateHTTP:!1,emulateJSON:!1};return t.$=l,t.sync=function(a,l,n){return langx.defaults(n||(n={}),{emulateHTTP:t.emulateHTTP,emulateJSON:t.emulateJSON}),e.backends.ajaxSync.apply(this,[a,l,n])},a.attach("itg.backbone",t)});
//# sourceMappingURL=sourcemaps/backbone.js.map
