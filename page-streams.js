'use strict';

/* Stream functions for streaming pages from Amphora. */

const through2 = require('through2'),
  _ = require('lodash');

/**
 * Streams all pages from a specified site.
 * @param  {object} amphora
 * @param  {string} sitePrefix
 * @return {object} - a stream
 */
function streamPages(amphora, sitePrefix) {
  return amphora.db.list({
    prefix: sitePrefix + '/pages/',
    keys: true,
    values: true,
    isArray: true,
    limit: 50000,
    json: false
  })
  .pipe(parsePages());
};

/**
 * Parse each item in a db.list stream.
 * @return {object}
 */
function parsePages() {
  return through2.obj(function (item, enc, cb) {
    this.push({
      pageRef: item.key,
      pageData: JSON.parse(item.value)
    });
    cb();
  });
}

/**
 * Stream transform filtering out pages in a streamPages stream that are not published.
 * @returns {object}
 */
function filterPublished() {
  return through2.obj(function (item, enc, cb) {
    if (_.endsWith(item.pageRef, '@published')) {
      this.push(item);
    }
    cb();
  });
}

/**
 * Filters out pages with no public URL.
 * @param {object} amphora
 * @param {String} pageUri
 * @param {String} pageData
 * @returns {Promise}
 */
function filterPublic(amphora) {
  const references = amphora.references;

  return through2.obj(function (item, enc, cb) {
    const pageUri = item.pageRef,
      sitePrefix = references.getPagePrefix(pageUri),
      publicUri = sitePrefix + '/uris/' +
        new Buffer(references.urlToUri(item.pageData.url)).toString('base64');

    amphora.db.get(publicUri)
      .then((uriData) => {
        if (references.replaceVersion(uriData, 'published') === pageUri) {
          this.push(item);
        }
        cb();
      })
      .catch((err)=>{
        console.log(err);
      });
  });
}

/**
 * Stream transform for composing pages. Each `item` is expected to be of the form
 * {pageData: <object>}. `pageData` will be composed, i.e. it will all of the page's
 * component data, just like the page's JSON endpoint.
 * @param  {object} locals
 * @return {object}
 */
function composePages(amphora, locals) {
  return through2.obj(function (item, enc, cb) {
    amphora.composer.composePage(item.pageData, locals)
      .then((composed)=>{
        // Composer.composePage strips out page configuration props like `url`.
        // The following line restores it.
        _.assign(item.pageData, composed);
        cb(null, item);
      })
      .catch((err)=>{
        console.log(err);
        cb();
      });
  });
};

/* Bind each function so that the passed instance of amphora is used as first argument.
This is so we don't have to constantly pass the instance of amphora around. */
module.exports = amphora => ({
  composePages: composePages.bind(this, amphora),
  filterPublic: filterPublic.bind(this, amphora),
  filterPublished: filterPublished.bind(this, amphora),
  streamPages: streamPages.bind(this, amphora)
});
