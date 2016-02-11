define([
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/request',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Model/SimpleFeature'
       ],
       function(
            declare,
            array,
            request,
            SeqFeatureStore,
            SimpleFeature
       ) {

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
                           //console.log('gene',f);
                           var superfeat = new SimpleFeature({
                               id: f._id,
                               data: {
                                   start: f.genomic_pos_hg19.start,
                                   end: f.genomic_pos_hg19.end,
                                   strand: f.genomic_pos_hg19.strand,
                                   name: f.symbol,
                                   description: f.name,
                                   type: 'gene',
                                   subfeatures: []
                               }
                           });
                           array.forEach( Object.keys(f.exons_hg19||{}), function(key) {
                               var t = f.exons_hg19[key];
                               //console.log('transcript',t);
                               var feature = new SimpleFeature({
                                       id: key,
                                       data: {
                                           start: t.txstart,
                                           end: t.txend,
                                           strand: f.genomic_pos.strand,
                                           type: 'mRNA',
                                           name: key,
                                           subfeatures: []
                                       },
                                       parent: superfeat
                                   });
                               superfeat.data.subfeatures.push(feature);

                               array.forEach( t.exons, function(e) {
                                   //console.log('exon',e);
                                   var subfeat = new SimpleFeature({
                                       data: {
                                           start: e[0],
                                           end: e[1],
                                           strand: f.genomic_pos.strand,
                                           type: 'exon'
                                       },
                                       parent: feature
                                   });
                                   feature.data.subfeatures.push(subfeat);
                               });


                           });
                           featureCallback( superfeat );
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
