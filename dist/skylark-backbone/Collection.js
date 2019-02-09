/**
 * skylark-backbone - A version of backbone that ported to running on skylarkjs.
 * @author 
 * @version v0.9.0
 * @link 
 * @license MIT
 */
define(["skylark-langx/langx","skylark-fw-model","./backbone","./events","./helper"],function(e,t,i,n,o){var r=i.Collection=t.Collection.inherit({_construct:function(e,t){t||(t={}),t.model&&(this.model=t.model),void 0!==t.comparator&&(this.comparator=t.comparator),this._reset(),this.initialize.apply(this,arguments),e&&this.reset(e,_.extend({silent:!0},t))},initialize:function(){},sync:function(){return i.sync.apply(this,arguments)}});r.partial(n.EventExtends),Object.defineProperty(r.prototype,"model",{get(){return this.entity},set(e){this.entity=e}}),Object.defineProperty(r.prototype,"models",{get(){return this.entities},set(e){this.entities=e}}),r.prototype.modelId=r.prototype.entityId,r.prototype._isModel=r.prototype._isEntity;return o.addUnderscoreMethods(r,{forEach:3,each:3,map:3,collect:3,reduce:0,foldl:0,inject:0,reduceRight:0,foldr:0,find:3,detect:3,filter:3,select:3,reject:3,every:3,all:3,some:3,any:3,include:3,includes:3,contains:3,invoke:0,max:3,min:3,toArray:1,size:1,first:3,head:3,take:3,initial:3,rest:3,tail:3,drop:3,last:3,without:0,difference:0,indexOf:3,shuffle:1,lastIndexOf:3,isEmpty:1,chain:1,sample:3,partition:3,groupBy:3,countBy:3,sortBy:3,indexBy:3,findIndex:3,findLastIndex:3},"models"),r.extend=o.extend,r});
//# sourceMappingURL=sourcemaps/Collection.js.map
