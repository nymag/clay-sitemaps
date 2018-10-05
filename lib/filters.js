'use strict';

const through2 = require('through2'),
  throughFilter = require('through2-filter'),
  _ = require('lodash');

/**
 * Filters out pages with no public URL.
 * @param {object} amphora
 * @param {String} pageUri
 * @param {String} pageData
 * @returns {Promise}
 */
function publicFilter(amphora, db) {
  const references = amphora.references;

  return through2.obj(function (item, enc, cb) {

    const pageUri = item.pageRef,
      sitePrefix = pageUri.split('/_pages')[0];

    return db.getMeta(pageUri.replace('@published', ''))
      .then(({ url, published }) => {
        var publicUri;

        // If the metadata does not have anything published
        if (!published) {
          cb();
          return;
        }

        publicUri = sitePrefix + '/_uris/' + new Buffer(references.urlToUri(url)).toString('base64');

        return db.get(publicUri)
          .then((uriData) => {
            if (references.replaceVersion(uriData, 'published') === pageUri) {
              this.push(item);
            }
            cb();
          })
          .catch((err)=>{
            // swallow key that's not found -- key will not be found for unpublished articles.
            if (err.type === 'NotFoundError') {
              cb();
            } else {
              cb(err);
            }
          });
      });
  });
};

/**
 * Stream transform filtering out pages in a streamPages stream that are not published.
 * @returns {object}
 */
function publishedFilter() {
  return throughFilter.obj(item => _.endsWith(item.pageRef, '@published'));
}

module.exports = (amphora, db) => ({
  published: publishedFilter,
  public: publicFilter.bind(this, amphora, db)
});
