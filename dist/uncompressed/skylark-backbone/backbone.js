define([
	"skylark-langx/skylark",
    "skylark-fw-model",
	"skylark-jquery"
],function(skylark, models,$){
//     from Backbone.js 1.2.3

//     (c) 2010-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org
	var Backbone = skylark.backbone = {
        // set a `X-Http-Method-Override` header.
        emulateHTTP : false,

        // Turn on `emulateJSON` to support legacy servers that can't deal with direct
        // `application/json` requests ... this will encode the body as
        // `application/x-www-form-urlencoded` instead and will send the model in a
        // form param named `model`.
        emulateJSON : false,

	}
    
    Backbone.$ = $;

    Backbone.sync =    function(method, entity, options) {
	    // Default options, unless specified.
	    langx.defaults(options || (options = {}), {
	      emulateHTTP: Backbone.emulateHTTP,
	      emulateJSON: Backbone.emulateJSON
	    });
	    return models.backends.ajaxSync.apply(this,[method,entity,options]);
	};


	return Backbone ;
});