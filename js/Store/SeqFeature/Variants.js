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

        // "cache results" by default using a naive algorithm that if interval we are requesting is fully contained in interval we already requested, then use cache
        this.optimize = this.config.optimizer === undefined ? true: this.config.optimizer;
        this.refSeqTransform = this.config.refSeqTransform === undefined ? false: this.config.refSeqTransform;
    },
    getFeatures: function( query, featureCallback, finishCallback, errorCallback ) {
        var thisB = this;
        var ref = query.ref;
        if (this.refSeqTransform) {
            ref = ref.match(/chr(\d+)/)[1];
        }
        var url = this.resolveUrl(
            this.config.urlTemplate, { refseq: ref, start: query.start, end: query.end }
        );

        if (this.optimize) {
            var done = false;
            var featureFound = 0;

            array.forEach( this.intervals, function(interval) {
                if( query.start >= interval.start && query.end <= interval.end ) {
                    array.forEach( interval.features, function(feature) {
                        if( !(feature.get('start')>query.end&&feature.get('end')<query.start) ) {
                            featureFound++;
                            featureCallback(feature);
                        }
                    });
                    if( interval.features ) {
                        done = true;
                        return;
                    }
                }
            });

            if( done ) {
                finishCallback();
                return;
            }
        }

        //cache intervals
        var interval = {
            start: query.start,
            end: query.end,
            ref: ref,
            features: []
        };

        request( url, { handleAs: 'json' }).then(
            function( featuredata ) {
                var feats = featuredata.hits||[];
                if( feats.length>=1000 ) {
                    //setup scroll query
                    request( url + "&fetch_all=true", { handleAs: 'json' }).then(function(fetch_all_result) {
                        function iter( scroll_id, scroll ) {
                            var url = thisB.resolveUrl(
                                thisB.config.baseUrl+"query?scroll_id={scroll_id}&size={size}&from={from}", { scroll_id: scroll_id, size: 1000, from: scroll }
                            );
                            request(url, { handleAs: 'json' }).then(function(feature_res) {
                                var feats = feature_res.hits || [];
                                array.forEach( feats, function( f ) {
                                    var feat = thisB.processFeat( f );
                                    interval.features.push( feat );
                                    featureCallback( feat );
                                });
                                if( feats.length<1000 ) {
                                    thisB.intervals.push( interval );
                                    finishCallback();
                                }
                                else {
                                    iter( scroll_id, scroll + 1000 );
                                }
                            }, errorCallback);
                        }
                        iter( fetch_all_result._scroll_id, 0 );
                    },
                    errorCallback);
                }
                else {
                    array.forEach( feats, function(f) {
                        var feat = thisB.processFeat( f );
                        interval.features.push( feat );
                        featureCallback( feat );
                    });
                    thisB.intervals.push( interval );
                    finishCallback();
                }
            },
            errorCallback
       );

    },
    processFeat: function( f ) {
        var start = +f._id.match(/chr.*:g.([0-9]+)/)[1];
        var feature = new SimpleFeature({
                id: f._id,
                data: {
                    start: start-1,
                    end: start,
                    id: f._id
                }
            });

        var process=function(str,data,plus) {
            if(!data) return;

            if(str.match(/snpeff/)){
               if(lang.isArray(data['ann'])) {
                   array.forEach(data['ann'],function(fm,i) { process(str+'_'+i,fm,i); });
                   return;
               }
               else if(data['ann']) {
                   delete data['ann'].cds;
                   delete data['ann'].cdna;
                   delete data['ann'].protein;
               }
               else {
                   delete data.cds; // sub-sub-objects, not super informative
                   delete data.cdna;
                   delete data.protein;
               }
           }
           if(str.match(/cadd/)) {
               if(data['encode']) {
                   process(str+'_encode',data['encode']);
               }
               delete data['encode'];
           }
           if(str.match(/clinvar/)) {
               process(str+'_hgvs', data['hgvs']);
               delete data['hgvs'];
               if(lang.isArray(data['rcv'])) array.forEach(data['rcv'], function(elt,i) { process(str+'_rcv'+i, elt); });
               else process(str+'_rcv', data['rcv']);
               delete data['rcv'];
           }
           if(str.match(/dbnsfp/)) {
               if(data['fathmm']) {
                   for(var i in data['fathmm'].score) { if(data['fathmm'].score[i]===null) data['fathmm'].score[i]=''; }
               }
               if(data['provean']) {
                   for(var i in data['provean'].score) { if(data['provean'].score[i]===null) data['provean'].score[i]=''; }
               }
               if(data['sift']) {
                   for(var i in data['sift'].score) { if(data['sift'].score[i]===null) data['sift'].score[i]=''; }
               }
           }
           if(str.match(/grasp/)) {
               if(lang.isArray(data['publication'])) {
                   array.forEach(data['publication'],function(fm,i) { process(str+'_publication'+i,fm); });
               }
               delete data['publication'];
           }
           
           feature.data[str+"_attrs"+(plus||"")]={};
           var valkeys=array.filter( dojof.keys(data), function(key) {
               return typeof data[key]!='object';
           });

           var objkeys=array.filter( dojof.keys(data), function(key) {
               return typeof data[key]=='object' && key!='gene';
           });

           

           array.forEach( valkeys, function(key) {
               feature.data[str+"_attrs"+(plus||"")][key]=data[key];
           });
           array.forEach( objkeys, function(key) {
               feature.data[str+"_"+key+(plus||"")]=data[key];
           });
        }
        
        process('cadd',f['cadd']);
        process('cosmic',f['cosmic']);
        process('dbnsfp',f['dbnsfp']);
        process('dbsnp',f['dbsnp']);
        process('evs',f['evs']);
        process('exac',f['exac']);
        process('mutdb',f['mutdb']);
        process('wellderly',f['wellderly']);
        process('snpedia',f['snpedia']);
        process('snpeff',f['snpeff']);
        process('vcf',f['vcf']);
        process('grasp',f['grasp']);
        process('gwassnps',f['gwassnps']);
        process('docm',f['docm']);
        process('emv',f['emv']);
        process('clinvar',f['clinvar']);

        return feature;
    }


});
});
