'use strict';

const lib = require('../index')(require('amphora')),
  expect = require('chai').expect,
  sinon = require('sinon'),
  db = require('amphora').db,
  components = require('amphora').components,
  multiplex = require('multiplex-templates')(require('handlebars')),
  composer = require('amphora').composer,
  stream = require('stream');

function mockStream(chunks, objectMode) {
  const s = new stream.Readable({objectMode: objectMode, encoding: objectMode ? null : 'utf8'});

  chunks.forEach(chunk => s.push(chunk));
  s.push(null);
  return s;
};

/**
 * Checks if each value in the stream matches the expected values.
 * @param  {object} stream
 * @param  {array} values
 * @param  {function} done
 */
function expectValues(stream, values, done) {
  let i = 0;

  stream
    .on('data', (val) => {
      const compare = values[i++];

      if (typeof compare === 'object') {
        expect(val).to.deep.equal(compare);
      } else {
        expect(val).to.equal(compare);
      }
    })
    .on('end', () => {
      if (i === values.length) {
        done();
      } else {
        done(new Error(`Expected ${values.length} results but got ${i}`));
      }
    })
    .on('error', done);
};

describe('stream-pages', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(db);
    sandbox.stub(components, 'getTemplate');
    sandbox.stub(multiplex, 'render');
    sandbox.stub(composer, 'composePage');
    db.list.returns(mockStream([{
      key: '/foo/bar',
      value: '{"url": "bar"}'
    }, {
      key: '/baz/zar@published',
      value: '{"url": "zar"}'
    }], true));
  });

  afterEach(function () {
    sandbox.restore();
  });


  describe('streamPages', function () {

    it ('Streams and parses pages', function (done) {
      const stream = lib.streamPages('/some/site/prefix'),
        expected = [
          {
            pageRef: '/foo/bar',
            pageData: {url: 'bar'}
          },
          {
            pageRef: '/baz/zar@published',
            pageData: {url: 'zar'}
          }
        ];

      expectValues(stream, expected, done);
    });
  });

  describe('filterPublished', function () {
    it ('Filters out unpublished pages', function (done) {
      const stream = lib.streamPages('/some/site/prefix').pipe(lib.filters.published()),
        expected = [
          {
            pageRef: '/baz/zar@published',
            pageData: {url: 'zar'}
          }
        ];

      expectValues(stream, expected, done);
    });
  });

  describe('transforms.pages.toText', function () {
    it ('Transforms each page to text', function (done) {
      const stream = lib.streamPages('/some/site/prefix')
        .pipe(lib.transforms.pages.toText());

      expectValues(stream, ['bar\n', 'zar\n'], done);
    });
  });

  describe('transforms.pages.compose', function () {
    it ('Composes each page in the stream, retaining page configuration data', function (done) {
      const stream = lib.streamPages('/some/site/prefix').pipe(lib.transforms.pages.compose()),
        expected = [
          {
            pageRef: '/foo/bar',
            pageData: {
              a: 'b',
              url: 'bar'
            }
          },
          {
            pageRef: '/baz/zar@published',
            pageData: {
              url: 'zar',
              c: 'd'
            }
          }
        ];

      composer.composePage.onCall(0).returns(Promise.resolve({a: 'b'}));
      composer.composePage.onCall(1).returns(Promise.resolve({c: 'd'}));
      expectValues(stream, expected, done);
    });
  });

  describe('transforms.strings.addBookends', function () {
    it('Adds a string to the start of a stream', function (done) {
      const stream = mockStream(['1','2','3'], false)
          .pipe(lib.transforms.strings.addBookends('start'))
          .setEncoding('utf8'),
        expected = ['start','1','2','3'];

      expectValues(stream, expected, done);
    });
    it('Adds a string to the end of a stream', function (done) {
      const stream = mockStream(['1','2','3'], false)
          .pipe(lib.transforms.strings.addBookends(null, 'end'))
          .setEncoding('utf8'),
        expected = ['1','2','3','end'];

      expectValues(stream, expected, done);
    });
    it('Adds both a prelude and postlude if both are specified', function (done) {
      const stream = mockStream(['1','2','3'], false)
          .pipe(lib.transforms.strings.addBookends('start', 'end'))
          .setEncoding('utf8'),
        expected = ['start', '1','2','3','end'];

      expectValues(stream, expected, done);
    });
    it('Adds a prelude and postlude even if there are no chunks in the stream', function (done) {
      const stream = mockStream([], false)
      .pipe(lib.transforms.strings.addBookends('start', 'end'))
      .setEncoding('utf8');

      expectValues(stream, ['start','end'], done);
    });
  });

  describe('transforms.pages.toXML', function () {

    it('Transforms a page to XML, rendering its component sitemap templates', function (done) {
      const stream = mockStream([{
          pageData: {
            head: [
              {
                foo: 'bar',
                _ref: '/_components/a/i'
              },
              {
                _ref: '/_components/withNoTemplate'
              }
            ],
            url: 'http://a/url.html'
          },
          pageRef: '/foo/bar'
        }], true).pipe(lib.transforms.pages.toXML()),
        expected = [
          '<url><loc>http://a/url.html</loc><foo>bar</foo></url>'
        ];

      components.getTemplate.withArgs('/components/a/i', 'sitemap').returns('sitemap.handlebars');
      multiplex.render.returns('<foo>bar</foo>');

      expectValues(stream, expected, done);
    });

    it('Throws an error if it receives a page with no URL', function (done) {
      const stream = mockStream([{}], true);

      stream
        .pipe(lib.transforms.pages.toXML({}, multiplex))
        .on('error', ()=>done());
    });

  });
});
