'use strict';

const _ = require('lodash'),
  through2 = require('through2'),
  throughMap = require('through2-map'),
  multiplexTemplates = require('multiplex-templates');

var components;

function pagesToXML(locals, engines) {
  const multiplex = multiplexTemplates(engines);

  return throughMap.obj(item => {
    const lastmod = item.pageData.lastModified,
      cmptXml = getPageXML(item.pageRef, item.pageData, locals, multiplex);
    let lastmodXml = '';

    if (lastmod) {
      lastmodXml = '<lastmod>' + new Date(lastmod).toISOString() + '</lastmod>';
    }
    return `<url><loc>${item.pageData.url}</loc>${lastmodXml}${cmptXml}</url>`;
  });
}

/**
 * Render all the "sitemap" templates of all the components on a given page, and concatenate the
 * results.
 * @param  {string} pageRef
 * @param  {object} pageData
 * @param  {object} locals
 * @param  {object} multiplex
 * @return {string}
 */
function getPageXML(pageRef, pageData, locals, multiplex) {
  const indices = components.getIndices(pageRef, pageData),
    render = (cmptData, cmptRef) => getCmptXML(cmptRef, cmptData, locals, multiplex);

  return _.map(indices.refs, render).join('');
}

/**
 * Return the rendered "sitemap" template of a component.
 * @param  {string} cmptRef
 * @param  {object} cmptData
 * @param  {object} locals
 * @param  {object} multiplex
 * @return {string}
 */
function getCmptXML(cmptRef, cmptData, locals, multiplex) {
  const template = components.getTemplate(cmptRef, 'sitemap');

  if (template) {
    return multiplex.render(template, _.assign(cmptData, {locals: locals}));
  }
}

/**
 * Convert a stream of pages to a stream of text listing page URLs. Each item in the stream
 * is expected to be of the form {pageData: {url: string}}
 * @return {object}
 */
function pagesToText() {
  return throughMap.obj(item => item.pageData.url + '\n');
}

/**
 * Prepend and/or append text to a stream.
 * @param {string} prelude
 * @param {string} postlude
 * @return {object}
 */
function addBookends(prelude, postlude) {
  let preludeAdded = false;

  return through2(function (item, enc, cb) {
    if (!preludeAdded && prelude) {
      this.push(prelude);
      preludeAdded = true;
    }
    this.push(item);
    cb();
  }, function (cb) {
    if (!preludeAdded && prelude) this.push(prelude); // in case there are no items
    if (postlude) this.push(postlude);
    cb();
  });
};

/**
 * Stream transform for composing pages. Each item is expected to be of the form
 * {pageData: object}. The `pageData` value will be composed, i.e. it will included
 * all of the page's component data, just like the page's JSON endpoint.
 * @param  {object} amphora
 * @param  {object} locals
 * @return {object}
 */
function composePages(amphora, db, locals) {
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

module.exports = (amphora, db) => {
  components = amphora.components;

  return {
    pages: {
      toXML: pagesToXML,
      toText: pagesToText,
      compose: composePages.bind(this, amphora, db)
    },
    strings: {
      addBookends: addBookends
    }
  };
};
