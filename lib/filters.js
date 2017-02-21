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
function publicFilter(amphora) {
  const references = amphora.references;

  return through2.obj(function (item, enc, cb) {

    const pageUri = item.pageRef,
      sitePrefix = references.getPagePrefix(pageUri),
      publicUri = sitePrefix + '/uris/' +
        new Buffer(references.urlToUri(item.pageData.url)).toString('base64');

    amphora.db.get(publicUri)
      .then((uriData) => {
        if (references.replaceVersion(uriData, 'published') === pageUri) {
          cb(null, item);
        }
      })
      .catch(cb);
  });
};

/**
 * Stream transform filtering out pages in a streamPages stream that are not published.
 * @returns {object}
 */
function publishedFilter() {
  return throughFilter.obj(item => _.endsWith(item.pageRef, '@published'));
}

module.exports = (amphora) => ({
  published: publishedFilter,
  public: publicFilter.bind(this, amphora)
});
