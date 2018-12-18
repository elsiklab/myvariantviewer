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
        constructor(args) {
            this.refSeqTransform = args.refSeqTransform;
            this.chunkSize = args.chunkSize || 10000
            this.urlTemplate = args.urlTemplate
            this.baseUrl = args.baseUrl
        },

        getFeatures(query, featureCallback, finishCallback, errorCallback) {
            var cache = this.featureCache = this.featureCache || new LRUCache({
                name: 'myvariantFeatureCache',
                fillCallback: dojo.hitch(this, '_readChunk'),
                sizeFunction: function (features) {
                    return features.length;
                },
                maxSize: 100000
            });
            query.toString = () => `${query.ref},${query.start},${query.end}`
            const chunkSize = this.chunkSize
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
            var thisB = this;
            var ref = query.ref;
            if (this.refSeqTransform) {
                ref = ref.match(/chr(\d+)/)[1];
            }
            var url = this.resolveUrl(this.urlTemplate, { refseq: ref, start: query.start, end: query.end });
            var returnFeatures = []


            request(url, { handleAs: 'json' }).then(function(featuredata) {
                var feats = featuredata.hits || [];
                if (feats.length >= 1000) {
                    // setup scroll query
                    request(url + '&fetch_all=true', { handleAs: 'json' }).then(function(fetchAllResult) {
                        function iter(scrollId, scroll) {
                            var scrollurl = thisB.resolveUrl(thisB.baseUrl + 'query?scroll_id={scrollId}&size={size}&from={from}', { scrollId: scrollId, size: 1000, from: scroll });
                            request(scrollurl, { handleAs: 'json' }).then(function(featureResults) {
                                var feathits = featureResults.hits || [];
                                array.forEach(feathits, function(f) {
                                    var feat = thisB.processFeat(f);
                                    returnFeatures.push(feat);
                                });
                                if (feats.length >=1000) {
                                    callback(returnFeatures);
                                } else {
                                    iter(scrollId, scroll + 1000);
                                }
                            }, err => {
                                callback(null, err)
                            });
                        }
                        iter(fetchAllResult._scroll_id, 0);
                    }, err => {
                        callback(null, err)
                    })
                } else {
                    if(feats) {
                        feats.forEach(f => {
                            var feat = thisB.processFeat(f);
                            returnFeatures.push(feat)
                        })
                        callback(returnFeatures)
                    }
                }
            }, err => {
                callback(null, err)
            });
        },
        processFeat(f) {
            var start = +f._id.match(/chr.*:g.([0-9]+)/)[1];
            var feature = new SimpleFeature({
                id: f._id,
                data: {
                    start: start - 1,
                    end: start,
                    id: f._id
                }
            });

            var process = function(str, data, plus) {
                if (!data) return;

                if (str.match(/snpeff/)) {
                    if (lang.isArray(data.ann)) {
                        array.forEach(data.ann, function(fm, i) { process(str + '_' + i, fm, i); });
                        return;
                    } else if (data.ann) {
                        delete data.ann.cds;
                        delete data.ann.cdna;
                        delete data.ann.protein;
                    } else {
                        delete data.cds; // sub-sub-objects, not super informative
                        delete data.cdna;
                        delete data.protein;
                    }
                }
                if (str.match(/cadd/)) {
                    if (data.encode) {
                        process(str + '_encode', data.encode);
                    }
                    delete data.encode;
                }
                if (str.match(/clinvar/)) {
                    process(str + '_hgvs', data.hgvs);
                    delete data.hgvs;
                    if (lang.isArray(data.rcv)) array.forEach(data.rcv, function(elt, i) { process(str + '_rcv' + i, elt); });
                    else process(str + '_rcv', data.rcv);
                    delete data.rcv;
                }
                if (str.match(/dbnsfp/)) {
                    if (data.fathmm) {
                        for (var i in data.fathmm.score) { if (data.fathmm.score[i] === null) data.fathmm.score[i] = ''; }
                    }
                    if (data.provean) {
                        for (var j in data.provean.score) { if (data.provean.score[j] === null) data.provean.score[j] = ''; }
                    }
                    if (data.sift) {
                        for (var k in data.sift.score) { if (data.sift.score[k] === null) data.sift.score[k] = ''; }
                    }
                }
                if (str.match(/grasp/)) {
                    if (lang.isArray(data.publication)) {
                        array.forEach(data.publication, function(fm, iter) { process(str + '_publication' + iter, fm); });
                    }
                    delete data.publication;
                }

                feature.data[str + '_attrs' + (plus || '')] = {};
                var valkeys = array.filter(Object.keys(data), function(key) {
                    return typeof data[key] !== 'object';
                });

                var objkeys = array.filter(Object.keys(data), function(key) {
                    return typeof data[key] === 'object' && key !== 'gene';
                });

                array.forEach(valkeys, function(key) {
                    feature.data[str + '_attrs' + (plus || '')][key] = data[key];
                });
                array.forEach(objkeys, function(key) {
                    feature.data[str + '_' + key + (plus || '')] = data[key];
                });
            };

            process('cadd', f.cadd);
            process('cosmic', f.cosmic);
            process('dbnsfp', f.dbnsfp);
            process('dbsnp', f.dbsnp);
            process('evs', f.evs);
            process('exac', f.exac);
            process('mutdb', f.mutdb);
            process('wellderly', f.wellderly);
            process('snpedia', f.snpedia);
            process('snpeff', f.snpeff);
            process('vcf', f.vcf);
            process('grasp', f.grasp);
            process('gwassnps', f.gwassnps);
            process('docm', f.docm);
            process('emv', f.emv);
            process('clinvar', f.clinvar);
            process('uniprot', f.uniprot);

            return feature;
        }


    });
});
