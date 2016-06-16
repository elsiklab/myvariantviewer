define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/request',
    'JBrowse/Store/SeqFeature',
    'JBrowse/Model/SimpleFeature'
],
function(
    declare,
    array,
    lang,
    request,
    SeqFeatureStore,
    SimpleFeature
) {
    return declare(SeqFeatureStore, {
        getFeatures: function(query, featureCallback, finishCallback, errorCallback) {
            var url = this.resolveUrl(this.config.urlTemplate, { refseq: query.ref, start: query.start, end: query.end });
            var hg19 = +(this.config.hg19 || 0);

            request(url, { handleAs: 'json' }).then(function(featuredata) {
                array.forEach(featuredata.hits, function(f) {
                    var superfeat = new SimpleFeature({
                        id: f._id,
                        data: lang.mixin(lang.clone(f), {
                            start: [f.genomic_pos, f.genomic_pos_hg19][hg19].start,
                            end: [f.genomic_pos, f.genomic_pos_hg19][hg19].end,
                            strand: [f.genomic_pos, f.genomic_pos_hg19][hg19].strand,
                            name: f.symbol,
                            description: f.name,
                            type: 'gene',
                            reagent: null,
                            reporter: null,
                            subfeatures: []
                        })
                    });
                    delete superfeat.data.exons;
                    delete superfeat.data.exons_hg19;
                    if (![f.exons, f.exons_hg19][hg19]) {
                        var feature = new SimpleFeature({
                            id: f._id + '-transcript',
                            data: {
                                start: [f.genomic_pos, f.genomic_pos_hg19][hg19].start,
                                end: [f.genomic_pos, f.genomic_pos_hg19][hg19].end,
                                strand: [f.genomic_pos, f.genomic_pos_hg19][hg19].strand,
                                type: 'mRNA',
                                name: f.name + '-transcript',
                                subfeatures: []
                            },
                            parent: superfeat
                        });
                        superfeat.data.subfeatures.push(feature);
                    }
                    array.forEach(Object.keys([f.exons, f.exons_hg19][hg19] || {}), function(key) {
                        var t = [f.exons, f.exons_hg19][hg19][key];
                        var transcriptFeature = new SimpleFeature({
                            id: key,
                            data: lang.mixin(lang.clone(t), {
                                start: t.txstart,
                                end: t.txend,
                                strand: t.strand,
                                type: 'mRNA',
                                name: key,
                                exons: null,
                                txend: null,
                                txstart: null,
                                cdsstart: null,
                                cdsend: null,
                                chr: null,
                                subfeatures: []
                            }),
                            parent: superfeat
                        });
                        superfeat.data.subfeatures.push(transcriptFeature);

                        array.forEach(t.exons, function(e) {
                            var subfeat = new SimpleFeature({
                                data: lang.mixin(lang.clone(e), {
                                    start: e[0],
                                    end: e[1],
                                    strand: [f.genomic_pos, f.genomic_pos_hg19][hg19].strand,
                                    type: 'exon'
                                }),
                                parent: transcriptFeature
                            });
                            transcriptFeature.data.subfeatures.push(subfeat);
                        });
                    });
                    featureCallback(superfeat);
                });
                finishCallback();
            }, errorCallback);
        }
    });
});
