'use strict';

/* Stream functions for streaming pages from Amphora. */

const through2 = require('through2'),
  throughMap = require('through2-map'),
  _ = require('lodash');

/**
 * Streams all pages from a specified site.
 * @param  {object} amphora
 * @param  {string} sitePrefix
 * @return {object} - a stream
 */
module.exports.streamPages = function (amphora, sitePrefix) {
  return amphora.db.list({
    prefix: sitePrefix + '/pages/',
    keys: true,
    values: true,
    isArray: true,
    limit: 50000,
    json: false
  })
  .pipe(throughMap.obj(item => ({
    pageRef: item.key,
    pageData: JSON.parse(item.value)
  })));
};

/**
 * Stream transform for composing pages. Each `item` is expected to be of the form
 * {pageData: <object>}. `pageData` will be composed, i.e. it will all of the page's
 * component data, just like the page's JSON endpoint.
 * @param  {object} locals
 * @return {object}
 */
module.exports.composePages = function (amphora, locals) {
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
