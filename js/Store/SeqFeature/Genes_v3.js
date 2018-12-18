define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/request',
    'JBrowse/Store/SeqFeature',
    'JBrowse/Model/SimpleFeature',
    'JBrowse/Store/LRUCache'
],
function(
    declare,
    array,
    lang,
    request,
    SeqFeatureStore,
    SimpleFeature,
    LRUCache
) {
    return declare(SeqFeatureStore, {
        getFeatures: function(query, featureCallback, finishCallback, errorCallback) {
            var cache = this.featureCache = this.featureCache || new LRUCache({
                name: 'mygeneFeatureCache',
                fillCallback: dojo.hitch(this, '_readChunk'),
                sizeFunction: function (features) {
                    return features.length;
                },
                maxSize: 100000
            });
            query.toString = () => `${query.ref},${query.start},${query.end}`
			const chunkSize = 100000
            const s = query.start - query.start % chunkSize
            const e = query.end + (chunkSize - query.end % chunkSize)
            const chunks = []
            let chunksProcessed = 0
            let haveError = false
            for(let start = s; start < e; start += chunkSize) {
                var chunk = { ref: query.ref, start: start, end: start + chunkSize }
                chunk.toString = () => `${query.ref},${query.start},${query.end}`
                chunks.push(chunk)
            }
            chunks.forEach(c => {
                cache.get(c, (f, err) => {
                    if(err && !haveError) {
                        errorCallback(err)
                    }
                    haveError = haveError || err
                    if(haveError) {
                        return
                    }
                    console.log(f)
                    f.forEach(feature => {
                        if (feature.get('start') > query.end) {
                            return
                        } else if(feature.get('end') >= query.start) {
                            featureCallback(feature)
                        }
                    })
                    if(++chunksProcessed == chunks.length) {
                        finishCallback()
                    }
                })
            })
        },
        _readChunk(query, callback) {
            var url = this.resolveUrl(this.config.urlTemplate, { refseq: query.ref, start: query.start, end: query.end });
            var hg19 = +(this.config.hg19 || 0);
            var feats = [];
            request(url, { handleAs: 'json' }).then(featuredata => {
                featuredata.hits.forEach(f => {
                    var genomic_pos = [f.genomic_pos, f.genomic_pos_hg19][hg19];
                    var exons = [f.exons, f.exons_hg19][hg19];
                    if (lang.isArray(genomic_pos)) {
                        genomic_pos = genomic_pos[0];
                    }
                    if(f.exac) {
                        f.exac_nontcga = f.exac.nontcga;
                        f.exac_nonpsych = f.exac.nonpsych;
                        f.exac_all = f.exac.all;
                        delete f.exac;
                    }
                    if(f.reagent) {
                        Object.keys(f.reagent).forEach(key => {
                            f['reagent_'+key] = f.reagent[key];
                        });
                        delete f.reagent;
                    }
                    if(f.reporter) {
                        Object.keys(f.reporter).forEach(key => {
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
                    if(exons) {
                        exons.forEach(exon => {
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
                            exon.position.forEach(pos => {
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
                    }
                    feats.push(superfeat)
                });
                callback(feats)
            }, err => {
                callback(null, err)
            });
        }
    });
});
