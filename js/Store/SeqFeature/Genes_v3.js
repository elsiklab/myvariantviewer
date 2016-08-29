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
                    var genomic_pos = [f.genomic_pos, f.genomic_pos_hg19][hg19];
                    var exons = [f.exons, f.exons_hg19][hg19];
                    if (lang.isArray(genomic_pos)) {
                        genomic_pos = genomic_pos[0];
                    }
                    console.log(f.symbol, f);
                    if(f.exac) {
                        f.exac_nontcga = f.exac.nontcga;
                        f.exac_nonpsych = f.exac.nonpsych;
                        f.exac_all = f.exac.all;
                        delete f.exac;
                    }
                    if(f.reagent) {
                        Object.keys(f.reagent).forEach(function(key) {
                            f['reagent_'+key] = f.reagent[key];
                        });
                        delete f.reagent;
                    }
                    if(f.reporter) {
                        Object.keys(f.reporter).forEach(function(key) {
                            f['reporter_'+key] = f.reporter[key];
                        });
                        delete f.reporter;
                    }
                        
                    var superfeat = new SimpleFeature({
                        id: f._id,
                        data: lang.mixin(lang.clone(f), {
                            start: genomic_pos.start,
                            end: genomic_pos.end,
                            strand: genomic_pos.strand,
                            name: f.symbol,
                            description: f.name,
                            type: 'gene',
                            subfeatures: []
                        })
                    });
                    delete superfeat.data.exons;
                    delete superfeat.data.exons_hg19;
                    if (!exons) {
                        var feature = new SimpleFeature({
                            id: f._id + '-transcript',
                            data: {
                                start: genomic_pos.start,
                                end: genomic_pos.end,
                                strand: genomic_pos.strand,
                                type: 'mRNA',
                                name: f.name + '-transcript',
                                subfeatures: []
                            },
                            parent: superfeat
                        });
                        superfeat.data.subfeatures.push(feature);
                    }
                    var transcripts = {};
                    array.forEach(exons, function(exon) {
                        var tname = exon.transcript;
                        var ts = new SimpleFeature({
                            id: tname,
                            data: lang.mixin({
                                start: exon.txstart,
                                end: exon.txend,
                                strand: exon.strand,
                                type: 'mRNA',
                                name: tname,
                                subfeatures: []
                            }),
                            parent: superfeat
                        });
                        array.forEach(exon.position, function(pos) {
                            var subfeat = new SimpleFeature({
                                data: lang.mixin(lang.clone(exon), {
                                    start: pos[0],
                                    end: pos[1],
                                    strand: genomic_pos.strand,
                                    position: null,
                                    txstart: null,
                                    txend: null,
                                    transcript: null,
                                    type: 'exon'
                                }),
                                parent: ts
                            });
                            ts.data.subfeatures.push(subfeat);
                        });
                        superfeat.data.subfeatures.push(ts);
                    });
                    featureCallback(superfeat);
                });
                finishCallback();
            }, errorCallback);
        }
    });
});
