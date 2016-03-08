define([
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/lang',
            'dojo/request',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Model/SimpleFeature',
            'JBrowse/Util'
       ],
       function(
            declare,
            array,
            lang,
            request,
            SeqFeatureStore,
            SimpleFeature,
            Util
       ) {

var dojof = Util.dojof;

return declare( SeqFeatureStore, {

    constructor: function( args ) {
        this.intervals=[];
        // perform any steps to initialize your new store.  
    },

    getFeatures: function( query, featureCallback, finishCallback, errorCallback ) {
        var thisB = this;
        var url = this.resolveUrl(
            this.config.urlTemplate, { refseq: query.ref, start: query.start, end: query.end }
        );


        if(this.config.optimizer) {
            console.log('optimizer on');
            var done=false;
            var featureFound=0;

            array.forEach(this.intervals, function(interval) {
                if(query.start >= interval.start && query.end <= interval.end) {
                    array.forEach(interval.features, function(feature) {
                        if(!(feature.get('start')>query.end&&feature.get('end')<query.start)) {
                            featureFound++;
                            featureCallback(feature);
                        }
                    });
                    done=true;
                    return;
                }
            });

            if(done) {
                console.log('optimizer found',featureFound);
                finishCallback();
                return;
            }
        }

        var interval = {start: query.start, end: query.end, ref: query.ref, features:[]};
      
        request( url,
                 { handleAs: 'json' }
               ).then(
                   function( featuredata ) {
                       var iter = function(scroll_id, scroll) {
                           var url = thisB.resolveUrl(
                               thisB.config.baseUrl+"?q={scroll_id}&size={size}&from={from}", { scroll_id: scroll_id, size: 1000, from: scroll }
                           );
                           console.log('here1!',url);
                           request(url, {handleAs: 'json'}, function(features2) {
                               console.log(features2);
                               if(features2.hits.length) {
                                   iter(scroll_id, scroll + feature2.hits.length);
                               }
                               else {
                                   console.log('done');
                                   finishCallback();
                               }
                           });
                       }
                       console.log(featuredata);
                       iter(featuredata._scroll_id, 0);
//
//                       array.forEach( featuredata.hits, function(f) {
//                           var start = +f._id.match(/chr.*:g.([0-9]+)/)[1];
//                           var feature = new SimpleFeature({
//                                   id: f._id,
//                                   data: {
//                                       start: start,
//                                       end: start+1,
//                                       id: f._id
//                                   }
//                               });
//
//                           var process=function(str,data,plus) {
//                               if(!data) return;
//
//                               if(str.match(/snpeff/)){
//                                  if(lang.isArray(data['ann'])) {
//                                      array.forEach(data['ann'],function(fm,i) { process(str+'_'+i,fm,i); });
//                                      return;
//                                  }
//                                  else if(data['ann']) {
//                                      delete data['ann'].cds;
//                                      delete data['ann'].cdna;
//                                      delete data['ann'].protein;
//                                  }
//                                  else {
//                                      delete data.cds; // sub-sub-objects, not super informative
//                                      delete data.cdna;
//                                      delete data.protein;
//                                  }
//                              }
//                              if(str.match(/cadd/)) {
//                                  if(data['encode']) {
//                                      process(str+'_encode',data['encode']);
//                                  }
//                                  delete data['encode'];
//                              }
//                              if(str.match(/grasp/)) {
//                                  if(lang.isArray(data['publication'])) {
//                                      array.forEach(data['publication'],function(fm,i) { process(str+'_publication'+i,fm); });
//                                  }
//                                  delete data['publication'];
//                              }
//                              
//                              feature.data[str+"_attrs"+(plus||"")]={};
//                              var valkeys=array.filter( dojof.keys(data), function(key) {
//                                  return typeof data[key]!='object';
//                              });
//
//                              var objkeys=array.filter( dojof.keys(data), function(key) {
//                                  return typeof data[key]=='object' && key!='gene';
//                              });
//
//                              
//
//                              array.forEach( valkeys, function(key) {
//                                  feature.data[str+"_attrs"+(plus||"")][key]=data[key];
//                              });
//                              array.forEach( objkeys, function(key) {
//                                  feature.data[str+"_"+key+(plus||"")]=data[key];
//                              });
//                           }
//                           
//                           process('cadd',f['cadd']);
//                           process('cosmic',f['cosmic']);
//                           process('dbnsfp',f['dbnsfp']);
//                           process('dbsnp',f['dbsnp']);
//                           process('evs',f['evs']);
//                           process('exac',f['exac']);
//                           process('mutdb',f['mutdb']);
//                           process('wellderly',f['wellderly']);
//                           process('snpedia',f['snpedia']);
//                           process('snpeff',f['snpeff']);
//                           process('vcf',f['vcf']);
//                           process('grasp',f['grasp']);
//                           process('gwascatalog',f['gwascatalog']);
//                           process('docm',f['docm']);
//                           process('emvclass',f['emvclass']);
//                           process('clinvar',f['clinvar']);
//                           
//
//                           interval.features.push(feature);
//                           featureCallback( feature );
//                       });
//
//                       // call the endCallback when all the features
//                       // have been processed
//                       thisB.intervals.push(interval);
//                       finishCallback();
                   },

                   errorCallback
               );

    }
});
});
