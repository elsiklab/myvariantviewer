define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/store/util/QueryResults',
    'dojo/request/xhr',
    'dojo/io-query'
],
function(
    declare,
    array,
    QueryResults,
    xhr,
    ioQuery
) {
    return declare(null, {
        constructor(args) {
            this.url = args.url;
            this.res = {}
        },

        query(query /* , options */) {
            var name = '' + query.name;
            if(this.res[name]) {
                return new Promise((resolve, reject) => {
                    resolve(QueryResults([{ name: name, location: this.res[name] }]))
                })
            }
            var q = ioQuery.objectToQuery({q: name, size: 100, fields: 'name,genomic_pos_hg19'})
            return xhr(this.url + '?' + q, { handleAs: 'json' }).then(data => {
                var results = (data.hits || []).map(dat => {
                    //var ret = dat._id.match(/(chr.*):g.([0-9]+)/);
                    if(!dat.genomic_pos_hg19) {
                        return null
                    }
                    var chr = dat.genomic_pos_hg19.chr;
                    var start = dat.genomic_pos_hg19.start
                    var end = dat.genomic_pos_hg19.end
                    var featname = dat.name
                    var val = Object.keys(dat).filter(key => !key.startsWith('_')).map(elt => ({label: 'MyGene.info v3'}));
                    this.res[`${name} [${featname}] (${dat._id})`] = {
                        ref:chr,
                        start: start,
                        end: end,
                        name: featname
                    }
                    return {
                        name: `${name} [${featname}] (${dat._id})`,
                        label: `${name} [${featname}] (${dat._id})`,
                        location: {ref: chr, start: start, end: end, tracks: val}
                    };
                }).filter(x => !!x)

                return QueryResults(results)
            }, err => {
                console.error(err)
                return QueryResults([]);
            })
        },
        get(id) {
            return this.query(id);
        },
        getIdentity(object) {
            return object.id;
        }
    });
});
