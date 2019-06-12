/**
 * skylark-backbone - A version of backbone that ported to running on skylarkjs.
 * @author 
 * @version v0.9.0
 * @link 
 * @license MIT
 */
define(["skylark-langx/skylark","skylark-data-entities","skylark-jquery"],function(a,e,t){var l={emulateHTTP:!1,emulateJSON:!1};return l.$=t,l.sync=function(a,t,n){return langx.defaults(n||(n={}),{emulateHTTP:l.emulateHTTP,emulateJSON:l.emulateJSON}),e.backends.ajaxSync.apply(this,[a,t,n])},a.attach("itg.backbone",l)});
//# sourceMappingURL=sourcemaps/backbone.js.map
