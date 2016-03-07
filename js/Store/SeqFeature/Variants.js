define([
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/request',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Model/SimpleFeature',
            'JBrowse/Util'
       ],
       function(
            declare,
            array,
            request,
            SeqFeatureStore,
            SimpleFeature,
            Util
       ) {

var dojof = Util.dojof;

return declare( SeqFeatureStore, {

    constructor: function( args ) {
        // perform any steps to initialize your new store.  
    },

    getFeatures: function( query, featureCallback, finishCallback, errorCallback ) {
        var thisB = this;
        var url = this.resolveUrl(
            this.config.urlTemplate, { refseq: query.ref, start: query.start, end: query.end }
        );

        request( url,
                 { handleAs: 'json' }
               ).then(
                   function( featuredata ) {
                       array.forEach( featuredata.hits, function(f) {
                           var start = +f._id.match(/chr.*:g.([0-9]+)/)[1];
                           var feature = new SimpleFeature({
                                   id: f._id,
                                   data: {
                                       start: start,
                                       end: start+1,
                                       id: f._id
                                   }
                               });

                           var process=function(str) {
                               feature.data[str+"_attrs"]={};
                               var valkeys=array.filter( dojof.keys(f[str]), function(key) {
                                   return typeof f[str][key]!='object';
                               });

                               var objkeys=array.filter( dojof.keys(f[str]), function(key) {
                                   return typeof f[str][key]=='object' && key!='gene';
                               });

                               array.forEach( valkeys, function(key) {
                                   feature.data[str+"_attrs"][key]=f[str][key];
                               });
                               array.forEach( objkeys, function(key) {
                                   feature.data[str+"_"+key]=f[str][key];
                               });
                           }
                           process("cadd");
                           process("dbnsfp");
                           process("dbsnp");
                           process("evs");
                           process("exac");
                           process("mutdb");
                           process("cosmic");


                           featureCallback( feature );
                       });

                       // call the endCallback when all the features
                       // have been processed
                       finishCallback();
                   },

                   errorCallback
               );

    }
});
});
